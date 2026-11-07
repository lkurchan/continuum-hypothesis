# Spec — Pivot a pagos continuos B2B por servicios

> Fecha: 2026-11-07. Ajusta `PRD.md` donde se contradicen; este documento manda sobre el PRD hasta que el PRD se actualice.
> El contrato `ContinuumStreams` deployado y verificado en Arbitrum **no cambia**.

## 1. Qué cambia

**Antes:** un repartidor o freelancer cobra su sueldo por segundo.
**Ahora:** **una empresa le paga a otra de forma continua por un servicio recurrente** (por ejemplo, una PyME de logística o de mantenimiento que atiende a un supermercado todo el mes). El caso del trabajador queda como una línea en el pitch: "la misma primitiva sirve para sueldos".

**Por qué servicios y no productos:** en un servicio continuo, el pago continuo es simétrico. Si el cliente deja de fondear, el proveedor deja de prestar el servicio, y ninguno queda expuesto a un "ya recibí la mercadería y dejo de pagar". El riesgo de cada parte se limita a lo que corre entre un tramo y el siguiente.

## 2. Propuesta de valor

- **Tesis:** pagar a plazo siempre es más caro que pagar por adelantado. El pago continuo es un **punto medio**: el cliente paga menos que el precio a 30 o 60 días y el proveedor cobra antes, con más pulmón financiero y sin descontar cheques ni facturas.
- **El precio lo acuerdan las partes**: la app no lo calcula. Una vez aceptado, **queda fijo onchain** (`totalAmount`, `start` y `end` del stream), lo que da confianza y simplifica los pagos: no hay facturas por cuota ni conciliación.
- **El cliente fondea de a poco o por tramos**, y eso es central: si tuviera que depositar todo al principio, sería lo mismo que pagar por adelantado. El contrato ya lo soporta con `topUp`.
- **El proveedor retira cuando quiere** lo devengado y fondeado, a su wallet o a Belo.

## 3. Modelo de negocio

- **Fee del 0,05% sobre cada depósito del cliente** (al crear y en cada top-up), **cobrada encima** del monto acordado. El proveedor recibe el precio completo.
  - Ejemplo: un tramo de $1.000.000 ARGt genera una fee de $500 ARGt.
  - Cálculo: `fee = amount * 5 / 10_000`, en unidades de 18 decimals con redondeo hacia abajo.
- **Se cobra onchain y es visible en Arbiscan**: el backend hace un `transfer` de ARGt del cliente a `TREASURY_ADDRESS` en una transacción aparte, después de cada depósito exitoso.
- El proveedor no paga nada. Eso facilita que proponga el acuerdo y traiga a sus clientes, y la red crece por el lado del proveedor.
- Queda descartado: SaaS, rendimiento sobre fondos depositados (prohibido por la regla de ARGt) y crédito.

## 4. Flujo

1. **El proveedor propone.** Carga el cliente, el servicio (descripción), el monto total del período, el inicio, el fin y un primer tramo sugerido. Se guarda en Supabase y se genera un link para el cliente.
2. **El cliente acepta.** Abre el link, ve la propuesta y, al aceptar, deposita el primer tramo. El backend ejecuta `approve` y `createStream(recipient=proveedor, totalAmount, start, end, initialDeposit=tramo)`, y después la fee. Desde ese momento el precio queda fijo onchain.
3. **El cliente fondea por tramos.** Cada `topUp` dispara su fee. La UI le muestra hasta cuándo está cubierto y cuánto sugiere fondear.
4. **El proveedor retira** lo devengado y fondeado cuando quiere, con `withdrawTo`.
5. **Atraso:** si lo devengado supera lo depositado, los dos ven el estado "Atrasado" con el monto adeudado. El contrato ya impide retirar más de lo depositado. El proveedor decide si sigue prestando el servicio.
6. **Cancelación:** se mantiene el `cancel` del contrato tal como está (solo el pagador, inmediato: lo devengado queda para el proveedor y el resto vuelve al cliente). No se destaca en el pitch. Si el cliente deja de fondear, también es un corte de hecho.

## 5. Estado de fondeo (lógica de dominio pura, en el módulo B)

Va en `web/lib/domain/funding.ts`, con tests:

```ts
export type FundingState = 'al_dia' | 'por_vencer' | 'atrasado' | 'completo' | 'cancelado';
export interface FundingStatus {
  state: FundingState;
  debt: Amount;                 // max(0, vested - deposited)
  fundedUntil: number | null;   // unix sec en que lo devengado alcanza a lo depositado; null si está completo
  remainingToFund: Amount;      // totalAmount - deposited
}
export function fundingStatus(stream: StreamView, nowSec: number, warnSeconds = 3 * 24 * 3600): FundingStatus;
```

- `fundedUntil = start + (deposited / totalAmount) * (end - start)`.
- El estado es `atrasado` si `now > fundedUntil`, y `por_vencer` si `fundedUntil - now < warnSeconds`. Si no, `al_dia`. Es `completo` si `deposited == totalAmount`, y `cancelado` si `canceledAt != null`.

## 6. Cambios por capa

### Contrato (módulo A)
Ninguno. Solo hay que cargar en Vercel la tesorería, una wallet nueva `TREASURY_ADDRESS`, y dejarla registrada en el README.

### Tipos y API (módulo B, cambios de interfaz que hay que avisar a todos)
- `ActivityKind` suma `'fee'`.
- `StreamView` suma `description?: string`. El resto del estado de fondeo se calcula con `fundingStatus` y no se guarda.
- Los roles `payer` y `worker` **no se renombran en el código**. En la UI, `payer` se muestra como "Cliente" y `worker` como "Proveedor".
- Rutas nuevas:

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/api/proposals` | `{ providerId, clientId, description, totalAmount, start, end, firstTranche }` | `{ id, url }` |
| GET | `/api/proposals/[id]` | — | `Proposal` |
| POST | `/api/proposals/[id]/accept` | `{ clientId, firstTranche }` | `{ txHash, feeTxHash, streamId }` |

- `POST /api/streams/[id]/topup` pasa a devolver `{ txHash, feeTxHash }`.
- Fee no atómica: primero va el depósito y después la fee. Si la fee falla, el depósito **no** se revierte: se registra la fee pendiente en `activity` con `note: 'fee pendiente'` y se reintenta en el próximo depósito. Prioridad: que el proveedor nunca quede sin fondos por un error nuestro.
- Gateway: suma `transferFee(payer, amount): Promise<{ txHash }>`, con su versión mock.

### Base (módulo B)
`supabase/migrations/0003_proposals.sql`:
`proposals(id uuid pk, provider_id, client_id, description, total_amount numeric, start_at, end_at, first_tranche numeric, status text /* 'pendiente' | 'aceptada' | 'rechazada' */, stream_id text null, created_at)`. Además, `streams` suma `description`.

### UI del cliente, ex payer (módulo C)
- Bandeja de propuestas pendientes con la pantalla de aceptación: detalle, precio fijo, primer tramo y la fee del 0,05% desglosada.
- Por acuerdo: barra de devengado contra fondeado, "cubierto hasta <fecha>", estado (al día, por vencer o atrasado) y un botón "Fondear tramo" con la fee visible.
- Links a Arbiscan para el depósito y para la fee.

### UI del proveedor, ex worker (módulo D)
- "Nueva propuesta": formulario y link para compartir.
- El contador en tiempo real se mantiene como protagonista: "Lo que ya cobraste de este servicio, segundo a segundo".
- Estado de cada acuerdo con alerta de atraso y el retiro a wallet o a Belo (sin cambios).
- El copy pasa de "sueldo" a "servicio", "acuerdo" o "cobro".

### IA (prioridad baja, igual que antes)
Un asistente que sigue siendo copiloto:
- Al cliente le sugiere cuándo y cuánto fondear para no atrasarse.
- Al proveedor le explica su estado y cuánto puede retirar.
- No ejecuta pagos sin confirmación. Reutiliza `/api/agent/chat` y `fundingStatus`.

## 7. Pitch (mensajes clave)

1. **Problema:** las PyMEs que prestan servicios cobran a 30, 60 o 90 días y se financian caro; los clientes pagan más caro por pagar a plazo.
2. **Solución:** pago continuo en pesos onchain (ARGt). Precio punto medio, fijo en la blockchain, fondeado por tramos y cobrable al segundo.
3. **Por qué onchain y en moneda local:** dinero programable que se libera solo, 24/7, sin conciliación ni bancos, y en pesos: sin pasar por el dólar.
4. **Negocio:** 0,05% por depósito, visible en el explorer durante la demo.
5. **Extensión:** la misma primitiva sirve para sueldos y freelancers.

## 8. Fuera de alcance

Que la app calcule el precio, la cancelación por parte del proveedor, el preaviso, los hitos, la pausa automática, productos o mercadería y redeployar el contrato.

## 9. Pendientes [ABIERTO]

- Guion de la demo y nombres de las empresas demo (proveedor y cliente).
- Si Belo sigue como "módulo integrable" para el lado del proveedor: Belo es una wallet de consumo, así que hay que confirmar si tiene cuentas para empresas.
- La wallet de tesorería, su fondeo y cargarla en Vercel.
- Actualizar `PRD.md` y `CLAUDE.md` con este pivot.
