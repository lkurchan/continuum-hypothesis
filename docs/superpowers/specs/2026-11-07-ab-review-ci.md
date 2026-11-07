# Revisión de A+B y CI

## Alcance

Revisar conjuntamente las branches de contrato y backend en `feat/ab-review-ci`, corregir errores comprobables y ejecutar CI en GitHub. No modificar UI, desplegar, gastar fondos, integrar en main ni cambiar las branches originales. Mantener la interfaz pública y la identidad Git del usuario.

## Revisión

Comprobar permisos, contabilidad de vesting/fondeo/retiros/cancelación, atomicidad de lote, reentrancia, límites numéricos, ABI/eventos, correspondencia de claves y wallets, errores de envío/confirmación y persistencia. Registrar hallazgos y límites aceptados de la demo en un informe del repositorio.

Investigar con pruebas de regresión:

- El servicio no debe rechazar un retiro válido por calcular su saldo con el reloj del servidor; cada gateway valida el disponible con su fuente de tiempo/estado.
- Después de una cancelación confirmada, el registro de actividad debe usar los valores del receipt y no invalidarlos comparándolos con una lectura anterior que puede estar obsoleta.

## CI

Workflow en pull requests, pushes a main y ejecución manual, con permisos de lectura, concurrencia acotada, versiones fijadas de Node/Foundry y actions referenciadas por SHA. No requiere secretos de producción ni RPC externo.

Checks independientes:

1. Web: instalación desde lockfile, lint, typecheck, tests de backend y build.
2. Contratos: instalación de dependencias fijadas, formato, build, tests unitarios/fuzz y verificación de que el ABI versionado coincide con Solidity. Excluir explícitamente el fork remoto.
3. Integración A+B: ejecutar siempre la prueba del gateway con firmas contra Anvil descartable, con artefactos recién compilados. Fallar si faltan artefactos o si Anvil no inicia; no aceptar un test omitido como éxito.
4. Base: ejecutar migraciones y seed en PostgreSQL temporal, con pruebas de atomicidad, precisión, repetición del seed y RLS/permisos.

## Criterios de aceptación

Regresiones demostradas y corregidas, validación local completa, workflow publicado en un PR y primera ejecución remota seguida hasta su conclusión. Verificar que ningún archivo de páginas, componentes, estilos o assets de UI cambió. Cualquier limitación remota debe informarse sin presentar checks pendientes como aprobados.
