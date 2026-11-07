# Continuum

**Pagos entre empresas, por segundo, en pesos onchain.**

Continuum permite que una empresa le pague a su proveedor de servicios de forma **continua**: el precio del período queda fijo en la blockchain, el cliente lo fondea por tramos y el proveedor cobra lo que ya devengó **cuando quiere, segundo a segundo**, en **ARGt** (la stablecoin del peso argentino de Twin) sobre **Arbitrum One**.

- Demo: [continuum-hypothesis.vercel.app](https://continuum-hypothesis.vercel.app). El modo real requiere la clave de operador del equipo.
- Track principal: **Stablecoins (Twin)**. También participamos en el track de **Belo**.
- Construido durante la HackaTwin (7/11/2026, Digital House, Buenos Aires).

> ARGt es un **medio de pago sin rendimiento**. Continuum no presta plata, no adelanta sueldos y no ofrece intereses: el proveedor cobra plata que ya ganó.

---

## El problema

Las PyMEs argentinas que prestan servicios recurrentes (logística, mantenimiento, sistemas, limpieza) cobran a 30, 60 o 90 días. Mientras tanto pagan sueldos, insumos e impuestos todos los días, y se financian caro: descuento de cheques y facturas, o crédito con tasas de tres dígitos. Del otro lado, la empresa que paga a plazo termina pagando un precio más alto por ese plazo.

## La solución

**Un punto medio entre pagar de contado y pagar a plazo.**

1. **El precio queda fijo onchain.** Cliente y proveedor acuerdan el monto del período. Al aceptar, queda registrado en el contrato `ContinuumStreams` (monto total, inicio y fin) y no hace falta emitir facturas por cuota ni conciliar.
2. **El cliente fondea por tramos.** No necesita adelantar el mes entero: deposita una parte al aceptar y el resto después, con top-ups.
3. **El proveedor cobra por segundo.** Lo devengado se libera de forma continua y el proveedor retira cuando quiere cualquier monto hasta lo devengado y fondeado, a su wallet o a su cuenta de Belo.
4. **El atraso es visible.** Si el cliente se atrasa con un tramo, los dos lo ven: "Cubierto hasta…", "Atrasado: le debe $X". El contrato nunca deja retirar más de lo depositado.
5. **La reputación de pago es pública.** Cada acuerdo, tramo y cobro queda onchain, así que se puede armar el historial de pago de cada empresa cliente (anticipación promedio de sus tramos, acuerdos completados, atrasos) antes de aceptarla como cliente. Solo es posible porque los pagos son públicos y verificables.

**¿Por qué servicios?** En un servicio continuo el pago continuo es simétrico: si el cliente deja de fondear, el proveedor deja de prestar el servicio, y ninguna de las partes queda expuesta más allá del tramo en curso.

**¿Por qué ARGt?** El proveedor gana y gasta en pesos. Con ARGt el dinero se vuelve programable (se libera solo, 24/7, sin bancos ni conciliación) sin pasar por el dólar ni asumir riesgo cambiario. La misma primitiva funciona con BRAt, MEXt y el resto de las Twin Stablecoins.

## Modelo de negocio

- **Comisión del 0,05% sobre cada depósito del cliente**, cobrada **encima** del precio acordado: el proveedor recibe el monto completo.
- La cobra el backend con una transferencia de ARGt desde la wallet del cliente a la **tesorería de Continuum**, así que cada comisión es verificable en Arbiscan.
- El proveedor no paga nada. Eso facilita que proponga acuerdos y traiga a sus clientes, y la red crece por el lado de la oferta.
- Extensiones: la misma primitiva sirve para freelancers y trabajadores de plataformas, y con escrow (liberación contra confirmación de entrega) para venta de mercadería.

---

## Chain, token, contrato y transacciones

| Recurso | Dirección / evidencia |
|---|---|
| Red | **Arbitrum One**, chainId `42161` |
| Token | **ARGt** (Twin Stablecoin, 18 decimales): [`0x59863989d080B22476DB95656d0C3CC18be92214`](https://arbiscan.io/token/0x59863989d080B22476DB95656d0C3CC18be92214) |
| Contrato | **ContinuumStreams**, verificado: [`0xB98D30CC1e8D234A6234569848366fE30F3fF799`](https://arbiscan.io/address/0xB98D30CC1e8D234A6234569848366fE30F3fF799#code) |
| Tesorería (comisiones) | [`0xC8F65ceEE7FB2AC6F8c3856Bc0ceA480a7555260`](https://arbiscan.io/address/0xC8F65ceEE7FB2AC6F8c3856Bc0ceA480a7555260) |

Transacciones reales ejecutadas por el producto con ARGt:

| Operación | Detalle | Hash |
|---|---|---|
| Deploy del contrato | Bloque 522100998 | [0x9bea…bc6b](https://arbiscan.io/tx/0x9bea2cb4b05d7be7d3fc3d53db78126c005eb03e40eb1fadf10b46d63c37bc6b) |
| Crear acuerdos en lote | Streams 1 y 2, 1 ARGt cada uno | [0x9f2f…0dc2](https://arbiscan.io/tx/0x9f2f71b543d3cbfb9a2c62da8049264da1d9226ed1026039d255fe699e520dc2) |
| Fondear un tramo | +0,2 ARGt al stream 1 | [0x40a5…ef67](https://arbiscan.io/tx/0x40a5b997b2355731b8a5f4a00ed1fb850bf23e4c4d7be3b02f4a0bb8e228ef67) |
| Cobro del proveedor | 0,1 ARGt | [0x074c…8328](https://arbiscan.io/tx/0x074c1daf4a25ed0369a566bdbe497662ff7d238d9890a11730a7abfeaf3f8328) |
| Cancelar acuerdo | Vuelven 0,9 ARGt al cliente y quedan 0,3 ARGt devengados para el proveedor | [0xb7c8…415b](https://arbiscan.io/tx/0xb7c8f3334a61ed87026ebd59665cd0a2e6b32981a9ca6ccdeef91ea15ed4415b) |
| Cobro del remanente | 0,2 ARGt después de la cancelación | [0x7ca1…bcac](https://arbiscan.io/tx/0x7ca1e0b5f8cf7e0d0421b50612421ba4826df897ac3404d4dde524fc6539bcac) |

Las comisiones aparecen como transferencias de ARGt a la tesorería, después de cada depósito. El detalle de saldos y la conciliación con la base están en [docs/B6.md](docs/B6.md).

**¿Por qué Arbitrum?** Es la chain donde Twin documenta completo el ecosistema de ARGt: el token, el pool de Curve ARGt/USDT0, el vault de Morpho y el bridge LayerZero. El gas es mínimo, así que se pueden hacer cobros chicos y frecuentes sin que la comisión de red se coma el monto.

---

## El producto

| Ruta | Qué es |
|---|---|
| `/` | Portada: "Pagos entre empresas, por segundo." con un contador de devengado en vivo |
| `/demo` | **Cuenta de empresa única** (Nodo Software SRL) que cobra y paga servicios. Sección **Cobrás**: lo devengado en tiempo real y el cobro a wallet o Belo. Sección **Pagás**: nuevo contrato con la comisión desglosada. Modo "Presentación" con cifras mensuales ilustrativas y modo "Saldo real" con datos onchain |
| `/payer` | Vista del **cliente**: acuerdos, estado de fondeo (al día, por vencer o atrasado), "Cubierto hasta", fondear un tramo con la comisión desglosada y los links a Arbiscan, y cancelar |
| `/payer/nuevo` | Nuevo acuerdo de servicio: proveedor, servicio contratado, precio, duración y primer tramo |
| `/payer/asistente` | **Asistente IA del cliente**: responde sobre la cobertura y el estado de cada acuerdo y propone nuevos acuerdos que el usuario confirma en una tarjeta. Nunca ejecuta pagos solo |
| `/worker` | Vista del **proveedor**, mobile-first e instalable como PWA: lo cobrado segundo a segundo, alertas de clientes atrasados, cobro, actividad y copiloto |
| `/entrar` | Selector de perfil (cliente o proveedor) |
| `/login` | Acceso de operador para el modo real |
| `/lab` | Laboratorio de flujos para probar operaciones |

La IA del producto (track Belo) explica en lenguaje natural el estado de los cobros, detecta atrasos, sugiere cuándo y cuánto fondear y arma propuestas de acuerdos. **Siempre con confirmación humana.** Corre con OpenAI y nunca habla de rendimiento ni de inversión.

La vista del proveedor está pensada para **integrarse en wallets como Belo** (en un webview, sin navegación propia), que pondría la custodia y el pase a pesos. Hoy funciona de forma independiente, como PWA.

---

## Arquitectura

```
Next.js (Vercel)
├─ UI: /demo, /payer, /worker (PWA)
├─ API (route handlers) ── auth de operador (sesión HttpOnly)
│   └─ StreamService (dominio: vesting, comisión, fondeo, reputación)
│        ├─ Repository ── Supabase (usuarios, acuerdos, actividad)
│        └─ StreamGateway
│             ├─ ViemStreamGateway ── Arbitrum One: ContinuumStreams + ARGt (wallets custodiales demo)
│             └─ MockStreamGateway ── demo offline
└─ Asistente: /api/agent/chat (OpenAI)
```

- **Contrato** (`contracts/`, Solidity 0.8.24, Foundry y OpenZeppelin): `createStream`, `createStreamsBatch`, `topUp`, `withdrawTo` y `cancel`, con vesting lineal por segundo. Lo retirable es `min(devengado, depositado) − retirado`. Tiene tests unitarios, de fuzz y de fork.
- **Dominio** (`web/lib/domain/`): lógica pura y testeada: vesting espejo del contrato (`vesting.ts`), comisión (`fees.ts`), reputación de pago (`reputation.ts`) y orquestación (`StreamService.ts`). La comisión se cobra **después** del depósito: si falla, el depósito no se revierte y la comisión queda registrada como pendiente.
- **Gateway**: el acceso a la chain está detrás de una interfaz, con una implementación real (viem) y una mock. `CHAIN_MODE=mock|real`.
- **Montos**: strings decimales de hasta 18 decimales con aritmética exacta. `bigint` solo dentro del gateway.

### API

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/users` | Usuarios demo |
| GET | `/api/streams?userId=` | Acuerdos del usuario (como cliente o proveedor) |
| POST | `/api/streams` | Crear acuerdos (uno o en lote) con el primer tramo y cobrar la comisión → `{ txHash, streamIds, feeTxHash? }` |
| POST | `/api/streams/[id]/topup` | Fondear un tramo y cobrar la comisión → `{ txHash, feeTxHash? }` |
| POST | `/api/streams/[id]/withdraw` | Cobro del proveedor a su wallet o a Belo |
| POST | `/api/streams/[id]/cancel` | Cancelación por parte del cliente |
| GET | `/api/activity?userId=` | Historial con links a Arbiscan (las comisiones no se muestran al proveedor) |
| GET | `/api/clients/[id]/reputation` | Reputación de pago pública de un cliente |
| POST | `/api/agent/chat` | Asistente IA |
| POST/GET | `/api/auth/login`, `/api/auth/session`, `/api/auth/logout` | Sesión de operador para el modo real |

---

## Correr el proyecto

Requisitos: Node.js 24 (`.nvmrc`), npm y, para los contratos, Foundry.

```bash
nvm use
npm ci --prefix web
cp web/.env.example web/.env.local
CHAIN_MODE=mock npm run dev --prefix web
```

En **modo mock** no hacen falta claves ni servicios: el backend arranca con usuarios y acuerdos en memoria, y los hashes `mock:` son simulaciones sin link a Arbiscan.

Para el **modo real** (`CHAIN_MODE=real`) hay que configurar en `web/.env.local` o en Vercel:
- `ARBITRUM_RPC_URL`, `STREAMS_CONTRACT_ADDRESS`, `ARGT_ADDRESS` y `TREASURY_ADDRESS`;
- las claves de las wallets demo (`DEMO_PK_*`);
- Supabase;
- el login de operador (`DEMO_AUTH_*`);
- el asistente (`OPENAI_API_KEY`, `OPENAI_MODEL`).

Ver [docs/SETUP.md](docs/SETUP.md), [docs/OPERATIONS.md](docs/OPERATIONS.md), [docs/DEMO-LOGIN.md](docs/DEMO-LOGIN.md) y [docs/VERCEL.md](docs/VERCEL.md). **Nunca subir `.env.local` ni claves al repositorio.**

### Tests y validación

```bash
# web/
npm test                 # unit + dominio + API
npm run lint
npm run typecheck
npm run build
npm run test:chain       # integración contra Anvil (requiere contratos compilados)

# contracts/
bash script/install-deps.sh
forge build
forge test --no-match-path 'test/*.fork.t.sol'
```

El [CI](docs/CI.md) valida backend y build, contratos y ABI, integración contra Anvil y migraciones de PostgreSQL.

### Deploy

En Vercel, con Root Directory `web`, Node.js `24.x`, instalación `npm ci` y build `npm run build`. El detalle está en [docs/VERCEL.md](docs/VERCEL.md).

---
## Límites de la demo

- Las wallets son **custodiales y de demo**: el servidor firma por los usuarios demo. En producción, la custodia la tendría un partner regulado (por ejemplo, la wallet que integre el módulo).
- No hay cuentas individuales: el acceso es con una clave de operador del equipo.
- Los montos onchain son chicos, porque los tokens de prueba se entregan en montos mínimos. El modo "Presentación" de `/demo` muestra cifras mensuales ilustrativas, que no son saldos reales.

## Aviso legal

Las Twin Stablecoins son emitidas por Twin Finance S.A.S. No son valores negociables, depósitos ni moneda de curso legal, y **no generan intereses ni rendimientos**. Continuum es un proyecto de hackathon: no constituye oferta pública ni asesoramiento financiero, legal ni impositivo. Está pensado para pagos comerciales entre empresas y a proveedores independientes, **no** para el pago de sueldos en relación de dependencia (ver [docs/legales-continuum.md](docs/legales-continuum.md)). Cualquier uso comercial requiere cumplir la regulación aplicable.
