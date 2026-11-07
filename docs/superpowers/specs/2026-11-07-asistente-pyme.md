# Asistente del cliente y migración del asistente a OpenAI — módulos C y D

Se alinea con el pivot B2B (`.plans/pivot-b2b-servicios-spec.md` §6 "IA" y el glosario de `.plans/pivot-b2b/00-README.md`): `payer` se muestra como **Cliente**, `worker` como **Proveedor** y el stream como **Acuerdo de servicio**.

## Objetivo y alcance

Sumar un asistente de IA para la **empresa cliente** (una PyME que contrata servicios) en `/payer/asistente`. Responde sobre la cobertura del fondeo y el resumen del período, y **propone acuerdos de servicio** a partir de lenguaje natural. El cliente confirma cada propuesta en una tarjeta y recién ahí se ejecuta con la ruta existente `POST /api/streams`, que devuelve el hash. La IA nunca mueve plata por su cuenta.

En el mismo cambio, el copiloto del proveedor (`/worker/copiloto`) pasa de Claude a **OpenAI**, para tener un solo SDK y una sola key. Su prompt y su contexto no cambian: los adapta el P1 #3 del pivot.

Se tocan `web/lib/agent/**`, `web/app/api/agent/**`, `web/app/(payer)/payer/asistente/**`, `web/components/payer/{PayerHeader,ProposalCard}.tsx`, `web/components/ui/chat.tsx`, `web/app/(worker)/worker/copiloto/page.tsx` (pasa a usar el chat compartido), `web/package.json`, `web/.env.example` y la documentación que nombraba a Claude. No se cambian los tipos compartidos, `StreamGateway` ni las rutas de B.

## Usos

| Uso | Ejemplo | Cómo se resuelve |
|---|---|---|
| Cobertura del fondeo | "¿Hasta cuándo tengo cubierto cada acuerdo?" / "¿Cuánto fondeo para cubrir hasta el viernes?" | Texto. Los números salen del snapshot del servidor |
| Resumen del período | "Resumen del período" | Texto: devengado, cobrado por los proveedores, falta devengar y falta fondear, y los movimientos con su hash |
| Acuerdo en lenguaje natural | "Contratá a Ana por $300.000 la semana, primer tramo 50 %" | Tool `proponer_acuerdo` → tarjeta → **Confirmar y fondear** → `POST /api/streams` → hash |

Fuera de alcance: tramos o cancelaciones propuestos por la IA (se hacen desde el Panel) y ejecución sin confirmación.

## Contexto (`payerSnapshot` en `lib/agent/context.ts`)

Es texto plano calculado en el servidor con `vestedAt` y `statusAt`. El modelo no calcula saldos. Incluye:

- Cliente, fecha y hora (Buenos Aires).
- **Proveedores disponibles** con su `id`, para que el tool use ids reales.
- Por cada acuerdo: proveedor, servicio (`label`), estado, período, precio y ritmo diario, devengado, fondeado, retirado, falta fondear y la cobertura: "al día, cubierto hasta X", "ATRASADO: le debe $Y", completo o cancelado.
- Totales del período y los últimos 10 movimientos con su hash.

La cobertura se calcula con la fórmula de `fundingStatus` del pivot (`fundedUntil = start + deposited/total × (end − start)`). Cuando B mergee `lib/domain/funding.ts`, se reemplaza por esa función (está marcado con `ponytail:`).

## Tool `proponer_acuerdo`

Function tool con `strict: true`: `{ items: [{ workerId, totalAmount (entero) }], period: 900|3600|86400|604800|2592000, fundPercent: 25|50|100 }`. Usa las mismas opciones que `/payer/nuevo`.

`toProposal()` (`lib/agent/proposal.ts`) valida que cada proveedor exista con rol `worker`, que no esté repetido, que haya entre 1 y 100 ítems y que los montos sean enteros positivos. Calcula `initialDeposit = floor(total × fundPercent / 100)`. Además, cada precio tiene que figurar en lo que escribió el usuario (`amountsIn` reconoce "300.000", "300 mil", "300k" y "1,5 millones"). Si el precio es 0 o no figura, el chat pregunta "¿Cuál es el precio total en pesos del acuerdo con X?", porque el modelo barato tiende a inventarlo. Con cualquier otra falla de validación, el chat muestra "No pude armar la propuesta: <motivo>". No se hace un segundo turno con el modelo.

## Protocolo del stream

`POST /api/agent/chat` mantiene el body `{ userId, messages }` y la respuesta `text/plain` con streaming. Elige el prompt y el snapshot según el rol, y el tool solo se ofrece al cliente. Si hay propuesta, al final del texto se agrega `\u001e` seguido del JSON `{ items: [{ workerId, name, totalAmount, initialDeposit }], period }`. `useChat` (`components/ui/chat.tsx`) separa la respuesta en ese carácter.

## Proveedor

- SDK `openai` con Chat Completions en streaming. Se quitó `@anthropic-ai/sdk`. Para el cliente se pasa `reasoning_effort: "none"`, porque los modelos con razonamiento (por ejemplo `gpt-6-luna`, el elegido) rechazan function tools en Chat Completions.
- `OPENAI_API_KEY` y `OPENAI_MODEL`. Si falta alguna, la ruta responde 503 y la UI muestra el mensaje. El modelo va en una variable para poder cambiarlo en Vercel sin commitear.
- Si hay rate limit o un error 5xx, el mensaje es "El asistente está con mucha demanda…".

## Prompt (`PAYER_SYSTEM`)

- Español rioplatense con voseo, en tono profesional y breve. Usa el vocabulario del glosario y nunca "sueldo" ni "trabajador".
- Solo usa los números del snapshot. Si falta el proveedor o el monto, pregunta. Si falta la duración o el tramo, usa 1 semana y 50 % y lo dice.
- Después de proponer, dice qué propuso y que hay que confirmarlo en la tarjeta. Nunca dice "ya se pagó".
- Límites: ARGt es un medio de pago sin rendimiento (no habla de inversión, vaults, intereses ni APY), Continuum no es crédito ni adelanto, y no da asesoramiento impositivo, contable ni legal.

## UI

- `/payer/asistente`: chat de escritorio (máximo 760 px) con tres sugerencias. Las burbujas son las del copiloto, movidas a `components/ui/chat.tsx`.
- `ProposalCard`: una fila por proveedor (total y primer tramo), la duración, "Fondeás ahora" y "Precio total", y los botones **Confirmar y fondear** y Descartar. Al confirmar llama a `api.create` con `start = now` y muestra el `Hash` y el link al Panel. Solo se ejecuta una vez.
- Nueva pestaña "Asistente" en `PayerHeader`.
- La comisión del 0,05% del pivot no se muestra en la tarjeta todavía. Se suma cuando B mergee `fees.ts`.

## Salida de emergencia

Si OpenAI falla en vivo, el mismo acuerdo se crea desde `/payer/nuevo` y la cobertura se ve en el Panel.

## Criterios de aceptación

1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde.
2. Tests: `payerSnapshot` (ids de proveedores, "cubierto hasta", "ATRASADO" y rechazo de un proveedor), `toProposal` (mapeo, `floor` y rechazos) y la ruta (503 para el cliente sin key y 404 para un usuario inexistente).
3. Con `CHAIN_MODE=mock` y la key cargada, como cliente: preguntar la cobertura, pedir el acuerdo de la sugerencia, confirmar la tarjeta y verlo en el Panel.
4. El copiloto del proveedor sigue respondiendo, ahora con OpenAI.

## Revisión de integración con el login

El chat mantiene la sesión de operador y el control de origen antes de acceder al backend o a OpenAI. La ruta de reputación integrada en paralelo también valida la sesión dentro de su handler. El login admite `/payer/asistente` como destino interno.

Las pruebas de streaming usan un proveedor simulado: texto para ambos roles, argumentos de herramienta fragmentados, propuesta válida sin movimientos de fondos, precio inventado y errores del proveedor sin filtrar detalles. Si el modelo escribió texto pero la propuesta necesita un precio, se agrega siempre la pregunta de aclaración; no se oculta por haber enviado texto previamente.

## Diagnóstico del proveedor

Los errores de OpenAI se registran solo con nombre, estado HTTP, código y request id. No se registran claves, prompts, mensajes ni cuerpos de error. Las variables de proveedor se normalizan quitando espacios y saltos de línea exteriores, frecuentes al pegarlas en el deploy. La respuesta al usuario conserva el error seguro.

## Consultas sin propuestas

Si el último mensaje pide explícitamente no proponer/crear/armar/generar acuerdos, o consultar sin propuestas, el servidor fuerza `tool_choice: none`. También descarta cualquier tool-call inesperado en esa respuesta. Se aplica al último mensaje para que una consulta posterior pueda volver a solicitar una propuesta. Un pedido de no ejecutar pagos no desactiva por sí solo las propuestas: estas nunca ejecutan pagos.
