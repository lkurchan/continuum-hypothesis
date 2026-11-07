# Plan de acceso a la demo

1. Implementar helpers de credenciales/sesiones y guards con tests.
2. Integrar guard en todas las rutas y Proxy; documentar login/logout y recuperación de sesión vencida para Gio, responsable de UI.
3. Generar credenciales locales, documentar variables y actualizar PRD.
4. Validar lint, tipos, tests, build y smoke HTTP con mock protegido. La UI queda fuera de esta entrega.
5. Configurar secretos en Production, integrar por PR y esperar CI/deployment.
6. Verificar login desplegado, sustituir Vercel All Deployments por Standard Protection y comprobar acceso anónimo/401/login/logout desde el dominio público.

## Entrega de backend

- Sin cambios en páginas ni componentes: la UI corresponde a Gio.
- Lint, tipos, build y 102 tests aprobados; la integración Anvil conserva su job específico del CI.
- `test:auth` aprobado sobre build de producción y mock protegido: todas las APIs rechazan acceso anónimo, páginas redirigen, login/lecturas/top-up mock funcionan con cookie, CSRF rechazado y logout elimina la cookie. `test:api` sigue aprobando el flujo mock original.
- Credenciales locales generadas fuera de Git. Configuración de Production y cambio de protección quedan coordinados con la integración de `/login`, para no interrumpir la demo real actual.

## Continuación de la pantalla de acceso

1. [x] Crear `/login` con el formulario, estado de sesión y logout, reutilizando componentes existentes.
2. [x] Recuperar 401 en llamadas de datos y chat con navegación completa, sin reintentos automáticos.
3. [x] Verificar lint, tipos, build, smoke HTTP y navegación de login/logout en mock protegido. Chrome: clave incorrecta rechazada, clave correcta vuelve al asistente, logout vuelve a exigir acceso.
4. [ ] Integrar por PR, verificar login y chat reales en Vercel sin enviar pagos.
