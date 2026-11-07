# Módulo D — UI del Proveedor (ex trabajador)

Pegar en Claude Code, en la raíz del repo y sobre `main` actualizado.

---

Vas a adaptar la UI de `/worker` al **pivot B2B**: ahora es la vista de una **PyME proveedora** que presta un servicio recurrente y cobra de forma continua, segundo a segundo. Antes de empezar, leé `CLAUDE.md`, `.plans/pivot-b2b-servicios-spec.md` (secciones 2, 4 y 6) y el **glosario** de `.plans/pivot-b2b/00-README.md`, que hay que usar exactamente. Tocá solo `web/app/(worker)/**` y `web/components/worker/**`. Se mantienen la PWA y las reglas de "integrable" de la sección 6.1 del PRD. Sin tests de front. Freeze a las 15:00.

## Parte 1 — Copy B2B (branch `feat/d-pivot-copy`, **13:40–14:10**, no depende de nadie)

1. El contador sigue siendo el protagonista y su título pasa a ser "**Lo que ya cobraste de este servicio, segundo a segundo**". Usá el `label` del acuerdo como nombre del servicio y el cliente como subtítulo.
2. Reemplazá sueldo, trabajo, salario o repartidor por **servicio**, **acuerdo** o **cobro**. Por ejemplo, "Retirar lo devengado" pasa a "**Cobrar ahora**".
3. Si hay varios acuerdos, una lista de acuerdos (servicio, cliente, cobrado hasta ahora).
4. Se mantiene el retiro a wallet o a Belo, sin cambios funcionales.
5. Revisá el copy de `actividad` y de `copiloto`: la actividad nueva `fee` **no** se muestra al proveedor, porque la paga el cliente. Filtrala.
6. Mergeá apenas esté: es independiente de B.

## Parte 2 — Estado de fondeo (branch `feat/d-pivot-funding`, **14:10–14:30**, requiere el PR de interfaces de B en `main`)

1. Con `fundingStatus(stream, now)` de `web/lib/domain/funding.ts`:
   - Un chip de estado en cada acuerdo: **Al día**, **Por vencer** o **Atrasado**.
   - Si está **atrasado**, un banner visible arriba del contador: "**<Cliente> está atrasado: te debe $X.** Podés cobrar hasta lo fondeado." (`debt`).
   - "**Fondeado hasta** <fecha>" (`fundedUntil`) en el detalle.
2. Cuando lo devengado alcanza a lo fondeado, el contador **no sigue subiendo lo cobrable**: mostrá lo devengado y lo disponible por separado, para que no parezca que se puede retirar más de lo que hay.

## No hacer

- Propuestas o links: eso es el P1, en `08-P1-propuesta-por-link.md`.
- Mostrar la comisión al proveedor. El proveedor recibe el precio completo.
