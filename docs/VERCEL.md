# Despliegue de la demo en Vercel

Proyecto desplegado en [continuum-hypothesis.vercel.app](https://continuum-hypothesis.vercel.app), con acceso mediante Vercel Authentication. Se reutilizan la base, el contrato y las wallets existentes; no crear otro proyecto Supabase ni volver a ejecutar migraciones sobre las tablas actuales.

## Migración al login de la app

El backend del acceso propio está definido en [DEMO-LOGIN.md](DEMO-LOGIN.md). Antes de desplegarlo en modo real, configurar `DEMO_AUTH_PASSWORD_HASH` y `DEMO_AUTH_SECRET` como secretos de Production y coordinar la pantalla `/login` con Gio. Sin configuración, el nuevo backend bloquea los datos y pagos con 503. Mantener **All Deployments** hasta integrar/probar la pantalla. Después se puede usar **Standard Protection**, manteniendo protegidos los previews y los deployments históricos sin este guard. El procedimiento y los endpoints están en la guía de login. La evidencia siguiente corresponde al despliegue anterior al login.

## Estado verificado el 7/11/2026, 12:41 ART

- Proyecto `continuum-hypothesis`, equipo `lkurchans-projects`, conectado al repositorio GitHub.
- [Deployment real](https://vercel.com/lkurchans-projects/continuum-hypothesis/2QgaGWNufE4av7h5dvdk2Vs6n2at) **Ready**, basado en `main`, commit `a943c5652c24422af2ec8d77aac886f9b1bf656c`.
- Root Directory `web`, Next.js, Node **24.x**, instalación `npm ci`, build `npm run build`, Fluid habilitado y duración máxima **300 segundos**.
- **Production: `CHAIN_MODE=real`**, RPC, contrato, token, Supabase y las tres wallets demo. **Preview: `CHAIN_MODE=mock`**, sin claves reales.
- Vercel Authentication con **All Deployments**. Las consultas sin cookies a `/` y `/api/users` devolvieron HTTP 302 al acceso de Vercel, sin entregar datos.
- Con la sesión autorizada, siete lecturas de API verificaron usuarios/wallets, metadata e historial: plataforma 2 streams/6 actividades; worker1 1/5; worker2 1/1. Los seis montos y los cinco hashes coinciden con B6, incluido el retiro del remanente. No se enviaron mutaciones ni pagos desde Vercel.

La UI de #5 y las herramientas/docs de #6 todavía no estaban integradas en ese commit. El despliegue valida el backend real; la presentación completa requiere integrar los PR previstos y comprobar el deployment que resulte. La evidencia local quedó en `web/.operations/vercel-verification.json`, ignorada por Git.

## Importación

1. En Vercel, **Add New → Project → Import Git Repository**, elegir `lkurchan/continuum-hypothesis`.
2. Project name: `continuum-hypothesis` (o un nombre disponible para otra instalación), framework **Next.js**, Root Directory **`web`**.
3. Node.js **24.x**, Install Command **`npm ci`**, Build Command **`npm run build`**, Output Directory automático.
4. Production Branch **`main`**. Integrar mediante PR los cambios de UI y backend que se quieran mostrar antes del despliegue final. El 7/11, las entregas pendientes son [PR #5](https://github.com/lkurchan/continuum-hypothesis/pull/5) y [PR #6](https://github.com/lkurchan/continuum-hypothesis/pull/6). Un Preview de #6 sirve para comprobar la API y no contiene la UI de #5.

Vercel soporta [Node.js 24](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), la versión fijada en `web/package.json`.

## Acceso antes de activar fondos reales

La API firma con wallets custodiales demo y permite elegir la identidad mediante `userId`; no tiene autenticación propia. Antes de cargar las claves reales, abrir **Settings → Deployment Protection**, activar **Vercel Authentication** y seleccionar **All Deployments**, incluyendo el dominio de producción. Comprobar desde una ventana privada sin sesión que `/api/users` pide acceso antes de devolver JSON.

**Standard Protection deja públicos los dominios de producción.** All Deployments protege también esos dominios y está disponible en todos los planes según la [documentación de protección de Vercel](https://vercel.com/docs/deployment-protection). Si la cuenta no ofrece esa opción, mantener el modo real exclusivamente en un Preview protegido y no cargar claves reales en Production.

Dar acceso al operador de la demo mediante su cuenta o un enlace compartido de Vercel reservado para el equipo. No publicar ese enlace de acceso en el README: permite llegar a los endpoints que firman. La URL pública para el jurado y la protección deben coordinarse antes de la entrega. Para acceso público con fondos reales hace falta agregar autenticación/autorización de servidor.

## Variables

Configurar las variables reales **solo en Production**. Mantener `CHAIN_MODE=mock` en Preview y no asignarle las claves reales. Cargar los valores desde `web/.env.local` o el gestor seguro del equipo, nunca desde el chat, un commit o una captura de claves.

| Variable | Valor / origen |
|---|---|
| `CHAIN_MODE` | `real` |
| `ARBITRUM_RPC_URL` | El RPC de Arbitrum One ya validado en `.env.local` |
| `STREAMS_CONTRACT_ADDRESS` | `0xB98D30CC1e8D234A6234569848366fE30F3fF799` |
| `ARGT_ADDRESS` | `0x59863989d080B22476DB95656d0C3CC18be92214` |
| `DEMO_PK_PLATFORM` | Clave existente del pagador, exclusivamente servidor |
| `DEMO_PK_WORKER1` | Clave existente de worker1, exclusivamente servidor |
| `DEMO_PK_WORKER2` | Clave existente de worker2, exclusivamente servidor |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase existente |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` o `sb_secret_...` del mismo proyecto, exclusivamente servidor |

Guardar `NEXT_PUBLIC_SUPABASE_URL` como **Config**: Vercel rechaza variables con prefijo público marcadas como Secret. Guardar las claves y el RPC como **Secret**. Las nueve variables de la tabla están configuradas en Production; la URL pública es Config y las otras ocho son Secret. Si una importación falla parcialmente, revisar la lista antes de repetirla: algunas variables pueden haberse guardado.

La clave pública `NEXT_PUBLIC_SUPABASE_ANON_KEY` no es necesaria para estas rutas. `DEPLOYER_PK` y `ARBISCAN_API_KEY` son para contratos, no para el deploy web. `OPENAI_API_KEY` y `OPENAI_MODEL` habilitan el asistente. Ninguna clave privada ni la clave de servidor de Supabase lleva prefijo `NEXT_PUBLIC_`.

Mantener **Fluid compute** habilitado y duración de Functions de **300 segundos**. Las operaciones pueden esperar aprobación ERC-20 y receipt antes de responder. Con Fluid, 300 segundos es el valor predeterminado documentado para todos los planes; revisar que el proyecto no lo haya reducido. Ver [duración de Functions](https://vercel.com/docs/functions/configuring-functions/duration).

## Deploy y comprobación

1. Hacer Deploy/Redeploy después de guardar las variables. Un deployment anterior conserva su configuración; ver [variables de entorno de Vercel](https://vercel.com/docs/environment-variables).
2. Confirmar que el commit desplegado incluye los PR previstos y que el build terminó correctamente.
3. Con acceso autorizado, abrir `/api/users`: deben aparecer `platform`, `worker1`, `worker2`, con sus wallets y sin claves. La respuesta lleva `X-Chain-Mode: real`.
4. Consultar `/api/streams?userId=platform` y `/api/activity?userId=platform`. Deben reflejar los streams y hashes de [B6](B6.md). Repetir para worker1 y worker2; cada trabajador ve únicamente sus streams.
5. Entregar al equipo la URL y el commit desplegado. Conservar Deployment Protection activado para las comprobaciones; no desactivarlo para facilitar una consulta automatizada.

Estas comprobaciones son de lectura. No ejecutar nuevamente el seed de B6 ni reemplazar sus journals para probar el deploy. Para otra demostración, preparar un lote nuevo con horario y presupuesto explícitos. Los streams de B6 duran 15 minutos y el de worker1 queda cancelado deliberadamente.

El mock en memoria funciona como alternativa local con `CHAIN_MODE=mock`; distintas instancias serverless no comparten su estado. Durante la demo real, hacer las mutaciones de a una: el bloqueo de wallets es por proceso, no distribuido.
