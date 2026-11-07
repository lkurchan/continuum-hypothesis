# Plan — Revisión A+B y CI

1. Leer las instrucciones, actualizar referencias y combinar A+B en una branch aislada.
2. Revisar código y pruebas; reproducir los hallazgos antes de corregirlos.
3. Corregir los casos confirmados y agregar regresiones.
4. Crear el runner reproducible de Anvil y los tests SQL para CI.
5. Agregar el workflow GitHub con jobs web, contratos, integración y base.
6. Ejecutar localmente los mismos checks y verificar ABI e instrucciones sincronizadas.
7. Publicar commits y un PR de integración; seguir la ejecución GitHub y corregir fallos hasta obtener su resultado.
8. Entregar el informe de revisión, checks y límites restantes, sin integrar en main.
