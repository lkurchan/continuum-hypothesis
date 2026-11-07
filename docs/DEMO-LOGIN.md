# Backend del login demo — integración de UI

Acceso de operador mediante una clave compartida del equipo. Una sesión permite usar los tres usuarios demo y realizar pagos reales. No hay cuentas individuales ni registro. Las wallets continúan exclusivamente en servidor.

## Contrato del login

Todas las llamadas usan el mismo origen y cookies normales de `fetch` (no guardar tokens en localStorage).

| Método y ruta | Entrada | Resultado |
|---|---|---|
| `POST /api/auth/login` | JSON `{ "password": "clave", "next": "/worker" }`, `Content-Type: application/json` | 200 `{ "next": "/worker" }` y cookie HttpOnly. Navegar con `window.location.assign(result.next)` para descartar estado previo |
| `GET /api/auth/session` | Sin body | 200 `{ "required": true, "authenticated": true/false }`; en mock sin claves `required` es false |
| `POST /api/auth/logout` | Sin body | 200 `{ "loggedOut": true }` y cookie vencida. Navegar completamente a `/login` y limpiar estado de datos de la UI |

`/login` es público y contiene el formulario de acceso. Proxy redirige allí páginas privadas con `?next=/ruta`. La pantalla pasa ese `next` al login; el backend solo acepta rutas internas conocidas. No hay redirecciones a URLs externas. Con sesión vigente, `/login` ofrece continuar o cerrar sesión. Las llamadas de datos y chat vuelven al login ante un 401 sin repetir la operación.

Errores JSON `{ "error": "mensaje" }`: 401 clave incorrecta/sesión ausente, 403 origen inválido, 400 entrada inválida, 413 cuerpo excesivo, 429 demasiados intentos (Retry-After 300), 503 configuración incompleta. Si cualquier API de la app devuelve 401, llevar al login sin reintentar la operación de pago. Un 503 no equivale a una operación fallida: conservar el manejo existente de transacciones confirmadas con errores de historial.

Los formularios de login/logout y las mutaciones con sesión requieren `Origin` igual al origen de la URL. El navegador lo envía automáticamente. Para herramientas CLI enviar ese header y la cookie; **no** existe un bypass de API con las claves de wallets o de Supabase.

## Configuración

1. Ejecutar `node web/scripts/setup-demo-auth.mjs`. Genera una clave aleatoria de 192 bits, hash scrypt con salt y secreto HS256 independiente en `web/.operations/demo-auth.json`, con permisos 0600. No sobrescribe una configuración existente.
2. Guardar las dos entradas de `configuration` en Vercel **Production**, como Secret, sin prefijo público. Para probar mock protegido, pasar esas dos variables al proceso local.
3. Compartir únicamente `password` con el operador mediante un canal privado; no el objeto `configuration` ni el archivo completo. No pegar secretos en Git, capturas o logs.
4. La sesión dura 8 horas. Cookie HttpOnly, SameSite=Strict, Secure en HTTPS, Path=/ y sin Domain. Logout borra la cookie del navegador. Rotar hash/secreto y redesplegar revoca sesiones anteriores; cambiar el hash también invalida la versión guardada en cada sesión. Una cookie copiada antes del logout sigue siendo válida hasta expirar o rotar (sesiones sin almacenamiento central).

En `real`, faltar una variable o tener formato inválido **bloquea** páginas privadas y APIs con 503. En `mock` sin ambas variables sigue funcionando el ensayo local sin login. El límite de intentos es adicional y por proceso; no es distribuido. Usar la clave generada, no reemplazarla por un PIN o una palabra común.

## Paso a dominio público

La pantalla y el backend están integrados. **Mantener Vercel Authentication / All Deployments hasta configurar las dos variables y probar el acceso de la app.** El modo real sin esos valores bloquea datos y pagos con 503.

Después de las pruebas, seleccionar **Standard Protection**: el dominio de producción puede abrirse sin Vercel y la app exige su propia sesión. Los previews y URLs de deployments antiguos deben seguir protegidos porque los antiguos no incluyen este guard. No desactivar toda la protección del proyecto.

Verificar anónimamente: `/login` carga, `/api/users` devuelve 401, POST de pagos devuelve 401 sin enviar transacciones, una clave incorrecta no genera cookie, y el login correcto habilita lecturas. Probar logout y expirar/manipular la cookie. No enviar pagos reales para probar autenticación.

La autorización se valida en cada handler además de Proxy, siguiendo la [guía de autenticación de Next.js](https://nextjs.org/docs/app/guides/authentication). El alcance de Standard Protection está documentado en [Vercel](https://vercel.com/docs/deployment-protection).
