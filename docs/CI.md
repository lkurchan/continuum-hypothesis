# CI de GitHub

El workflow `.github/workflows/ci.yml` corre en pull requests, pushes a `main` y ejecución manual. Tiene permisos de lectura, cancela ejecuciones anteriores de la misma branch/PR y usa actions fijados por SHA. Node sigue `.nvmrc` (24) y Foundry está fijado en `v1.9.0`. No requiere secretos de producción, RPC externo, wallets fondeadas ni servicios remotos configurados.

| Check | Qué verifica |
|---|---|
| Backend and build | `npm ci`, lint, tipos, tests del backend, build Next.js y smoke HTTP mock completo |
| Contracts and ABI | Dependencias fijadas, formato, build, 22 tests con 512 iteraciones de fuzz y ABI versionado igual al exportado |
| A+B on local Anvil | Crear, aprobar, fondear, retirar, cancelar y retirar remanente con firmas, receipts y artefactos del checkout |
| PostgreSQL migrations and permissions | PostgreSQL 17 temporal: migraciones, seed repetible, montos exactos, RPC atómico y aislamiento de anon |

El test de fork remoto queda explícitamente excluido del job de contratos. La integración con un token de prueba en Anvil no verifica la red real ni el contrato ARGt desplegado. No hay deploy ni merge automático. La protección de `main` no se modifica con este workflow.

## Reproducir localmente

```bash
nvm use
npm ci --prefix web
bash contracts/script/install-deps.sh
npm run lint --prefix web
npm run typecheck --prefix web
npm test --prefix web
CHAIN_MODE=mock npm run build --prefix web
npm run test:api --prefix web
forge fmt --check --root contracts
forge build --root contracts
forge test --root contracts --no-match-path 'test/*.fork.t.sol' --fuzz-runs 512
bash contracts/script/export-abi.sh
git diff --exit-code -- web/lib/chain/abi.ts
npm run test:chain --prefix web
```

Para SQL, apuntar `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` y `PGDATABASE` a una **base PostgreSQL vacía y descartable**. El bootstrap crea roles de prueba; no ejecutarlo en Supabase ni en una base compartida.

```bash
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  psql -X -v ON_ERROR_STOP=1 -f "$migration"
done
psql -X -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/backend.sql
```

La suite SQL revierte sus fixtures al terminar. Las migraciones se aplican una sola vez a la base nueva; el seed se prueba dos veces. El bootstrap reproduce los roles relevantes, pero no levanta PostgREST ni valida las credenciales de un proyecto Supabase real.
