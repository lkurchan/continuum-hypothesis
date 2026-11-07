# Plan — Asistente del cliente y migración a OpenAI (C y D)

Spec: `docs/superpowers/specs/2026-11-07-asistente-pyme.md`. Es el P1 del pivot B2B: hay que mergearlo antes de las 14:45.

1. [x] Crear la branch `feat/d-asistente-pyme` desde `main` y commitear la spec y el plan.
2. [x] `toProposal()` y `payerSnapshot()` con sus tests. Commit.
3. [x] Migrar `/api/agent/chat` a OpenAI (`openai` en lugar de `@anthropic-ai/sdk`, con `OPENAI_API_KEY` y `OPENAI_MODEL`), sumar `PAYER_SYSTEM` y el tool `proponer_acuerdo` solo para el cliente, y agregar la propuesta al stream después de `\u001e`. Commit.
4. [x] UI: `useChat` compartido, `/payer/asistente`, `ProposalCard` y la pestaña en el header. Commit.
5. [x] Reemplazar Claude por OpenAI en la documentación. Commit.
6. [ ] Cargar `OPENAI_API_KEY` y `OPENAI_MODEL` en `.env.local` y en Vercel, y hacer la prueba manual en mock (criterios 3 y 4). Push y PR contra `main`.
7. [ ] Cuando B mergee `funding.ts` y `fees.ts`: usar `fundingStatus` en el snapshot y mostrar la comisión en la tarjeta.
8. [x] Revisar la integración con auth, completar el guard de reputación y el destino del login, y cubrir streaming y propuestas sin ejecutar pagos. No modificar componentes ni páginas.
9. [ ] Completar la prueba del chat real. PR #9 mergeado con checks aprobados; login integrado en PR #14 y variables de proveedor y auth configuradas en Production.
10. [x] Agregar diagnóstico del error del proveedor observado en Production con logs limitados a metadatos y normalización de las variables, sin exponer conversaciones ni secretos.
11. [x] Evitar que el modelo repita una propuesta después de que el usuario pide explícitamente solo una consulta. Tests de varios turnos con rechazo, reactivación de propuestas y tool-call inesperado sin texto.
