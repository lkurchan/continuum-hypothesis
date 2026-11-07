# Preparación del backend real y B6

Los comandos se ejecutan desde la raíz con Node 24. `backend:check` y `backend:wallets` cargan `web/.env.local` con las reglas de Next.js. No leen `contracts/.env`: la clave del deployer y la clave de Arbiscan no son necesarias para operar la API.

## Supabase

Crear el proyecto `continuum` en una organización Free que tenga cupo disponible. En SQL Editor aplicar, en orden, `supabase/migrations/0001_init.sql`, `0002_record_stream_creation.sql` y `supabase/seed.sql`. Las migraciones se aplican una vez; el seed se puede repetir y preserva las wallets existentes. No ejecutar `supabase/tests/bootstrap.sql` en el proyecto remoto.

Completar `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `web/.env.local`. La segunda variable acepta la clave legacy `service_role` o una clave nueva `sb_secret_...`, siempre del servidor. No usar ahí `anon` ni `sb_publishable_...`. La clave pública no es necesaria para estas rutas server-side. Ver [API keys de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

Las tres claves `DEMO_PK_PLATFORM`, `DEMO_PK_WORKER1` y `DEMO_PK_WORKER2` deben corresponder a wallets distintas. No copiarlas al SQL Editor, al repositorio ni al chat. El contrato está desplegado en `0xB98D30CC1e8D234A6234569848366fE30F3fF799`; `ARGT_ADDRESS` debe ser el ARGt de Arbitrum documentado en el README.

```bash
npm run backend:check --prefix web
npm run backend:wallets --prefix web
# Después de revisar las direcciones públicas del plan:
npm run backend:wallets --prefix web -- --apply
npm run backend:check --prefix web
```

El diagnóstico solo lee: chainId, contrato, token, balances, schema, tablas y usuarios. Devuelve exit code 1 si encuentra bloqueos. Un saldo de ETH positivo no garantiza gas suficiente para todo B6; los montos de fondeo también se verifican al simular cada operación. Una advertencia de OpenAPI significa que no pudo comprobar el RPC de la migración 0002: verificar esa migración antes de enviar fondos.

La sincronización actualiza únicamente las direcciones cero de los tres usuarios demo con el rol esperado. Si una dirección ya coincide, no hace nada; si es distinta, aborta. Cada actualización comprueba que la dirección y el rol no cambiaron desde la lectura inicial. No cambia nombres, roles ni destinos Belo. Si el proceso se interrumpe, se puede repetir: conserva las direcciones ya configuradas correctamente.

## Seed por API

El script Solidity `SeedDemo.s.sol` crea streams solo onchain. Para que aparezcan en la app, preferir `backend:seed`, que pasa por la API y su registro transaccional de metadata/actividad.

Arrancar la API real solo después de configurar servicios y fondos:

```bash
CHAIN_MODE=real npm run dev --prefix web
```

En otra terminal, comprobar primero las lecturas reales de las tres identidades:

```bash
npm run backend:verify-api --prefix web -- --url http://127.0.0.1:3000
```

Este comando hace únicamente GET: exige `X-Chain-Mode: real`, compara roles y wallets con las claves locales, verifica que usuarios no incluya campos privados y comprueba aislamiento de streams/actividad. No firma, no llama mutaciones y no cambia el archivo de entorno. Si cambiaron variables `NEXT_PUBLIC_*`, reconstruir el servidor de producción antes de verificarlo.

Después, preparar un lote. Los siguientes importes son un ejemplo; ajustarlos al presupuesto aprobado de la demo:

```bash
npm run backend:seed --prefix web -- \
  --url http://127.0.0.1:3000 --mode real \
  --total 10 --deposit 1 --duration 900
```

El default usa `platform`, `worker1` y `worker2`. `--total` y `--deposit` son ARGt **por trabajador**, y `--duration` son segundos. Este ejemplo propone fondear 2 ARGt en total; las aprobaciones y la creación también consumen ETH. Se pueden elegir usuarios con `--payer` y `--workers worker1,worker2`.

Sin `--execute` el comando hace lecturas y muestra el JSON propuesto. Para ejecutar el lote revisado, repetir los mismos argumentos agregando `--execute`. El modo de la API debe coincidir con `--mode`; el script rechaza workers con streams activos/programados para evitar un seed duplicado. En mock ya existen streams iniciales, por lo que normalmente no hace falta ejecutar otro seed.

Antes del POST se crea un journal exclusivo en `web/.operations/seed-real.json` (ignorado por Git). Se puede seleccionar otro archivo con `--journal /ruta/archivo.json`. No borrar ni reemplazar un journal pendiente para forzar un reintento. Un timeout o una respuesta ambigua pueden corresponder a una transacción enviada. Revisar wallet, chain e historial primero.

Si recibió un receipt pero falta metadata/actividad, el journal conserva el resultado. Volver a ejecutar el mismo comando verifica ese resultado sin repetir el POST. Un journal ya verificado también se reutiliza sin crear más streams. Este mecanismo protege el script en esa máquina; no proporciona idempotencia distribuida a todos los clientes de la API.

## B6 y evidencia

Después de crear el lote, usar las rutas documentadas en [BACKEND.md](BACKEND.md) para top-up, retiro y cancelación con montos revisados. Verificar:

1. Receipt exitoso y eventos del contrato esperado.
2. Streams y actividad visibles para ambos participantes por la API.
3. Retiro a wallet y, solo después de confirmar compatibilidad, a una dirección Belo configurada.
4. Cancelación que conserva lo devengado y permite retirar el remanente.
5. Hashes de creación/retiro en el README y saldo/historial coherentes en el deploy web.

Si falta ARGt, Supabase o un destino Belo confirmado, dejar ese paso pendiente. No usar el hash del deploy como evidencia de un pago ARGt. La dirección llamada `belo` en el test de fork es una wallet simulada, no prueba compatibilidad con Belo.

## Smoke reproducible sin fondos reales

```bash
npm run build --prefix web
npm run test:api --prefix web
```

El smoke inicia su propio servidor de producción en loopback y fuerza `CHAIN_MODE=mock`, incluso si existe configuración real en `.env.local`. Comprueba seed, journal reutilizable, top-up, retiro, cancelación, retiro remanente y aislamiento del historial. Cierra el proceso al terminar. GitHub lo ejecuta después del build, sin secretos.

## Estado comprobado el 7/11/2026

- Contrato desplegado, bytecode igual al repositorio y prueba de ARGt real sobre fork aprobada.
- Las tres claves locales son válidas, corresponden a wallets distintas y las wallets tienen ETH.
- Fondeo confirmado: 3371,33 ARGt en la plataforma antes de B6; quedaron 3370,03 ARGt después del flujo.
- Supabase remoto validado: cuatro tablas accesibles, RPC publicado y ejecución de lote vacío aprobada sin crear filas. Las tres wallets ya coincidían con las claves; la sincronización fue idempotente y no cambió direcciones.
- B6 completado por API real local: lote de dos streams (2 ARGt), top-up (0,2), retiro (0,1), cancelación (reembolso 0,9; devengado 0,3) y retiro remanente (0,2). Receipts, eventos, balances y las seis actividades verificados. El stream 1 quedó cancelado y el 2 conserva 1 ARGt. Ver [B6.md](B6.md) para los hashes y horarios. Los journals quedaron verificados; no eliminarlos para repetir el seed.
- La clave pública no estaba configurada: la comprobación remota de acceso anon queda pendiente; RLS/permisos están cubiertos por la suite SQL de CI. Esto no bloquea el backend server-side.
- Vercel desplegado y validado: Production real protegido con All Deployments; Preview mock sin claves reales. Los usuarios, streams y seis actividades de B6 coinciden en el dominio publicado. Ver [VERCEL.md](VERCEL.md) para URL, commit y alcance. El mock en memoria sirve para una única instancia local; instancias serverless distintas no comparten ese estado.
