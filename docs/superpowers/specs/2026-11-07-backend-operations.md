# Backend — preparación de la demo real

## Alcance

Agregar herramientas operativas reproducibles para configurar y comprobar B6, sin modificar UI ni interfaces públicas. Usar `web/.env.local` con las mismas reglas de carga de Next.js; nunca imprimir claves, tokens, URLs privadas del RPC ni errores crudos de proveedores. No versionar los archivos de entorno.

## Operaciones

- Diagnóstico solo lectura: configuración, cadena 42161, código del contrato, interfaz de streams, ARGt/decimales, claves válidas y distintas, balances de gas/token, tablas y RPC de Supabase, usuarios y correspondencia de wallets. Mostrar cada bloqueo por separado; una falla no debe ocultar los demás resultados. La clave pública de Supabase no es necesaria para el backend server-side.
- Sincronización de wallets demo: derivar direcciones de las claves locales; mostrar un plan por defecto y aplicar solo con una opción explícita. Actualizar exclusivamente los tres usuarios demo existentes, con rol esperado, y únicamente si su dirección es cero o ya coincide. No sobrescribir wallets ajenas ni direcciones Belo.
- Seed por API: leer usuarios/streams/actividad, preparar un lote parametrizado por montos y duración, mostrarlo por defecto y enviar solo con una opción explícita. Validar el modo reportado por la API, evitar duplicar seeds activos y guardar un journal local antes de enviar. Un resultado ambiguo no permite repetir automáticamente. Confirmar que los IDs y actividades aparezcan en las lecturas de API posteriores.
- Smoke HTTP reproducible: servidor de producción mock aislado, flujo crear/fondear/retirar/cancelar/retirar remanente y comprobación de actividad. Nunca usar las claves ni servicios reales aunque existan `.env.local`.
- Verificación HTTP del modo real sin transacciones: consultar usuarios, streams e historial para las tres identidades; comprobar correspondencia con las wallets locales, aislamiento por participante y ausencia de campos privados. La herramienta solo hace GET y no cambia `.env.local`. Preparar además el seed con dry-run sobre esa misma API.

La preparación no envía transferencias mainnet. Una vez confirmado el fondeo y solicitada la continuación de B6, ejecutar el flujo acotado descrito abajo mediante la API y conservar evidencia. El modo real necesita Supabase configurado y ARGt/gas; informar lo pendiente con evidencia. Las lecturas remotas y la configuración del proyecto demo solicitado sí forman parte del trabajo.

## Ejecución B6 autorizada tras el fondeo

El usuario indicó que llegó ARGt y pidió avanzar con el trabajo pendiente. Comprobar token/red, balances, contrato, usuarios y ausencia de seeds anteriores antes de enviar. Lote previsto: dos streams de total 10 ARGt y depósito inicial 1 ARGt por trabajador, duración 900 segundos. Top-up de 0,2 ARGt al primer stream, retiro de 0,1 ARGt a la wallet de worker1, cancelación del primer stream y retiro de su remanente. Fondeo agregado máximo 2,2 ARGt; el gas se paga con el ETH demo. No enviar a Belo ni a destinatarios ajenos a las wallets demo.

Registrar en un journal local cada mutación como pendiente antes de enviarla, y guardar hash/receipt/resultado al confirmarse. Si queda un envío ambiguo, detenerse para consultar la chain; nunca repetirlo automáticamente. Verificar eventos, montos, balances, metadata/historial para ambos participantes y aislamiento del otro trabajador. Conservar evidencia pública de los hashes en el README y un informe B6; no guardar claves ni URLs RPC privadas. Validar la configuración de Vercel y entregar instrucciones para el integrante del equipo que realizará el despliegue.

## Despliegue Vercel autorizado

Crear el proyecto del repositorio en la cuenta del usuario, inicialmente en mock; proteger todos los deployments antes de activar las wallets reales. El usuario autorizó cargar RPC, clave de servidor de Supabase y tres claves demo desde el entorno local a Production, activar `CHAIN_MODE=real` y redesplegar. Preview conserva mock sin claves reales. Usar Node 24 y duración máxima de 300 segundos. Comprobar el rechazo de consultas sin sesión y las siete lecturas autenticadas, contrastando metadata/montos/hashes con B6. No enviar pagos, integrar PRs ni modificar UI como parte de esta validación. Registrar el deployment y los pendientes de integración.

## Validación

Tests de herramientas para configuración inválida, aislamiento de secretos, cadena/token incorrectos, usuarios y wallets incompatibles, dry-run sin escrituras, montos exactos, negativa a duplicados y journals pendientes, y verificación posterior del seed. Ejecutar lint/tipos/build, tests existentes, smoke HTTP y CI remoto. Mantener git limpio y publicar PR, sin merge a main.
