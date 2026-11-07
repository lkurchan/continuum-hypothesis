# Plan de integración de demo

1. Revisar los diffs y checks de #5/#6; integrar #6.
2. Traer main a #5 y conservar tests de componentes, API, dominio y scripts.
3. Corregir actualización entre pantallas, comprobantes parciales, aislamiento del Lab y validación de chat.
4. Ejecutar checks y ensayo de la UI en mock; registrar resultados y límites.
5. Publicar la rama, esperar CI/Preview, integrar #5 y verificar Production protegida.
6. Informar pendientes operativos: seed con horario nuevo, Belo, Anthropic, publicación del repo y ensayo en dispositivos.

## Verificación previa al merge de #5

- Lint, typecheck y build de producción aprobados; 91 tests aprobados y una integración Anvil reservada al job específico del CI.
- Smoke HTTP mock aprobado: lote, journal reutilizable, recarga, retiro, cancelación, remanente e historial aislado.
- Chrome, build local mock: lote de dos pagos de 900 ARGt (450 de depósito por persona), recarga de 50 y retiro de 10 a wallet; comprobante identificado como simulación. El trabajador recibió el lote creado desde la pestaña del pagador sin recargar manualmente.
- Cancelación verificada nuevamente con el build corregido: el pago continúa seleccionado y conserva el comprobante del reintegro.
- Chat sin clave: error de configuración visible, sin afectar el resto de las pantallas. No se verificó una respuesta real del proveedor.
- Production se verificará sobre el commit de merge. Los pagos reales previos están documentados en `docs/B6.md`; este ensayo no envía transacciones mainnet.
