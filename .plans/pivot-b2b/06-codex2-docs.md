# Codex 2 — Docs del pivot

Pegar en Codex, sobre `main` actualizado. Branch `docs/pivot-b2b-docs`, mergear **antes de las 14:30**.

---

Pivot del producto: Continuum pasa a ser un sistema de **pagos continuos entre empresas por servicios recurrentes**. Leé `.plans/pivot-b2b-servicios-spec.md`: es la fuente de verdad del pivot.

## Tarea

1. **`PRD.md`**: integrá el pivot.
   - Resumen, problema y usuarios: proveedor PyME de servicios y empresa cliente.
   - Modelo de negocio: **fee del 0,05% sobre cada depósito, pagada por el cliente, encima del precio**, cobrada onchain con un transfer a la tesorería. Reemplaza el SaaS.
   - Flujo con tramos y el estado de atraso.
   - El caso de sueldos y freelancers queda como extensión.
   - Mantené las secciones técnicas: el contrato no cambia.
2. **`CLAUDE.md` y `AGENTS.md`** (mantenerlos sincronizados): actualizá "Idea" y "Producto" al pivot B2B y agregá el glosario de UI de `.plans/pivot-b2b/00-README.md`.
3. **`README.md`**, con lo que exige el track de Twin:
   - Problema y solución B2B en 3 o 4 líneas.
   - Tokens, chain (Arbitrum One, 42161) y direcciones: ARGt, el contrato `ContinuumStreams` y `TREASURY_ADDRESS` (pedila en el grupo).
   - **Hashes de transacciones reales con links a Arbiscan**: creación, tramo, **comisión** y cobro. Dejá placeholders `TODO hash`, que se completan a las 14:40 con la prueba de punta a punta.
   - Modelo de negocio, arquitectura, cómo correrlo, qué se hizo durante el evento y aviso legal: ARGt no genera rendimiento.

## No hacer

Tocar código.
