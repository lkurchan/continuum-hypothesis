# Destino Belo fijo para la demo

El usuario proporcionó `0x5d474d0744284a72afbc4032fd001de50ea72b7c` como wallet de Belo y pidió fijarla temporalmente para que el retiro esté habilitado.

- Aplicar la dirección únicamente a las identidades receptoras demo `worker1` y `worker2`, en modo real y mock.
- Resolver el destino en el servicio tanto al listar usuarios para la UI como al ejecutar un retiro. La dirección mostrada y la usada por `withdrawTo` deben coincidir aunque Supabase no tenga `belo_address` o conserve otro valor.
- Conservar el destino “Tu wallet”, permisos, validación de montos y límites de saldo. No cambiar wallets custodiales, claves, contratos ni datos persistidos.
- No enviar una transferencia durante las pruebas. La configuración no prueba por sí sola que Belo acredite ARGt; la dirección es la indicada por el usuario.
- Publicar por PR en continuidad con la actualización de la demo autorizada.
