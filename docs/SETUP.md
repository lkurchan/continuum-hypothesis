# Puesta en marcha — Tarea 0

## Desarrollo local

Requisitos: Node.js 24, npm y Foundry. En una terminal nueva, `forge` debe estar en el PATH (`export PATH="$HOME/.foundry/bin:$PATH"` si hace falta).

```bash
nvm use
npm ci --prefix web
cp web/.env.example web/.env.local
bash contracts/script/install-deps.sh
npm run dev --prefix web
```

La app abre en `http://localhost:3000`, con páginas placeholder en `/payer` y `/worker`. El backend funciona con `CHAIN_MODE=mock`, usuarios y streams sembrados en memoria, sin credenciales. `CHAIN_MODE=real` exige la configuración completa de Supabase, contrato/ABI y wallets. Ver [BACKEND.md](BACKEND.md) para consumir la API.

Las dependencias de Solidity se descargan sin submódulos y no se versionan en `contracts/lib/`. El script instala forge-std `v1.17.0` y OpenZeppelin `v5.4.0`, compatible con el compilador `0.8.24`. No modifica dependencias ya instaladas.

## Supabase

El proyecto remoto del equipo ya está configurado: se validaron las cuatro tablas, el RPC transaccional y las wallets demo, además de las lecturas HTTP en modo real. Para repetir la instalación en un proyecto nuevo:

1. Crear un proyecto llamado `continuum` en la organización del equipo.
2. Ejecutar `supabase/migrations/0001_init.sql` y luego `0002_record_stream_creation.sql`, una vez cada una, en el SQL Editor del proyecto nuevo.
3. Ejecutar `supabase/seed.sql`. Es repetible y conserva las direcciones de wallets que ya se hayan configurado.
4. Copiar la URL y la clave de servidor (service_role o secret) en las variables correspondientes de `web/.env.local` y de Vercel. La clave anon/publishable es opcional para este backend.

Las cuatro tablas tienen RLS habilitado y no tienen políticas de acceso público. El backend debe usar `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en el servidor. El `userId` de la demo no constituye una sesión autenticada.

El seed inicial incluye `platform`, `worker1` y `worker2` con direcciones cero. En el proyecto actual ya coinciden con las wallets demo. Para configurar una instalación nueva, usar `backend:wallets` como explica [OPERATIONS.md](OPERATIONS.md); las claves privadas van solo en `DEMO_PK_PLATFORM`, `DEMO_PK_WORKER1` y `DEMO_PK_WORKER2`. La dirección de Belo queda pendiente de confirmación.

## Vercel

El proyecto `continuum-hypothesis` está desplegado en [continuum-hypothesis.vercel.app](https://continuum-hypothesis.vercel.app). Production usa el backend real con acceso protegido; Preview conserva el modo mock sin claves reales. Se verificaron usuarios, streams e historial de B6 desde el dominio publicado. Ver [VERCEL.md](VERCEL.md) para el deployment, commit y alcance exactos; la UI completa requiere integrar su PR.

Importar `lkurchan/continuum-hypothesis` desde GitHub con estos ajustes:

| Ajuste | Valor |
|---|---|
| Project name | `continuum-hypothesis` |
| Framework preset | Next.js |
| Root Directory | `web` |
| Node.js | `24.x` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Automático para Next.js |
| Production branch | `main` |

Node.js 24 está entre las [versiones soportadas por Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions); `web/package.json` fija la misma versión mayor para el despliegue.

Seguir [VERCEL.md](VERCEL.md) para el despliegue real: protección de acceso, variables concretas, duración de Functions y validación. La API custodial demo no tiene autenticación propia: activar protección para todos los deployments antes de cargar claves reales. Las claves privadas y la service-role key nunca llevan el prefijo `NEXT_PUBLIC_`. La integración con el agente y `ANTHROPIC_API_KEY` quedan para una tarea posterior.

## Validación

```bash
npm run build --prefix web
npm run lint --prefix web
npm run typecheck --prefix web
npm test --prefix web
cd contracts
forge build
forge fmt --check
forge test
```

Para correr un solo test, usar `npx vitest run <archivo>` desde `web/` o `forge test --match-test <nombre>` desde `contracts/`. Los tests del backend cubren dominio, gateways, rutas y persistencia. Los tests del contrato corresponden a A1.

Verificado en la Tarea 0: build, lint, tipos y un test de Vitest; compilación de Foundry y reinstalación de dependencias en una carpeta limpia; tres páginas con HTTP 200 y siete operaciones API con HTTP 501. La migración y el seed se ejecutaron en PostgreSQL en memoria (PGlite), incluyendo repetición del seed, preservación de wallets existentes, referencias entre tablas y bloqueo de lectura con RLS para un rol sin privilegios.

`npm audit --omit=dev` no reporta vulnerabilidades. La auditoría completa reporta ocho avisos moderados en la cadena de ESLint/TypeScript por una dependencia transitiva de `minimatch`; quedan pendientes de una actualización compatible del tooling.

## Inicio de los módulos

Desde la raíz, actualizar primero la base y elegir solo la branch del módulo propio:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feat/a-contrato
# O bien: git checkout -b feat/b-backend
# O bien: git checkout -b feat/c-pagador
# O bien: git checkout -b feat/d-trabajador
```

Cada módulo modifica únicamente las carpetas asignadas en el PRD y se integra por PR. Las interfaces compartidas de la sección 8 están copiadas del PRD y no se cambian sin avisar al equipo.
