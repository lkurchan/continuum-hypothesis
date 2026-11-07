# Módulo C — UI del Cliente (ex pagador)

Pegar en Claude Code, en la raíz del repo y sobre `main` actualizado.

---

Vas a adaptar la UI de `/payer` al **pivot B2B**: ahora es la vista de una **empresa cliente** que contrata servicios recurrentes y los paga de forma continua, fondeando por tramos. Antes de empezar, leé `CLAUDE.md`, `.plans/pivot-b2b-servicios-spec.md` (secciones 2, 4 y 6) y el **glosario** de `.plans/pivot-b2b/00-README.md`, que hay que usar exactamente. Tocá solo `web/app/(payer)/**` y `web/components/payer/**` (y `components/ui/**` si hace falta). Sin tests de front. Freeze a las 15:00.

## Parte 1 — Copy B2B (branch `feat/c-pivot-copy`, **13:40–14:10**, no depende de nadie)

1. Reemplazá en toda la vista: pagador → **Cliente**, trabajadores → **Proveedores**, sueldo o pago de sueldo → **Acuerdo de servicio**, depósito o top-up → **Tramo** ("Fondear tramo").
2. `/payer/nuevo` pasa a ser "Nuevo acuerdo de servicio". El `label` se presenta como **"Servicio contratado"** (placeholder: "Logística de última milla").
3. Mensaje de valor arriba del formulario, en una línea: "Pagás menos que a 60 días y tu proveedor cobra al segundo. El precio queda fijo en la blockchain."
4. El botón de cancelar pasa a secundario (texto o link, sin rojo grande) y queda dentro del detalle del acuerdo, no en la lista.
5. Mergeá apenas esté: es independiente de B.

## Parte 2 — Estado de fondeo y fee (branch `feat/c-pivot-funding`, **14:10–14:30**, requiere el PR de interfaces de B en `main`)

1. En cada acuerdo de la lista y del detalle, usá `fundingStatus(stream, now)` de `web/lib/domain/funding.ts`:
   - Un chip de estado: **Al día** (verde), **Por vencer** (ámbar), **Atrasado** (rojo), **Completo** o **Cancelado**.
   - "**Cubierto hasta** <fecha y hora>" (`fundedUntil`).
   - Si está atrasado: "**Le debés $X** a <proveedor>" (`debt`).
   - Una barra con lo devengado y lo fondeado sobre el total, para que se vea la distancia.
2. "Fondear tramo":
   - Antes de confirmar, mostrá el desglose: tramo $X, **Comisión Continuum (0,05%)** $Y y total $X+Y. Usá `feeFor()` de `web/lib/domain/fees.ts`.
   - En el feedback de éxito, **dos links a Arbiscan**: depósito (`txHash`) y comisión (`feeTxHash`, si viene).
   - Sugerencia simple: un botón "Cubrir 7 días más" que precargue el monto necesario.
3. El mismo desglose de comisión aplica al crear el acuerdo, sobre el primer tramo.

## No hacer

- Cambiar las llamadas a la API más allá de leer `feeTxHash`.
- Mostrar cualquier idea de "rendimiento". ARGt no rinde.
