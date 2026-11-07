# Plan — Pivot B2B antes del freeze de las 15:00

> Spec: `.plans/pivot-b2b-servicios-spec.md`. Hechos al momento de escribir este plan: son las 13:35, el freeze es a las **15:00** y tenemos **unos 85 minutos**.
> Regla: si algo no está mergeado en `main` a las 14:45, queda afuera. Después de las 15:00 solo se corrigen bugs y copy.

## Recortes para llegar

| De la spec | Qué hacemos hoy | Por qué |
|---|---|---|
| Campo `description` nuevo | Usar el `label` que ya existe en streams como descripción del servicio | Sin cambio de tipos ni migración |
| Propuestas en Supabase con 3 rutas nuevas | **P1 liviano:** el proveedor arma un link a `/payer/nuevo?…` con el formulario precargado y el cliente acepta con el flujo actual. Sin tabla y sin rutas | Pasa de unos 90 min de trabajo entre B, C y D a unos 30 min de una sola persona |
| Renombrar roles en el código | No se toca. Solo copy de UI | Riesgo cero |
| IA | Solo se ajusta el prompt y el contexto a B2B | Sigue siendo de prioridad baja |

## P0 — imprescindible (mergeado antes de las 14:30)

### B — Fee del 0,05% + estado de fondeo (backend)
1. **13:40–13:55, PR chico de interfaces que se mergea primero** para que el resto haga rebase:
   - `ActivityKind` suma `'fee'`.
   - `StreamGateway.transferFee(payer, amount): Promise<{ txHash }>` con la implementación mock.
   - `web/lib/domain/fees.ts`: `FEE_BPS = 5` y `feeFor(amount) = amount * 5 / 10_000`, con un test.
   - `web/lib/domain/funding.ts`: `fundingStatus(stream, now)` según la sección 5 de la spec, con tests de los casos al día, por vencer, atrasado, completo y cancelado.
2. **13:55–14:25:**
   - `ViemStreamGateway.transferFee`: un `transfer` de ARGt del pagador a `TREASURY_ADDRESS`. Es un transfer directo, así que no necesita approve.
   - `StreamService.create` y `topUp`: después de que se confirma el depósito, cobrar la fee y registrar la actividad `fee`. Si la fee falla, el depósito **no** se revierte: se registra con `note: 'fee pendiente'`.
   - `create` y `topUp` devuelven `feeTxHash`.
   - Si la tabla `activity` tiene un check sobre `kind`, agregar una migración `0003` que sume `'fee'`.
3. **Operativo (cualquiera, ya mismo):**
   - Crear la wallet de tesorería y cargar `TREASURY_ADDRESS` en Vercel y en `.env.example`.
   - Verificar que la wallet del pagador demo tenga ARGt de sobra para las fees.

### C — UI del cliente (ex pagador)
1. **13:40–14:10, copy B2B:**
   - "Pagador" pasa a "Cliente", "trabajadores" a "proveedores" y "sueldo" a "servicio" o "acuerdo".
   - En `/payer/nuevo` el `label` se presenta como "Servicio contratado".
   - El botón de cancelar pasa a secundario, sin protagonismo.
2. **14:10–14:30, con el PR de interfaces de B:**
   - Por acuerdo: el chip de estado de `fundingStatus`, la línea "Cubierto hasta <fecha>" y la deuda si está atrasado.
   - "Fondear tramo" muestra la fee del 0,05% desglosada antes de confirmar y los dos links a Arbiscan (depósito y fee) en el feedback.

### D — UI del proveedor (ex trabajador)
1. **13:40–14:10, copy B2B:**
   - El contador pasa a "Lo que ya cobraste de este servicio, segundo a segundo", con el `label` como nombre del acuerdo.
   - Cualquier mención a sueldo o trabajo pasa a servicio o cobro.
2. **14:10–14:30:** el chip de estado y la alerta "Tu cliente está atrasado: te debe $X", usando `fundingStatus`.

### Codex 1 — datos demo
- **13:40–14:20:** reescribir el seed y los usuarios demo para B2B. Un cliente (por ejemplo, un supermercado) y uno o dos proveedores de servicios (logística, mantenimiento), con labels de servicio realistas.
- Un acuerdo tiene que quedar **atrasado** para mostrar el estado en la demo.
- Los nombres de empresas son inventados: no usar marcas reales.

### Codex 2 — docs
- **13:40–14:30:** actualizar `PRD.md`, `CLAUDE.md`/`AGENTS.md` y `README.md` con el pivot. Problema y solución B2B, modelo de fee del 0,05% con la dirección de la tesorería y el link a una transacción de fee real cuando exista. Se mantiene el aviso de que ARGt no rinde.

> **Prompts por persona:** `.plans/pivot-b2b/` (empezar por `00-README.md`). Si este plan y esos archivos difieren, mandan esos archivos.

## P1 — solo si P0 está mergeado a las 14:30

**Orden:**
1. **Reputación de pago pública** (`07-P1-reputacion.md`).
2. Propuesta por link con tramo mínimo.
3. Asistente IA.

El escrow (depósito antes de entregar) va al pitch como roadmap.

- **D (o quien termine primero) — Propuesta por link, unos 30 min:** pantalla "Proponer acuerdo" del lado del proveedor (servicio, monto, período y primer tramo) que genera un link `/payer/nuevo?provider=…&label=…&total=…&start=…&end=…&first=…`, con botón de copiar y QR. C hace que `/payer/nuevo` lea esos query params y precargue el formulario. No hay persistencia: el link es la propuesta.
- **Asistente IA, unos 15 min:** actualizar `web/lib/agent/prompt.ts` y `context.ts` a B2B: al cliente le sugiere cuándo fondear según `fundingStatus` y al proveedor le explica su estado. Sin acciones nuevas.

## 14:30–15:00 — integración

- 14:30: rebase de todo sobre `main`, merge y deploy en Vercel.
- **14:40: prueba de punta a punta en mainnet.** Crear un acuerdo con el primer tramo, fondear otro tramo, retirar y verificar las 3 o 4 transacciones (incluidas las de fee) en Arbiscan. Guardar los hashes para el README.
- 14:50: probar `CHAIN_MODE=mock` como salida de emergencia.
- 15:00: **freeze.**

## Orden de merge (para evitar conflictos)

1. PR de interfaces de B (tipos, gateway, `fees.ts`, `funding.ts`).
2. Copy de C y copy de D, que no se pisan.
3. Fee real en B.
4. Estados de fondeo en C y en D.
5. Seed de Codex 1.
6. Docs de Codex 2.

## Riesgos

- **El pagador no tiene ARGt para la fee.** Es poco (0,05%), pero hay que chequearlo antes de la prueba de las 14:40.
- **El check de `kind` en la base rompe al registrar la fee.** B lo revisa en el paso 1.
- **El copy de C y D desincronizado.** Glosario único: **Cliente**, **Proveedor**, **Acuerdo de servicio**, **Tramo**, **Cubierto hasta**, **Atrasado**.
