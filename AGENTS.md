# Guía del repositorio

Instrucciones de trabajo para este repositorio. Mantener `CLAUDE.md` y `AGENTS.md` sincronizados.

## Proyecto

Proyecto para HackaTwin (hackathon presencial, sábado 7/11/2026). La entrega cierra a las 18:00 y lo que llegue después no se evalúa. A las 19:00 hay pitch de 3 min más 2 min de preguntas. Somos un equipo de 4 y la prioridad es una demo que funcione en vivo con una UI que impresione al jurado, por encima de la completitud.

**Idea:** "sueldo por segundo". El pagador deposita el monto del período en una stablecoin local (ARGt) y el receptor lo va desbloqueando de forma continua. Puede retirar cuando quiera cualquier monto menor o igual a lo ya devengado. Ataca el problema de "llegar a fin de mes". La misma primitiva (pagador, receptor, token, monto, inicio, fin) sirve también para pagos B2B entre PyMEs, en lugar de pagos a 30 o 60 días. Si sobra tiempo, se suma un copiloto de liquidez con IA.

**Producto:** Continuum. El usuario es un repartidor o freelancer, y el que paga es una plataforma o empresa. **`PRD.md` es la fuente de verdad**: alcance, diseño del contrato, interfaces entre módulos, tareas y cronograma. Leelo antes de tocar código.

**Tracks:** Stablecoins (Twin) como principal y Belo como secundario. Las bases están en `docs/*.pdf`. Belo cierra a las 17:30 y Twin a las 18:00. El freeze de features es a las 15:00.

**Stack:** Arbitrum One, contrato propio en `contracts/` (Foundry + OpenZeppelin) y `web/` (Next.js App Router + viem + Supabase + Vercel AI SDK con Claude). Wallets custodiales con usuarios demo fijos y claves en variables de entorno. Deploy en Vercel.

## Requisitos duros del track Twin (para no quedar descalificados)

- Usar al menos una Twin Stablecoin en una chain elegible: Arbitrum, Base, Polygon, Ethereum o Avalanche. Son mainnets, y los tokens de prueba los dan los mentores de Twin en montos mínimos.
- Mostrar en la demo al menos una transacción onchain ejecutada por el producto, con el hash verificable en el explorer.
- Repo público con un README que indique token(s), chain y direcciones de contrato usadas.
- La lógica del producto tiene que construirse durante el evento, y el historial de commits tiene que mostrarlo: commits chicos y frecuentes.
- Se evalúan Idea, Problema, Negocio y Pitch, con el mismo peso. El token tiene que ser el núcleo del producto, no un agregado.
- Regulatorio: ARGt es un medio de pago **sin rendimiento** (la CNV lo frenó cuando ofrecía yield). Nunca presentar en la UI ni en el pitch un rendimiento al usuario por tener ARGt.

## Datos onchain de referencia

- Los tokens son ERC-20 Upgradeable de OpenZeppelin (beacon proxy), con **18 decimals** y transferencias permissionless.
- Las direcciones **no** son determinísticas entre chains: la misma dirección puede ser otro token en otra chain. Identificar siempre un token por el par (chainId, dirección).
- ARGt: Arbitrum `0x59863989d080B22476DB95656d0C3CC18be92214` y Base `0xf016413834E6D1A14F3D628B11D6Ef725a6bdbDD`. Las columnas de Polygon y Avalanche salen cortadas en el PDF; pedírselas a los mentores.
- Pool de Curve ARGt/USDT0 en Arbitrum: `0x356d349da9add7efb56a35fab939a2c6d852f853`.
- Vault Morpho "ARGt Prime" en Arbitrum: `0x9Dd3F844747AB78d616BF76DB92756E17A064aDD`.
- Precio de referencia: `https://api.belo.app/public/price` (bid, ask y mid por par).
- Logos: `https://assets.twin.finance/media/tokens/32x32/<TICKER>.svg`.
- El bridge de ARGt usa LayerZero V2 (OFT). El ABI y los adaptadores están en `docs/track twin.pdf`.

## Reglas de trabajo

- **SDD (spec-driven):** antes de codear un módulo tiene que existir su spec en `docs/superpowers/specs/` y su plan en `docs/superpowers/plans/`. Si el código y la spec divergen, se actualiza la spec en el mismo PR.
- **TDD liviano en backend y contratos:** tests de la lógica de negocio (cálculo de lo devengado, límites de retiro, permisos) antes o junto con la implementación. El objetivo es que funcione, no la cobertura. El frontend no lleva tests.
- **Git:** cada feature va en su propia branch y se integra por PR. No pushear a `main` salvo que lo pidan explícitamente. La Tarea 0 es la excepción acordada: su base se publica directamente en `main`; después, cada módulo trabaja en su branch `feat/<modulo>-<tarea>`. Usar siempre Conventional Commits (`type(scope): description`), conservar la identidad Git configurada y no agregar atribuciones, firmas ni trailers de coautoría.
- **Módulos independientes:** hay cuatro responsables de módulos y dos colaboradores de integración. Los módulos A (contrato), B (backend y chain), C (UI del pagador) y D (UI del trabajador y agente) tocan solo sus carpetas, listadas en la sección 9 de `PRD.md`. Las interfaces compartidas (`web/lib/domain/types.ts`, `StreamGateway` y las rutas de la API, sección 8 de `PRD.md`) no se cambian sin avisar. Todo se integra contra `MockStreamGateway` hasta que esté el real.
- **SOLID:** la lógica de dominio no depende de la chain ni de la UI. El acceso a la blockchain va detrás de una interfaz, con una implementación real y una mock para la demo offline.
- **Demo primero:** todo flujo que se muestre en el pitch necesita una salida de emergencia (datos sembrados o un modo mock) por si falla la red en vivo.

## Comandos

Requisitos: Node.js 24 (ver `.nvmrc`), npm y Foundry (`forge`, `cast`, `anvil`). Si Foundry no está en el PATH, agregar `~/.foundry/bin`. El compilador es Solidity 0.8.24; las dependencias están fijadas en `contracts/script/install-deps.sh`.

Desde la raíz:

```bash
nvm use
npm ci --prefix web
cp web/.env.example web/.env.local
bash contracts/script/install-deps.sh
npm run dev --prefix web
```

Validación de web (desde `web/`):

```bash
npm run build
npm run lint
npm run typecheck
npm test
npm run test:watch
npx vitest run lib/chain/constants.test.ts
# Un archivo cualquiera: npx vitest run <archivo>
```

Contratos (desde `contracts/`):

```bash
forge build
forge fmt --check
forge test
# Un test individual: forge test --match-test <nombre>
# Fork local, con ARBITRUM_RPC_URL exportada:
anvil --fork-url "$ARBITRUM_RPC_URL"
# Perfil Arbitrum, con ARBITRUM_RPC_URL exportada:
FOUNDRY_PROFILE=arbitrum forge build
```

Todavía no hay tests de negocio del contrato: corresponden a A1. Sus funciones revierten con `NotImplemented()` y pueden producir advertencias de parámetros sin usar. El backend ya implementa vesting, gateway mock, API y persistencia. `CHAIN_MODE=mock` funciona sin credenciales y reinicia sus datos al reiniciar el proceso. El gateway real requiere el ABI de A, contrato desplegado, Supabase y wallets fondeadas. Ver `docs/BACKEND.md` para integración y límites de la demo.

Deploy web: conectar el repositorio en Vercel con Root Directory `web`, Node.js `24.x`, build `npm run build` e instalación `npm ci`. Después de vincular el proyecto, el comando manual desde `web/` es `npx vercel --prod`. Ver `docs/SETUP.md` para Supabase, variables y pendientes. No hay un deploy onchain en la Tarea 0.
