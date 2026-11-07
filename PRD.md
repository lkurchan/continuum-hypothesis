# Continuum — PRD

> Fuente de verdad del producto para HackaTwin (sábado 7/11/2026). Si algo cambia, se actualiza acá en el mismo PR.
> Las secciones marcadas **[ABIERTO]** todavía no están definidas.

## 1. Resumen

**Continuum** permite que un repartidor o freelancer cobre lo que trabaja **segundo a segundo** en pesos onchain (ARGt). La plataforma o el cliente que le paga deposita el monto del período en un contrato, el saldo del trabajador se desbloquea de forma continua y el trabajador puede retirar en cualquier momento lo que ya devengó, incluso directo a su cuenta de Belo.

- **Problema:** el trabajador de plataformas y el freelancer argentino cobran a fin de mes o a 30 o 60 días, pero gastan todos los días. "Llegar a fin de mes" lo lleva a endeudarse caro (tarjeta, préstamos de billetera) por plata que **ya trabajó**.
- **Por qué onchain y en moneda local:** el sueldo es dinero programable en pesos. Se libera por segundo, se puede retirar 24/7 sin intermediarios y se gasta directo vía Belo, sin pasar por el dólar ni por el sistema bancario.
- **No es crédito ni adelanto:** el trabajador solo retira lo que ya devengó. Nadie presta plata y **no hay rendimiento**: ARGt es un medio de pago.

## 2. Tracks y estrategia

| Track | Rol | Qué exige | Cómo lo cubrimos |
|---|---|---|---|
| **Stablecoins (Twin)**, principal | Núcleo del producto | Twin Stablecoin en una chain elegible, al menos un hash de transacción real, README con token, chain y direcciones, commits durante el evento | Contrato propio en Arbitrum que mueve ARGt. Cada crear, retirar o cancelar es una transacción real |
| **Belo**, secundario | Extra | Problema LatAm (30%), funciona (25%), se puede llevar a producto (25%) e IA no decorativa (20%) | Retiro directo a Belo y agente IA de baja prioridad (consigna 4) |

- Entregas: **Belo a las 17:30** y **Twin a las 18:00**. El pitch dura entre 2,5 y 3 minutos y tiene que ser muy corto.
- Criterios de Twin, con el mismo peso: **Idea** (original, ARGt como núcleo), **Problema** (usuario identificado), **Negocio** (camino viable) y **Pitch** (demo que funcione).
- Regulatorio: nunca mostrar rendimiento por tener ARGt. Apuntamos a freelancers y trabajadores de plataforma, donde los pagos son **comerciales** (monotributo) y no sueldos en relación de dependencia.

## 3. Usuarios

- **Trabajador** (protagonista): repartidor o freelancer monotributista. Ve cuánto ganó hasta este segundo, retira cuando quiere a Belo y, si llegamos, configura reglas para el agente.
- **Pagador**: plataforma de delivery o empresa cliente. Crea streams para N trabajadores en una sola transacción, fondea por tramos y cancela si alguien deja de trabajar.

## 4. Modelo de negocio

- **SaaS para el pagador:** fee mensual por trabajador activo. Para el trabajador es gratis.
- Propuesta de valor para el pagador:
  - Retención de repartidores: cobrar al instante es un beneficio que no le cuesta financiar.
  - Pagos automáticos 24/7 sin comisiones bancarias.
  - **Fondeo por tramos:** no necesita adelantar el mes entero.
  - Cancelación limpia: lo devengado queda para el trabajador y el resto vuelve al pagador.
- **Distribución B2B2C:** el módulo del trabajador está pensado para integrarse en wallets como **Belo**, que pondría la custodia, el off-ramp y millones de usuarios. En el pitch se dice "diseñado para integrarse en Belo", **no** "integrado": no hay acuerdo.
- Extensión, solo para el pitch: la misma primitiva sirve para pagos **B2B entre PyMEs**, con una factura que se cobra por segundo en lugar de a 60 días.

## 5. Alcance

### MVP (antes del freeze de las 15:00)
1. El contrato `ContinuumStreams` está deployado en **Arbitrum One** con ARGt.
2. El pagador crea streams en lote, hace top-up y cancela.
3. El trabajador ve su saldo devengado moviéndose en tiempo real y retira a su wallet o a **una dirección Belo real**.
4. Hay historial de transacciones con links a Arbiscan.
5. Hay un modo mock (`CHAIN_MODE=mock`) como salida de emergencia de la demo.
6. Está deployado en Vercel.

### Si sobra tiempo (prioridad baja, en este orden)
1. **Agente IA con reglas** (ej.: "el 5 pagá el alquiler", "guardá 20% para el monotributo"): ejecuta pagos desde el stream con `withdrawTo` y explica cada movimiento.
2. **Copiloto de liquidez:** proyecta el saldo a fin de mes y recomienda cuánto retirar.
3. Devengo **por tiempo conectado** (start/stop de turno).
4. Devengo **por tarea completada**.

### Fuera de alcance
Signup real, KYC, off-ramp propio (para eso está Belo), rendimiento de cualquier tipo, multi-chain y el bridge.

## 6. Decisiones técnicas

| Tema | Decisión |
|---|---|
| Chain | **Arbitrum One** (mainnet, chainId 42161). Es la que el PDF de Twin documenta completa: direcciones de ARGt, el pool de Curve y el vault de Morpho |
| Token | ARGt `0x59863989d080B22476DB95656d0C3CC18be92214` (Arbitrum), 18 decimals |
| Contrato | Propio, en Solidity con Foundry y OpenZeppelin (`SafeERC20`, `ReentrancyGuard`) |
| App | Monorepo: `contracts/` (Foundry) y `web/` (Next.js App Router, TypeScript, Tailwind) |
| Superficies | **Trabajador** (`/worker`): mobile-first (unos 390px), **PWA liviana** y standalone por ahora, pero integrable en Belo (ver 6.1). **Pagador** (`/payer`): dashboard web de escritorio |
| PWA | Solo `app/manifest.ts`, íconos y color de tema, con `display: standalone` y `start_url: /worker`. **Sin service worker ni modo offline** (el caché puede mostrar una versión vieja en la demo) **y sin push** (eso va en el roadmap) |
| Backend | Route handlers de Next.js que firman con **viem** |
| Wallets | **Custodiales**: usuarios demo fijos, con una clave privada por usuario en variables de entorno. Cada wallet necesita algo de ETH en Arbitrum para gas |
| Auth | Selector de usuario demo ("Entrar como…"), sin signup |
| Base | **Supabase** (Postgres): usuarios, metadata de streams, actividad y reglas del agente |
| IA | Claude vía **Vercel AI SDK** (tool calling). Hace falta una API key de Anthropic |
| Deploy | Vercel |
| Dev local | `anvil --fork-url <arbitrum RPC>` con `deal` de ARGt, o `MockERC20` si `deal` falla con el proxy |

### 6.1 Reglas para que el módulo del trabajador sea integrable

Hoy funciona standalone, pero lo construimos como si un host (Belo) fuera a abrirlo en un webview:
- `app/(worker)/` tiene **su propio layout** y no depende de navegación, header ni estado global de la app ni de `/payer`.
- El usuario se identifica por `userId`. Un host podría pasarlo, o pasar un token en el futuro, sin cambiar las pantallas.
- Se respetan las safe areas del celular (`env(safe-area-inset-*)`) y no hay scroll horizontal en 360 a 430px.
- Los textos y la marca propia ("Continuum") viven en el módulo. **No se copian la marca ni la interfaz de Belo.**
- Los destinos de retiro salen de la API (`wallet` / `belo`) y no están hardcodeados, para que un host pueda definir el suyo.

## 7. Diseño del contrato `ContinuumStreams`

```solidity
struct Stream {
  address payer;
  address recipient;
  IERC20  token;
  uint256 totalAmount;   // monto total del período
  uint256 deposited;     // fondeado hasta ahora (≤ totalAmount)
  uint256 withdrawn;     // retirado por el trabajador
  uint64  start;
  uint64  end;
  uint64  canceledAt;    // 0 si sigue activo
}

function createStream(address recipient, IERC20 token, uint256 totalAmount, uint64 start, uint64 end, uint256 initialDeposit) external returns (uint256 id);
function createStreamsBatch(address[] calldata recipients, uint256[] calldata totalAmounts, uint256[] calldata initialDeposits, IERC20 token, uint64 start, uint64 end) external returns (uint256[] memory ids);
function topUp(uint256 id, uint256 amount) external;                    // solo el payer; deposited + amount ≤ totalAmount
function withdrawTo(uint256 id, address to, uint256 amount) external;  // solo el recipient; amount ≤ withdrawable
function cancel(uint256 id) external;                                  // solo el payer

function vestedAmount(uint256 id) external view returns (uint256);
function withdrawableAmount(uint256 id) external view returns (uint256);
function getStream(uint256 id) external view returns (Stream memory);
function nextStreamId() external view returns (uint256);

event StreamCreated(uint256 indexed id, address indexed payer, address indexed recipient, address token, uint256 totalAmount, uint64 start, uint64 end);
event ToppedUp(uint256 indexed id, uint256 amount);
event Withdrawn(uint256 indexed id, address indexed to, uint256 amount);
event Canceled(uint256 indexed id, uint256 refundedToPayer, uint256 keptByRecipient);
```

Reglas, que son el núcleo de los tests:
- `t = canceledAt != 0 ? canceledAt : block.timestamp`
- `vested = t ≤ start ? 0 : t ≥ end ? totalAmount : totalAmount * (t - start) / (end - start)`
- `withdrawable = min(vested, deposited) - withdrawn`
- Al cancelar se fija `canceledAt = now`, se devuelve `refund = deposited - min(vested, deposited)` al payer y se hace `deposited -= refund`. El trabajador puede seguir retirando lo que le quedó.
- Cada transacción tiene que revertir con un error claro si la llama quien no corresponde, si el stream está cancelado (para `topUp`), si se excede el monto o si `start ≥ end`.
- El payer tiene que hacer `approve` de ARGt al contrato antes de crear o fondear. El backend lo resuelve.

## 8. Contratos entre módulos

Esto es lo que permite trabajar en paralelo: cada módulo se programa contra estas interfaces y no contra la implementación de otro.

### 8.1 Tipos compartidos (`web/lib/domain/types.ts`)

```ts
export type Role = 'payer' | 'worker';
export type Amount = string;            // ARGt en unidades decimales ("1500.25"); bigint solo adentro del gateway
export interface DemoUser { id: string; name: string; role: Role; address: `0x${string}`; beloAddress?: `0x${string}`; avatarUrl?: string }
export interface StreamView {
  id: string; payerId: string; workerId: string; label?: string;
  totalAmount: Amount; deposited: Amount; withdrawn: Amount;
  start: number; end: number;          // unix seconds
  canceledAt: number | null;
  status: 'scheduled' | 'streaming' | 'completed' | 'canceled';
}
export type ActivityKind = 'create' | 'topup' | 'withdraw' | 'cancel' | 'agent_payment';
export interface Activity { id: string; streamId: string; kind: ActivityKind; amount: Amount; txHash: string; explorerUrl: string; userId: string; createdAt: string; note?: string }
```

`web/lib/domain/vesting.ts` es la función pura `vestedAt(stream, nowSec)`, un espejo exacto de la fórmula del contrato. La UI la usa para animar el contador sin consultar la chain cada segundo.

### 8.2 Gateway de chain (`web/lib/chain/StreamGateway.ts`)

```ts
export interface StreamGateway {
  createStreams(payer: DemoUser, items: { worker: DemoUser; totalAmount: Amount; initialDeposit: Amount }[], start: number, end: number): Promise<{ txHash: string; streamIds: string[] }>;
  topUp(payer: DemoUser, streamId: string, amount: Amount): Promise<{ txHash: string }>;
  withdrawTo(worker: DemoUser, streamId: string, to: `0x${string}`, amount: Amount): Promise<{ txHash: string }>;
  cancel(payer: DemoUser, streamId: string): Promise<{ txHash: string; refunded: Amount; kept: Amount }>;
  getStream(streamId: string): Promise<Omit<StreamView, 'payerId' | 'workerId' | 'label'>>;
  balanceOf(address: `0x${string}`): Promise<Amount>;
}
```

Tiene dos implementaciones: `ViemStreamGateway` (Arbitrum real) y `MockStreamGateway` (en memoria, con hashes falsos). Se elige con `CHAIN_MODE`.

### 8.3 API HTTP (`web/app/api/**`)

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/api/users` | — | `DemoUser[]` |
| GET | `/api/streams?userId=` | — | `StreamView[]` (como payer o como worker) |
| POST | `/api/streams` | `{ payerId, items: [{ workerId, totalAmount, initialDeposit }], start, end }` | `{ txHash, streamIds }` |
| POST | `/api/streams/[id]/topup` | `{ amount }` | `{ txHash }` |
| POST | `/api/streams/[id]/withdraw` | `{ amount, destination: 'wallet' \| 'belo' }` | `{ txHash }` |
| POST | `/api/streams/[id]/cancel` | — | `{ txHash, refunded, kept }` |
| GET | `/api/activity?userId=` | — | `Activity[]` |
| POST | `/api/agent/chat` | mensajes del AI SDK | stream del AI SDK (prioridad baja) |

Los errores devuelven `{ error: string }` con status 4xx/5xx. El usuario "logueado" viaja como `userId` en el body o en la query: es una demo y no hay sesión real.

### 8.4 Base de datos (`supabase/migrations/`)

- `users(id text pk, name, role, address, belo_address, avatar_url)`. La clave privada **no** va en la base: está en la variable de entorno `DEMO_PK_<ID_EN_MAYUSCULAS>`.
- `streams(id text pk /* id onchain */, payer_id, worker_id, label, created_tx, created_at)`
- `activity(id uuid pk, stream_id, kind, amount numeric, tx_hash, user_id, note, created_at)`
- `agent_rules(id uuid pk, worker_id, label, kind /* 'fixed' | 'percent' */, amount numeric, percent numeric, day_of_month int, destination text, active bool)`

### 8.5 Variables de entorno (`web/.env.example`)

`CHAIN_MODE`, `ARBITRUM_RPC_URL`, `STREAMS_CONTRACT_ADDRESS`, `ARGT_ADDRESS`, `DEMO_PK_<ID>` (una por usuario demo), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ARBISCAN_API_KEY` (para verificar el contrato).

## 9. Equipo y tareas

Regla general: cada módulo toca **solo sus carpetas**. Las interfaces de la sección 8 se crean en la Tarea 0 y después solo se cambian avisando al resto. Cada tarea va en su branch `feat/<modulo>-<tarea>` y entra por PR.

### Tarea 0 — Base del repo (una persona, unos 30 min, bloquea al resto)
- [ ] Crear la branch `main`, scaffold de `web/` (Next.js, TypeScript, Tailwind, ESLint) y de `contracts/` (Foundry con OpenZeppelin).
- [ ] Escribir los tipos (8.1), la interfaz `StreamGateway` (8.2), los stubs de las rutas de la API (8.3) y `web/.env.example`.
- [ ] Crear el proyecto de Supabase y el de Vercel (Vercel linkeado al repo).
- [ ] Hacer el primer commit en `main`. A partir de acá, todos branchean.

### Tareas operativas (cualquiera, **apenas arranca el día**: son las bloqueantes reales)
- [ ] Pedir ARGt en Arbitrum a los mentores de Twin (o comprarlo con USDT0 en el pool de Curve). Conseguir lo suficiente para montos creíbles.
- [ ] Conseguir ETH en Arbitrum para gas y repartirlo entre las wallets demo (deployer, pagador y trabajadores).
- [ ] Confirmar con Belo o los mentores que una dirección de Belo recibe ARGt en Arbitrum, y anotar esa dirección.
- [ ] Conseguir una API key de Anthropic.
- [ ] Generar las wallets demo y cargar las claves en Vercel.

### Módulo A — Contrato (`contracts/`)
- [ ] A1. `ContinuumStreams.sol` con TDD: vesting, withdrawable, top-up, cancel, lote y permisos.
- [ ] A2. Fork test contra ARGt real en Arbitrum: crear y retirar.
- [ ] A3. Script de deploy, deploy en Arbitrum One y **verificación en Arbiscan**. Publicar la dirección en el canal del equipo.
- [ ] A4. Exportar el ABI a `web/lib/chain/abi.ts`, el único archivo de `web/` que toca este módulo.
- [ ] A5. Después: ayudar a B con la integración y sembrar los streams para la demo.

### Módulo B — Backend y chain (`web/lib/domain`, `web/lib/chain`, `web/lib/db`, `web/app/api/**`, `supabase/`)
- [ ] B1. `vesting.ts` con tests, espejo de la fórmula del contrato.
- [ ] B2. `MockStreamGateway` funcionando **primero**, para que C y D integren de entrada.
- [ ] B3. Migraciones de Supabase y seed de usuarios demo.
- [ ] B4. Rutas de la API contra el gateway y la base, con tests de la lógica de cada ruta.
- [ ] B5. `ViemStreamGateway`: approve y create, top-up, withdrawTo y cancel, con espera de receipt y lectura de eventos para obtener los ids.
- [ ] B6. Prueba de punta a punta en mainnet: el **primer hash real**, que se guarda para el README.

### Módulo C — UI del pagador (`web/app/(payer)/**`, `web/components/payer/**`, y `web/components/ui/**` como dueño del design system)
- [ ] C1. Aplicar el design system que llega de Claude Design en `components/ui`.
- [ ] C2. Selector de usuario demo (pantalla de entrada).
- [ ] C3. Dashboard del pagador: trabajadores, streams activos, total fondeado y devengado.
- [ ] C4. Flujo "pagar a N trabajadores": crear en lote con fondeo inicial parcial.
- [ ] C5. Acciones por stream (top-up y cancelar) con feedback de la transacción y link a Arbiscan.

### Módulo D — UI del trabajador y agente (`web/app/(worker)/**`, `web/components/worker/**`, `web/lib/agent/**`, `web/app/api/agent/**`)
- [ ] D0. Layout propio de `(worker)` siguiendo las reglas de 6.1, más la PWA liviana (`app/manifest.ts` y los íconos del diseño). Verificar que se instala en Android y en iPhone y que abre a pantalla completa en `/worker`.
- [ ] D1. Home del trabajador con **el contador en tiempo real como protagonista**, usando `vestedAt` cada frame o cada 100 ms.
- [ ] D2. Flujo de retiro: monto, destino (wallet o Belo), confirmación, hash y link a Arbiscan.
- [ ] D3. Historial de actividad.
- [ ] D4 (prioridad baja). Agente con el AI SDK y herramientas `getBalance`, `withdrawTo` y `createRule`. Las reglas se guardan en `agent_rules` y se ejecutan con un botón "Ejecutar reglas de hoy" (sin cron), con una explicación por cada movimiento.

### Codex 1 y 2
- [ ] README con lo que exige Twin: token, chain, direcciones del contrato y de ARGt, hashes con links, arquitectura, cómo correrlo, qué se hizo durante el evento y aviso de que ARGt no rinde.
- [ ] Script de seed de streams demo y modo mock con datos lindos.
- [ ] Review de los PRs de A y B (seguridad del contrato y manejo de claves).
- [ ] Configuración de Vercel y verificación del deploy.

## 10. Cronograma

| Hora | Hito |
|---|---|
| 9:45 | Tarea 0 en `main`, todos branchean y las tareas operativas están en marcha |
| 11:30 | Contrato deployado y verificado. API funcionando con `MockStreamGateway`. UIs consumiendo la API mock |
| 13:00 | `ViemStreamGateway` integrado. **Primer retiro real en mainnet** |
| 14:30 | Lote, top-up, cancelar y retiro a Belo de punta a punta. Agente básico si hay alguien libre |
| **15:00** | **Freeze de features** |
| 15:00–17:15 | Pulido de UI, seed de la demo, README con hashes y 3 ensayos del pitch |
| **17:30** | Entrega Belo |
| **18:00** | Entrega Twin |

## 11. Riesgos y planes B

| Riesgo | Plan B |
|---|---|
| No conseguimos ARGt suficiente | Montos chicos reales; la escala se explica con palabras en el pitch |
| `deal` no funciona con el proxy de ARGt en el fork | `MockERC20` local y ARGt real solo en mainnet |
| Falla la red o el RPC en vivo | `CHAIN_MODE=mock` más un hash real ya ejecutado para mostrar en Arbiscan |
| Belo no acepta ARGt en Arbitrum | Retiro a la wallet del trabajador y Belo como "siguiente paso" en el pitch |
| Una clave expuesta | Wallets demo con saldos mínimos y claves solo en variables de entorno de Vercel, nunca en el repo |

## 12. Pendientes **[ABIERTO]**

- **Guion de la demo y del pitch** (2,5 a 3 min): si el stream es expreso o mensual, qué pantallas se muestran y si es una sola vista dividida o dos dispositivos.
- **Dirección visual**: llega desde Claude Design.
- Montos y duración de los streams demo, según cuánto ARGt consigamos.
- La dirección de Belo que recibe ARGt en Arbitrum.
