# P1 #2 — Propuesta por link con tramo mínimo (solo si el P0 está mergeado a las 14:30)

Lo hace quien termine primero: la parte D y la parte C son chicas y se pueden repartir. Unos 30 minutos en total. **Sin backend, sin tabla y sin rutas nuevas: el link es la propuesta.** Mergear **antes de las 14:45** o se descarta.

---

Contexto: en el pivot B2B (`.plans/pivot-b2b-servicios-spec.md`), el **proveedor propone** el acuerdo y el **cliente acepta** fondeando el primer tramo. Para llegar al freeze lo hacemos con un link que precarga el formulario del cliente.

## Parte D — "Proponer acuerdo" (`web/app/(worker)/worker/proponer/page.tsx`)

1. Formulario con servicio (`label`), cliente (selector de usuarios `payer`), monto total del período, inicio, fin y primer tramo sugerido.
2. **Tramo mínimo para arrancar:** un campo "Cobertura mínima antes de empezar" en días (default 7). El primer tramo mínimo se calcula como `total * días / duración_en_días` y el primer tramo sugerido no puede ser menor. Es la versión liviana de "pedir el depósito antes de entregar", sin tocar el contrato.
3. Si el P1 #1 está mergeado, al elegir el cliente se muestra su `ReputationCard`.
4. Genera `/payer/nuevo?provider=<workerId>&label=<…>&total=<…>&start=<unix>&end=<unix>&first=<…>&minFirst=<…>`, todo URL-encoded.
5. Botón "Copiar link" y un **QR** del link, para la demo. Si no hay librería de QR instalada, solo el botón de copiar.
6. Agregá el acceso desde la home del proveedor.

## Parte C — Aceptar desde el link (`web/app/(payer)/payer/nuevo/page.tsx`)

1. Si vienen query params, precargá el formulario y mostrá un encabezado "**<Proveedor> te propone un acuerdo de servicio**".
2. El botón principal pasa a ser "**Aceptar y fondear primer tramo**", con el desglose de la comisión del 0,05%, y usa el mismo flujo de creación de hoy.
3. Si viene `minFirst`, mostrá "El proveedor pide cubrir al menos N días antes de arrancar" y bloqueá un primer tramo menor a `minFirst`.
3. Los campos siguen siendo editables, porque es una demo.
