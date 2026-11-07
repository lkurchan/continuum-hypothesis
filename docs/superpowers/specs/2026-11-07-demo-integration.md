# Integración de la demo — revisión de PR #5 y #6

## Alcance

Integrar las herramientas de backend con las pantallas C/D, conservando ambos grupos de tests. Corregir los defectos de integración antes del merge; no rediseñar pantallas.

- Actualizar streams y actividad cada cinco segundos mientras la página está visible, al volver a ella y después de una operación. Evitar solicitudes periódicas superpuestas y resultados de efectos desmontados.
- En un retiro repartido, mostrar el monto confirmado, el monto solicitado y cualquier fallo posterior. Nunca reintentar pagos automáticamente.
- Mantener seleccionado el pago operado aunque cambie el orden de la lista al cancelar; su comprobante debe seguir visible.
- Los escenarios prefijados de `/lab` solo se habilitan cuando la API confirmó `mock`. En `real` las vistas se mantienen disponibles, y las operaciones se hacen desde los formularios habituales con montos explícitos.
- Rechazar mensajes de chat nulos, primitivos o arrays con HTTP 400; conservar errores sanitizados y el 503 cuando falta configuración del proveedor.

## Validación

Lint, tipos, tests de dominio/API/scripts, build y smoke HTTP mock. Ensayo de creación, recarga, retiro y cancelación desde Chrome en mock. Tras los merges, verificar el deployment de Production, las pantallas y las lecturas reales; conservar la protección de Vercel. No repetir las transacciones reales documentadas en B6.
