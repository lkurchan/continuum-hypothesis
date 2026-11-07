# Módulo B — Fee del 0,05% + estado de fondeo

Pegar en Claude Code, en la raíz del repo y sobre `main` actualizado.

---

Vas a implementar la parte de backend del **pivot a pagos continuos B2B**. Antes de empezar, leé `CLAUDE.md`, `.plans/pivot-b2b-servicios-spec.md` (secciones 3, 5 y 6) y `.plans/pivot-b2b/00-README.md`. El contrato **no cambia**. Usá TDD liviano en la lógica de dominio. Freeze a las 15:00.

## Parte 1 — PR de interfaces (branch `feat/b-pivot-interfaces`, mergear **antes de las 13:55**)

C y D dependen de este PR, así que tiene que ser chico y entrar rápido.

1. `web/lib/domain/types.ts`: `ActivityKind` suma `'fee'`. No cambies nada más de los tipos.
2. `web/lib/domain/fees.ts`:
   ```ts
   export const FEE_BPS = 5n;                    // 0,05%
   export function feeFor(amount: Amount): Amount; // floor(amount * 5 / 10_000), en unidades de 18 decimals
   ```
   Con tests: 1.000.000 → 500, montos con decimales, 0 → 0 y redondeo hacia abajo. Reusá los helpers de `amounts.ts`.
3. `web/lib/domain/funding.ts`, según la sección 5 de la spec:
   ```ts
   export type FundingState = 'al_dia' | 'por_vencer' | 'atrasado' | 'completo' | 'cancelado';
   export interface FundingStatus { state: FundingState; debt: Amount; fundedUntil: number | null; remainingToFund: Amount }
   export function fundingStatus(stream: StreamView, nowSec: number, warnSeconds = 3 * 24 * 3600): FundingStatus;
   ```
   - `fundedUntil = start + (deposited / totalAmount) * (end - start)`, y es `null` si `deposited == totalAmount`.
   - `debt = max(0, vestedAt(stream, now) - deposited)`. Reusá `vesting.ts`.
   - Precedencia de estados: `cancelado` > `completo` > `atrasado` (`now > fundedUntil`) > `por_vencer` (`fundedUntil - now < warnSeconds`) > `al_dia`.
   - Tests de cada estado y de los bordes (`now == fundedUntil`, antes de `start`, después de `end`).
4. `StreamGateway`: suma `transferFee(payer: DemoUser, amount: Amount): Promise<{ txHash: string }>`. Implementalo en `MockStreamGateway` (hash simulado, igual que las otras operaciones mock) y dejá un stub en `ViemStreamGateway` que tire `TODO`.
5. Si `supabase/migrations` tiene un `check` sobre `activity.kind`, agregá `0003_activity_fee.sql` que sume `'fee'`.
6. `npm run typecheck`, `npm test` y `npm run lint` tienen que pasar. PR y avisar en el grupo: "Interfaces del pivot en main".

## Parte 2 — Fee real (branch `feat/b-pivot-fee`, mergear **antes de las 14:25**)

1. `ViemStreamGateway.transferFee`: `transfer(TREASURY_ADDRESS, fee)` de ARGt, firmado por la wallet custodial del pagador. Es un transfer directo y **no** necesita approve. Esperá el receipt, como en las otras operaciones. Leé `TREASURY_ADDRESS` del entorno y, si falta, tirá un error claro al iniciar el modo real.
2. `StreamService.create` y `StreamService.topUp`:
   - **Primero** el depósito, como está hoy. **Después**, `transferFee(payer, feeFor(depositado))`.
   - Registrar la actividad `kind: 'fee'` con su `txHash` y `note: 'Comisión Continuum 0,05%'`.
   - Si la fee falla, **no** se revierte nada: se registra la actividad `fee` con `note: 'fee pendiente'`, sin `txHash` real, y la operación responde OK igual. El proveedor nunca tiene que quedar sin fondos por un error nuestro.
   - En `create` con varios ítems, una sola fee sobre la suma de los depósitos iniciales.
3. Las respuestas de `POST /api/streams` y `POST /api/streams/[id]/topup` suman `feeTxHash?: string`. Es aditivo y no rompe a C ni a D.
4. Tests en `StreamService.test.ts`: la fee se cobra después del depósito, el monto es correcto, si la fee falla el depósito queda OK y se registra como pendiente, y `create` con lote cobra una sola fee.
5. Agregá `TREASURY_ADDRESS=` a `web/.env.example` con un comentario. **Nunca** cargues claves reales en ese archivo.
6. Si podés, probalo contra Anvil (`npm run test:chain`) antes de mergear.

## No hacer

- Tocar el contrato, renombrar `payer`/`worker` o agregar el campo `description` (se usa `label`).
- Crear tablas o rutas de propuestas: eso es P1 y va sin backend.
