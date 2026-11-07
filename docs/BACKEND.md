# Backend — Integración de módulos

## Arranque para C y D

```bash
nvm use
npm ci --prefix web
CHAIN_MODE=mock npm run dev --prefix web
```

La API funciona sin RPC, Supabase o claves. Hay una plataforma (`platform`), dos trabajadores (`worker1`, `worker2`) y dos streams activos (`0`, `1`). `GET /api/users` entrega las identidades disponibles. Los montos son strings en ARGt con hasta 18 decimales; los timestamps son segundos Unix.

```bash
curl 'http://localhost:3000/api/streams?userId=worker1'
curl -X POST 'http://localhost:3000/api/streams/0/withdraw' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"worker1","amount":"500","destination":"wallet"}'
curl 'http://localhost:3000/api/activity?userId=worker1'
```

El contador del trabajador puede importar `vestedAt` y `withdrawableAt` desde `web/lib/domain/vesting.ts`. Son funciones puras, utilizables en el navegador; no importan claves, clientes RPC ni servicios del servidor.

## Contrato HTTP

Se mantienen los tipos e interfaces de PRD 8. Las rutas implementadas son:

| Método y ruta | Entrada | Éxito |
|---|---|---|
| GET `/api/users` | Sin body | 200, `DemoUser[]` |
| GET `/api/streams?userId=...` | Identidad demo | 200, `StreamView[]` |
| POST `/api/streams` | `{ payerId, items: [{ workerId, totalAmount, initialDeposit }], start, end }` | 201, `{ txHash, streamIds }` |
| POST `/api/streams/[id]/topup` | `{ userId, amount }` | 200, `{ txHash }` |
| POST `/api/streams/[id]/withdraw` | `{ userId, amount, destination: 'wallet' \| 'belo' }` | 200, `{ txHash }` |
| POST `/api/streams/[id]/cancel?userId=...` | Sin body | 200, `{ txHash, refunded, kept }` |
| GET `/api/activity?userId=...` | Identidad demo | 200, `Activity[]` |

En mutaciones, `userId` puede viajar en body o query. Para crear, `payerId` sirve como identidad si no se proporciona `userId`; si se proporcionan ambos deben coincidir. Nunca se infiere la identidad del dueño del stream para autorizar un retiro o cancelación. Este selector sigue siendo una demo sin autenticación real.

Los errores devuelven `{ error: string }`, con 400 para entrada inválida, 403 para permisos, 404 para recursos inexistentes, 409 para saldo/estado incompatible, 413 para cuerpos demasiado grandes y 503 para configuración/proveedores no disponibles. Los errores inesperados devuelven 500 sin detalles internos.

Las respuestas no se cachean. `X-Chain-Mode` identifica el modo cuando el backend pudo inicializarse. En mock, los hashes empiezan con `mock:`, `Activity.explorerUrl` está vacío y las notas indican simulación: la UI debe mostrar ese estado y omitir el enlace al explorer. Las direcciones Belo del mock son ficticias y solo mueven balances en memoria.

La actividad de un stream es visible para sus dos participantes. `create.amount` representa el fondeo inicial; `cancel.amount` representa el reintegro al pagador. En la respuesta de cancelación, `kept` es lo reservado para el trabajador según el evento del contrato; en mock incluye lo previamente retirado, y el remanente se obtiene restando `withdrawn`.

## Persistencia y modo real

En mock, todos los endpoints comparten estado en el proceso Node. Reiniciar el proceso reinicia usuarios, streams, balances e historial. Usar el mismo servidor local para la demo: diferentes instancias serverless no comparten memoria.

Para habilitar `CHAIN_MODE=real`:

1. Aplicar `0001_init.sql`, `0002_record_stream_creation.sql` y `seed.sql` en Supabase.
2. Reemplazar las direcciones cero del seed por las wallets demo; configurar Belo solo después de confirmar su compatibilidad con ARGt en Arbitrum.
3. Configurar Supabase, RPC, dirección del contrato y las claves `DEMO_PK_*` del lado servidor. Cada clave debe corresponder a la dirección guardada para ese usuario.
4. Integrar el ABI exportado por A en `web/lib/chain/abi.ts`. El placeholder vacío hace fallar el modo real antes de firmar.
5. Tener ARGt en el pagador y ETH para gas en las wallets que firman. Ejecutar B6 con el contrato funcional y registrar los hashes reales.

El gateway valida Arbitrum One y ARGt, aprueba el monto necesario, simula, firma, espera receipts y obtiene IDs/refund/kept de los eventos emitidos por el contrato. Las mutaciones se serializan por proceso y por wallet; el contrato debe volver a validar permisos, saldos y límites. No hay fallback automático de real a mock.

La creación guarda metadata y actividad en una sola función SQL transaccional. La actividad numeric se consulta como texto antes de serializar JSON, usando el [casting de columnas de PostgREST](https://docs.postgrest.org/en/stable/references/api/tables_views.html#casting-columns).

Una confirmación onchain y una escritura en Postgres no son una transacción única. Si la chain confirma pero falla la base, el error incluye el hash e indica reconciliarlo. Si la confirmación queda pendiente o el envío resulta ambiguo, consultar primero el explorer/wallet. **No reintentar automáticamente las mutaciones.** La autenticación real, la idempotencia distribuida y la reconciliación automática requieren una etapa posterior.

## Verificación y pendientes

```bash
npm test --prefix web
npm run lint --prefix web
npm run typecheck --prefix web
npm run build --prefix web
```

Los 56 tests habituales cubren precisión, límites, roles, lotes atómicos, cancelaciones, concurrencia local, todas las rutas, aislamiento de actividad, errores de persistencia, aprobaciones, firma con la wallet correcta, receipts y eventos. Supabase se prueba con transporte HTTP simulado. Las migraciones se validaron en PostgreSQL temporal, incluyendo rollback y permisos del RPC.

Además, el gateway se verificó con firmas y receipts contra el contrato de la rama A (`4f63150`) en Anvil local: crear, aprobar, fondear, retirar, cancelar y retirar el remanente. Se comparó el vesting del dominio con el contrato y se verificó el error de stream inexistente. Se usaron wallets efímeras y un token de prueba, sin mainnet ni fondos reales.

Después de integrar el módulo A, esta prueba opcional puede repetirse compilando sus artefactos y levantando un Anvil descartable:

```bash
# Desde la raíz, compilar el contrato y MockERC20 de A:
forge build --root contracts
# En una terminal separada:
anvil --host 127.0.0.1 --port 8547 --chain-id 42161 --accounts 0
# Desde la raíz, contra ese Anvil:
LOCAL_CHAIN_RPC_URL=http://127.0.0.1:8547 npm test --prefix web -- lib/chain/ViemStreamGateway.integration.test.ts
```

La prueba solo acepta RPC loopback, restaura un snapshot al terminar y se omite en `npm test` si falta `LOCAL_CHAIN_RPC_URL`. `CONTINUUM_TEST_ARTIFACTS` permite indicar otra carpeta de artefactos compilados para comprobar una copia temporal del módulo A.

Pendiente B6: desplegar/integrar el contrato de A, aplicar migraciones remotas, configurar claves y fondos, y completar el primer flujo real con hash verificable. La UI y el agente siguen en sus módulos correspondientes.
