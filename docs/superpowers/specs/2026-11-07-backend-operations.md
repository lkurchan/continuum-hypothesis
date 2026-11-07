# Backend — preparación de la demo real

## Alcance

Agregar herramientas operativas reproducibles para configurar y comprobar B6, sin modificar UI ni interfaces públicas. Usar `web/.env.local` con las mismas reglas de carga de Next.js; nunca imprimir claves, tokens, URLs privadas del RPC ni errores crudos de proveedores. No versionar los archivos de entorno.

## Operaciones

- Diagnóstico solo lectura: configuración, cadena 42161, código del contrato, interfaz de streams, ARGt/decimales, claves válidas y distintas, balances de gas/token, tablas y RPC de Supabase, usuarios y correspondencia de wallets. Mostrar cada bloqueo por separado; una falla no debe ocultar los demás resultados. La clave pública de Supabase no es necesaria para el backend server-side.
- Sincronización de wallets demo: derivar direcciones de las claves locales; mostrar un plan por defecto y aplicar solo con una opción explícita. Actualizar exclusivamente los tres usuarios demo existentes, con rol esperado, y únicamente si su dirección es cero o ya coincide. No sobrescribir wallets ajenas ni direcciones Belo.
- Seed por API: leer usuarios/streams/actividad, preparar un lote parametrizado por montos y duración, mostrarlo por defecto y enviar solo con una opción explícita. Validar el modo reportado por la API, evitar duplicar seeds activos y guardar un journal local antes de enviar. Un resultado ambiguo no permite repetir automáticamente. Confirmar que los IDs y actividades aparezcan en las lecturas de API posteriores.
- Smoke HTTP reproducible: servidor de producción mock aislado, flujo crear/fondear/retirar/cancelar/retirar remanente y comprobación de actividad. Nunca usar las claves ni servicios reales aunque existan `.env.local`.
- Verificación HTTP del modo real sin transacciones: consultar usuarios, streams e historial para las tres identidades; comprobar correspondencia con las wallets locales, aislamiento por participante y ausencia de campos privados. La herramienta solo hace GET y no cambia `.env.local`. Preparar además el seed con dry-run sobre esa misma API.

No ejecutar transferencias mainnet durante la preparación. El modo real necesita Supabase configurado y ARGt/gas; informar lo pendiente con evidencia. Las lecturas remotas y la configuración del proyecto demo solicitado sí forman parte del trabajo.

## Validación

Tests de herramientas para configuración inválida, aislamiento de secretos, cadena/token incorrectos, usuarios y wallets incompatibles, dry-run sin escrituras, montos exactos, negativa a duplicados y journals pendientes, y verificación posterior del seed. Ejecutar lint/tipos/build, tests existentes, smoke HTTP y CI remoto. Mantener git limpio y publicar PR, sin merge a main.
