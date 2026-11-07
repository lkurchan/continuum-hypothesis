# Prompt — Tarea 0 (base del repo)

Copiar y pegar en Claude Code, en la raíz del repo y parado en `main`.

---

Vas a hacer la **Tarea 0** de Continuum: el esqueleto del repo que desbloquea a los 4 módulos para trabajar en paralelo. Antes de empezar, leé `CLAUDE.md` y `PRD.md`, en especial las secciones 6, 7, 8 y 9. Esta tarea **no implementa lógica de negocio**: solo crea la estructura, las interfaces y los stubs. La prioridad es la velocidad, con unos 30 minutos de objetivo.

## Qué hacer

1. **`contracts/`, con Foundry**
   - Si `forge` no está instalado, instalalo con `foundryup` desde Git Bash. Si no se puede, avisame y seguí con el resto.
   - Inicializá con `forge init contracts --no-git` y sacá el `Counter` de ejemplo.
   - Instalá OpenZeppelin Contracts y configurá los remappings.
   - Dejá `contracts/src/ContinuumStreams.sol` con **solo** el struct, los eventos y las firmas de la sección 7 del PRD. Cada función revierte con `NotImplemented()`, porque la implementación es del módulo A.
   - Agregá `foundry.toml` con `solc = "0.8.24"` y un perfil `arbitrum` que tome el RPC de `ARBITRUM_RPC_URL`.
   - `forge build` tiene que compilar.

2. **`web/`, con Next.js** (usá npm, porque pnpm no está instalado)
   - `npx create-next-app@latest web --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm`
   - Instalá `viem` y `@supabase/supabase-js`, más `vitest` como dev dependency. Agregá los scripts `test` y `test:watch`.
   - `web/lib/domain/types.ts`: copiá exactamente los tipos de la sección 8.1.
   - `web/lib/domain/vesting.ts`: la firma de `vestedAt(stream, nowSec)` con un `throw new Error('TODO B1')`. La implementa B.
   - `web/lib/chain/StreamGateway.ts`: la interfaz de la sección 8.2 y una función `getGateway()` que lea `CHAIN_MODE` y por ahora tire `TODO B2`/`TODO B5`.
   - `web/lib/chain/abi.ts`: `export const continuumStreamsAbi = [] as const;` como placeholder. Lo completa A.
   - `web/lib/chain/constants.ts`: chainId 42161, la dirección de ARGt en Arbitrum (`0x59863989d080B22476DB95656d0C3CC18be92214`), 18 decimals y el helper `explorerTxUrl(hash)` que arma el link a `https://arbiscan.io/tx/<hash>`.
   - **Stubs de todas las rutas de la sección 8.3**, salvo `/api/agent/chat`, que queda para más adelante. Cada una responde `501 { error: 'not implemented' }` y lleva en un comentario el body y la respuesta esperados.
   - Las carpetas de cada módulo, cada una con una página mínima o un `.gitkeep`: `app/(payer)/payer/page.tsx`, `app/(worker)/worker/page.tsx`, `components/payer/`, `components/worker/`, `components/ui/`, `lib/db/`. La `app/page.tsx` es un placeholder con links a `/payer` y `/worker`.
   - `web/.env.example` con las variables de la sección 8.5, **sin** `ANTHROPIC_API_KEY`, que se suma más tarde. Para las claves demo, usá `DEMO_PK_PLATFORM`, `DEMO_PK_WORKER1` y `DEMO_PK_WORKER2`.
   - `npm run build`, `npm run lint` y `npm test` tienen que pasar. Para el test, agregá uno trivial de ejemplo.

3. **`supabase/`**
   - `supabase/migrations/0001_init.sql` con las 4 tablas de la sección 8.4.
   - `supabase/seed.sql` con los usuarios demo: una plataforma y dos trabajadores. Las direcciones van como placeholders `0x000…`, porque las wallets se generan después.
   - Si el MCP de Supabase está disponible y autenticado, creá el proyecto "continuum" y aplicá la migración. Si no, dejalo listo y avisame.

4. **Vercel**
   - Si el MCP de Vercel está disponible, creá el proyecto conectado al repo con Root Directory `web`. Si no, avisame qué configurar a mano.

5. **Raíz del repo**
   - `.gitignore`: `node_modules`, `.next`, `.env*` salvo `.env.example`, y `contracts/out` y `contracts/cache`.
   - Completá la sección **Comandos** de `CLAUDE.md`: build, lint, tests de web y de contratos, cómo correr un solo test (`npx vitest run <archivo>` y `forge test --match-test <nombre>`) y dev local.
   - Un `README.md` mínimo con el nombre, una línea de descripción y "ver PRD.md". El README completo es tarea de Codex.

## Reglas

- No implementes lógica de los módulos A, B, C o D. Solo firmas, tipos, stubs y carpetas.
- No cambies las interfaces de la sección 8 del PRD. Si encontrás un problema en una, avisame antes.
- Hacé commits chicos por paso (contracts, web, supabase, docs), porque el historial cuenta para el jurado. Esta tarea va **directo a `main`** y se pushea al terminar, así todos pueden branchear.
- Al final, reportá qué quedó, qué no se pudo hacer (Supabase o Vercel) y los comandos para que cada módulo arranque su branch: `git checkout -b feat/<modulo>-<tarea>`.
