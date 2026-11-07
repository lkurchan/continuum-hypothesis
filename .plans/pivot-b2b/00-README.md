# Pivot B2B — índice de tareas

Cada archivo es un prompt autocontenido: se copia y se pega en el Claude o Codex de quien hace la tarea. La spec completa está en `.plans/pivot-b2b-servicios-spec.md` y el plan general en `.plans/pivot-b2b-plan.md`.

| Archivo | Quién | Prioridad | Mergeado antes de |
|---|---|---|---|
| `01-operativo.md` | Cualquiera, ya | P0 | 14:00 |
| `02-B-backend.md` | Módulo B | P0 | 13:55 (interfaces), 14:25 (fee real) |
| `03-C-cliente.md` | Módulo C | P0 | 14:30 |
| `04-D-proveedor.md` | Módulo D | P0 | 14:30 |
| `05-codex1-seed.md` | Codex 1 | P0 | 14:20 |
| `06-codex2-docs.md` | Codex 2 | P0 | 14:30 |
| `07-P1-reputacion.md` | B (función) + C/D (tarjeta) | **P1 #1** | 14:45 |
| `08-P1-propuesta-por-link.md` | Quien termine primero (C + D) | P1 #2 | 14:45 |
| `09-P1-asistente-ia.md` | Quien termine primero | P1 #3 | 14:45 |
| `10-integracion.md` | Todos | — | 15:00 |

**Orden del P1:** reputación, después la propuesta por link (con tramo mínimo) y por último el asistente IA. El "depósito antes de entregar" con liberación contra confirmación (escrow) **no entra hoy**: va al pitch como roadmap.

## Reglas para todos

- **Freeze a las 15:00.** Lo que no esté en `main` a las 14:45 queda afuera.
- Branch por tarea: `feat/<modulo>-pivot-<tarea>`. PR chico. Conventional Commits.
- **El contrato no se toca**, y los roles `payer`/`worker` no se renombran en el código: solo cambia el texto de la UI.
- **Orden de merge:**
  1. Interfaces de B.
  2. Copy de C y copy de D.
  3. Fee real de B.
  4. Estados de fondeo de C y de D.
  5. Seed.
  6. Docs.

## Glosario de UI (usar exactamente estas palabras)

| En código | En pantalla |
|---|---|
| `payer` | **Cliente** |
| `worker` | **Proveedor** |
| stream | **Acuerdo de servicio** (o "acuerdo") |
| `label` | **Servicio** (ej.: "Logística de última milla") |
| top-up / depósito | **Tramo** ("Fondear tramo") |
| `fundedUntil` | **Cubierto hasta** <fecha> |
| `debt` | **Atrasado**: "le debe $X" (al cliente) / "te debe $X" (al proveedor) |
| fee | **Comisión Continuum (0,05%)** |
| reputation | **Reputación de pago** |

Palabras que ya no se usan: sueldo, trabajador, repartidor, salario.
