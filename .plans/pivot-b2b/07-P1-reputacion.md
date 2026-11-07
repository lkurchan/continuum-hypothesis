# P1 #1 — Reputación de pago pública (solo si el P0 está mergeado a las 14:30)

Es la **prioridad más alta del P1**: es lo que más suma al criterio "Idea" de Twin, porque solo es posible con pagos onchain, públicos y verificables. Unos 40 minutos repartidos entre B (función), C y D (tarjeta). Mergear **antes de las 14:45** o se descarta.

---

Contexto: en el pivot B2B (`.plans/pivot-b2b-servicios-spec.md`, sección 4.1), cada acuerdo queda registrado onchain: cuándo se aceptó, cuándo se fondeó cada tramo y si se fondeó completo. Con eso armamos un **historial de pago por empresa cliente** que el proveedor consulta antes de aceptar trabajar con ella. Hoy no existe nada así.

## Parte B — Cálculo (branch `feat/b-reputation`, unos 20 min, TDD)

1. `web/lib/domain/reputation.ts`, una función pura:
   ```ts
   export interface PaymentReputation {
     clientId: string;
     agreements: number;              // acuerdos como cliente
     fullyFunded: number;             // acuerdos con deposited == totalAmount (o completos)
     avgFundingLeadDays: number;      // promedio de días de anticipación con que llega cada tramo respecto de fundedUntil (negativo = llegó tarde)
     lateEpisodes: number;            // veces que un acuerdo pasó a 'atrasado'
     daysLate: number;                // días acumulados en atraso
     score: 'excelente' | 'buena' | 'regular' | 'sin_historial';
   }
   export function paymentReputation(clientId: string, streams: StreamView[], activity: Activity[], nowSec: number): PaymentReputation;
   ```
   - Se reconstruye la línea de tiempo de cada acuerdo con las actividades `create` y `topup`: cada tramo extiende `fundedUntil`, y se compara la fecha del tramo contra el `fundedUntil` anterior.
   - Reusá `fundingStatus` de `funding.ts`.
   - `score`:
     - **excelente**: sin atrasos y anticipación de 1 día o más;
     - **buena**: hasta 1 atraso;
     - **regular**: el resto;
     - **sin_historial**: si no hay acuerdos.
   - Tests: un cliente sin historial, uno puntual, uno con un atraso y uno con un acuerdo sin fondear completo.
2. Ruta `GET /api/clients/[id]/reputation` → `PaymentReputation`. Usa los streams y la actividad que ya están en el repositorio. No hace falta leer eventos de la chain: la actividad ya guarda los `txHash`, que son la prueba verificable.

## Parte C y D — Tarjeta "Reputación de pago" (`web/components/ui/ReputationCard.tsx`, compartida, unos 20 min)

1. Una tarjeta compacta con el score como chip y tres líneas:
   - "Fondea en promedio **X días antes** del vencimiento";
   - "**N de M** acuerdos fondeados completos";
   - "**K** atrasos (**D** días)".
2. Debajo, "Verificable onchain" con un link a Arbiscan de la última transacción del cliente. Eso es lo que la hace creíble.
3. Dónde se muestra:
   - **D:** en el detalle de cada acuerdo del proveedor y en la pantalla "Proponer acuerdo", al elegir el cliente.
   - **C:** en `/payer/nuevo` cuando viene de un link de propuesta. Es "tu reputación", para que el cliente vea que le conviene cuidarla.

## Seed

Codex 1 suma historial al cliente demo (ver `05-codex1-seed.md`): 3 o 4 acuerdos pasados, la mayoría puntuales y uno con un atraso corto, para que la tarjeta no aparezca vacía.

## Pitch

"Cada pago queda en la blockchain, así que por primera vez una PyME puede ver **antes de aceptar** cómo paga su cliente. A la empresa le conviene cuidar su reputación."
