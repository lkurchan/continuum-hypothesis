# Acceso privado a la demo

## Objetivo

Acceder a la demo real desde el dominio de producción sin una cuenta de Vercel. Una clave compartida de alta entropía autoriza al operador a usar los tres usuarios demo; no es un sistema de cuentas individuales ni signup.

Esta entrega implementa solo el backend y Proxy. Gio implementa `/login`, logout y manejo de 401 en la UI. No retirar Vercel Authentication hasta integrar y probar esa pantalla.

## Reglas

- `/login` solicita la clave. El servidor verifica un hash scrypt y entrega una sesión firmada HS256 de 8 horas, en cookie HttpOnly, SameSite=Strict, Secure en HTTPS y sin Domain.
- `DEMO_AUTH_PASSWORD_HASH` y `DEMO_AUTH_SECRET` son exclusivos del servidor. Un generador crea clave aleatoria, hash con salt y secreto de sesión independientes, guardados localmente fuera de Git. Rotar ambos invalida las sesiones.
- En `real`, configuración ausente o inválida devuelve 503 y nunca accede a las wallets. Mock local sin configuración conserva el ensayo actual; con configuración también exige login.
- Proxy redirige páginas al login. Cada handler de datos/pagos/agente/lab verifica además la sesión; no se confía únicamente en Proxy. Las mutaciones autenticadas exigen Origin del mismo origen. El login aplica límites de tamaño y un límite de intentos por proceso como defensa adicional, sin prometer un límite distribuido.
- APIs sin sesión responden 401 JSON y no ejecutan backend; las rutas de sesión no revelan datos de usuarios. Logout borra la cookie; redirecciones posteriores limitadas a rutas internas conocidas.
- Mantener All Deployments hasta desplegar y verificar el login. Luego usar Standard Protection para hacer público únicamente el dominio de producción; mantener protegidos Preview y deployments históricos que no tienen este login.

## Validación

Tests de sesión válida, inválida, expirada, firma/rol incorrectos, cookie segura, CSRF, hash inválido, real sin configuración y bloqueo de todas las rutas de pagos antes de llamar al backend. Smoke HTTP del build: acceso anónimo bloqueado, clave incorrecta, login, lectura autorizada y logout. Chrome: login/logout y acceso al selector. En Production solo lecturas; no enviar pagos para validar autenticación.
