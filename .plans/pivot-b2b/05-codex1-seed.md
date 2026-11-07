# Codex 1 — Datos demo B2B

Pegar en Codex, sobre `main` actualizado. Branch `feat/seed-pivot-b2b`, mergear **antes de las 14:20**.

---

Pivot del producto: Continuum pasa a ser un sistema de **pagos continuos entre empresas por servicios recurrentes**. Una empresa **cliente** paga a un **proveedor** de forma continua (por segundo), fondeando por tramos en ARGt. Leé `CLAUDE.md`, `.plans/pivot-b2b-servicios-spec.md` y el glosario de `.plans/pivot-b2b/00-README.md`.

## Tarea

1. Actualizá los usuarios demo (`supabase/seed.sql`, `web/lib/db/demo.ts` y lo que use el modo mock) **sin cambiar ids, roles ni direcciones**, solo nombres y avatares:
   - `payer` → una empresa cliente, por ejemplo "Almacenes del Sur S.A." (supermercado).
   - `worker` 1 → "Ruta Corta Logística" (logística de última milla).
   - `worker` 2 → "TecnoFrío Mantenimiento" (mantenimiento de cámaras de frío).
   - **Nombres inventados.** No uses marcas ni empresas reales.
2. Streams demo para el modo mock (y para el seed del modo real, si hay script), con `label` de servicio realista:
   - Uno **al día**: "Logística de última milla — noviembre". Período de 30 días, por la mitad, fondeado con un tramo adelante.
   - Uno **atrasado**: "Mantenimiento de cámaras de frío — noviembre". Lo devengado supera a lo fondeado por un monto visible.
   - Montos realistas en ARGt para servicios PyME (cientos de miles a millones). En modo real, respetá el ARGt que haya disponible.
3. La actividad mock incluye al menos un depósito con su fila `fee` (0,05%) asociada.
4. **Historial para la reputación de pago** (P1 #1, `07-P1-reputacion.md`): el cliente demo tiene 3 o 4 acuerdos **pasados** (completos), con actividades `create` y `topup` fechadas. La mayoría de los tramos llegan 1 a 3 días antes de que venza la cobertura, y uno llega 2 días tarde. Así la tarjeta muestra un historial creíble ("buena" o "excelente") en lugar de aparecer vacía.
4. `npm test` y `npm run typecheck` tienen que pasar.

## No hacer

Cambiar tipos, rutas o lógica, o tocar UI.
