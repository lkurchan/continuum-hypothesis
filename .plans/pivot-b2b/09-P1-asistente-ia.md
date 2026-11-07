# P1 #3 — Asistente IA en modo B2B (solo si el P0 está mergeado a las 14:30)

Unos 15 minutos. Branch `feat/agent-pivot-b2b`. Mergear **antes de las 14:45** o se descarta.

---

Contexto: el asistente de `/worker/copiloto` (`web/lib/agent/prompt.ts` y `context.ts`, ruta `/api/agent/chat`) se adapta al pivot B2B (`.plans/pivot-b2b-servicios-spec.md`). Sigue siendo **asistente**: explica y sugiere, y **no ejecuta pagos** sin confirmación.

## Tarea

1. `prompt.ts`: reescribí el rol. Es el asistente de una PyME proveedora que cobra servicios de forma continua en ARGt. Usa el glosario de `.plans/pivot-b2b/00-README.md`.
   - **Nunca habla de rendimiento ni de inversión.** ARGt es medio de pago.
   - Respuestas cortas, en español rioplatense.
2. `context.ts`: sumá al contexto, por cada acuerdo, `fundingStatus` (estado, deuda y "fondeado hasta"), lo cobrado y lo disponible. Reusá `web/lib/domain/funding.ts`. Si el P1 #1 está mergeado, sumá también la `paymentReputation` de cada cliente, así puede responder "¿cómo paga este cliente?". Actualizá su test.
3. Tres preguntas sugeridas en la UI del copiloto, por ejemplo:
   - "¿Cuánto puedo cobrar hoy?"
   - "¿Algún cliente está atrasado?"
   - "¿Hasta cuándo tengo cubierto el servicio de <cliente>?"

## No hacer

Agregar tools que muevan plata, o tocar el lado del cliente.
