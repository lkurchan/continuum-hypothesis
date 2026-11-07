# Plan — herramientas de backend

1. Inspeccionar configuración y dependencias sin revelar secretos; identificar bloqueos reales.
2. Implementar diagnóstico y sincronización conservadora de wallets con pruebas.
3. Implementar seed vía API con dry-run, journal y verificación de historial.
4. Agregar smoke HTTP en mock y ejecutarlo en CI.
5. Ejecutar diagnóstico sobre la configuración disponible y completar la preparación remota autorizada cuando exista Supabase.
6. Actualizar README y guía B6 con comandos, deployment confirmado y pendientes concretos.
7. Validar, publicar PR y seguir CI hasta su resultado.
8. Al recibir Supabase: validar tablas/RPC, aplicar wallets de forma idempotente, verificar lecturas HTTP reales y preparar el seed sin enviar fondos; registrar evidencia y bloqueos restantes.
9. Tras confirmar fondeo y continuación autorizada: ejecutar B6 acotado con journal, verificar receipts/balances/historial, registrar hashes y preparar las instrucciones de Vercel.

Resultado del paso 9: B6 completado a las 12:16 ART del 7/11/2026; evidencia en `docs/B6.md`. Guía entregable para el responsable de Vercel en `docs/VERCEL.md`. El despliegue remoto y la compatibilidad Belo siguen pendientes.
