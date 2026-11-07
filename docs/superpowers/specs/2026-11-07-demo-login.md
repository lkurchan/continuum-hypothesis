# Acceso privado a la demo

## Objetivo

Acceder a la demo real desde el dominio de producción sin una cuenta de Vercel. Una clave compartida de alta entropía autoriza al operador a usar los tres usuarios demo; no es un sistema de cuentas individuales ni signup.

El backend y Proxy se integraron primero. La continuación incorpora `/login`, logout y recuperación de sesión vencida, reutilizando los estilos existentes. No retirar Vercel Authentication hasta integrar y probar esa pantalla.

## Reglas

- `/login` solicita la clave. El servidor verifica un hash scrypt y entrega una sesión firmada HS256 de 8 horas, en cookie HttpOnly, SameSite=Strict, Secure en HTTPS y sin Domain.
- `DEMO_AUTH_PASSWORD_HASH` y `DEMO_AUTH_SECRET` son exclusivos del servidor. Un generador crea clave aleatoria, hash con salt y secreto de sesión independientes, guardados localmente fuera de Git. Rotar ambos invalida las sesiones.
- En `real`, configuración ausente o inválida devuelve 503 y nunca accede a las wallets. Mock local sin configuración conserva el ensayo actual; con configuración también exige login.
- Proxy redirige páginas al login. Cada handler de datos/pagos/agente/lab verifica además la sesión; no se confía únicamente en Proxy. Las mutaciones autenticadas exigen Origin del mismo origen. El login aplica límites de tamaño y un límite de intentos por proceso como defensa adicional, sin prometer un límite distribuido.
- APIs sin sesión responden 401 JSON y no ejecutan backend; las rutas de sesión no revelan datos de usuarios. Logout borra la cookie; redirecciones posteriores limitadas a rutas internas conocidas.
- Mantener All Deployments hasta desplegar y verificar el login. Luego usar Standard Protection para hacer público únicamente el dominio de producción; mantener protegidos Preview y deployments históricos que no tienen este login.

## Validación

Tests de sesión válida, inválida, expirada, firma/rol incorrectos, cookie segura, CSRF, hash inválido, real sin configuración y bloqueo de todas las rutas de pagos antes de llamar al backend. Smoke HTTP del build: acceso anónimo bloqueado, clave incorrecta, login, lectura autorizada y logout. Chrome: login/logout y acceso al selector. En Production solo lecturas; no enviar pagos para validar autenticación.

## Pantalla de acceso

`/login` es pública y solicita la clave del equipo mediante un campo password. Lee el estado de sesión y muestra errores de configuración, clave incorrecta y límite de intentos. Envía JSON al endpoint existente, sin persistir la clave ni la sesión en almacenamiento del navegador. Tras el login navega completamente al destino interno validado por el servidor.

Con sesión vigente ofrece continuar y cerrar sesión. Logout elimina la cookie y navega a `/login`, descartando estado de la página. Las APIs de datos y el chat redirigen al login cuando reciben 401; no reintentan pagos ni mensajes. El resto de las pantallas conserva su diseño.

## Acceso público solicitado por el usuario

La instrucción posterior del usuario elimina la clave inicial y permite entrar a toda la demo con las operaciones actuales. Este modo se activa explícitamente con `DEMO_ACCESS=public` en producción y local. Reemplaza el requisito de sesión en ese entorno; no requiere ni genera cookies de operador. Las claves de wallets siguen exclusivamente en el servidor.

- El resto de los entornos conserva el acceso privado por defecto y falla cerrado si falta su configuración.
- En modo público, Proxy y cada handler permiten lecturas sin sesión, pero las mutaciones siguen exigiendo Origin del mismo sitio. No se alteran límites de saldo, propiedad de streams ni validación de destinos. El modo público permite a cualquier visitante operar las identidades demo.
- `/api/auth/session` indica que no se requiere login; `/login` redirige al destino interno validado o a `/demo`.
- Mantener las variables de autenticación para poder volver a modo privado. No cambiar la protección de previews de Vercel.
- Publicar y verificar rutas y lecturas sin cookies. Las verificaciones no deben enviar transacciones reales.
