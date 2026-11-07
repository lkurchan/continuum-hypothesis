# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Proyecto para HackaTwin (hackathon presencial, sábado 7/11/2026). La entrega cierra a las 18:00 y lo que llegue después no se evalúa. A las 19:00 hay pitch de 3 min más 2 min de preguntas. Somos un equipo de 4 y la prioridad es una demo que funcione en vivo con una UI que impresione al jurado, por encima de la completitud.

**Idea:** "sueldo por segundo". El pagador deposita el monto del período en una stablecoin local (ARGt) y el receptor lo va desbloqueando de forma continua. Puede retirar cuando quiera cualquier monto menor o igual a lo ya devengado. Ataca el problema de "llegar a fin de mes". La misma primitiva (pagador, receptor, token, monto, inicio, fin) sirve también para pagos B2B entre PyMEs, en lugar de pagos a 30 o 60 días. Si sobra tiempo, se suma un copiloto de liquidez con IA.

**Track:** Stablecoins (Twin). Es la recomendación y falta que el equipo la confirme. Las bases de los tres tracks están en `docs/*.pdf`.

## Requisitos duros del track Twin (para no quedar descalificados)

- Usar al menos una Twin Stablecoin en una chain elegible: Arbitrum, Base, Polygon, Ethereum o Avalanche. Son mainnets, y los tokens de prueba los dan los mentores de Twin en montos mínimos.
- Mostrar en la demo al menos una transacción onchain ejecutada por el producto, con el hash verificable en el explorer.
- Repo público con un README que indique token(s), chain y direcciones de contrato usadas.
- La lógica del producto tiene que construirse durante el evento, y el historial de commits tiene que mostrarlo: commits chicos y frecuentes.
- Se evalúan Idea, Problema, Negocio y Pitch, con el mismo peso. El token tiene que ser el núcleo del producto, no un agregado.
- Regulatorio: ARGt es un medio de pago **sin rendimiento** (la CNV lo frenó cuando ofrecía yield). Nunca presentar en la UI ni en el pitch un rendimiento al usuario por tener ARGt.

## Datos onchain de referencia

- Los tokens son ERC-20 Upgradeable de OpenZeppelin (beacon proxy), con **18 decimals** y transferencias permissionless.
- Las direcciones **no** son determinísticas entre chains: la misma dirección puede ser otro token en otra chain. Identificar siempre un token por el par (chainId, dirección).
- ARGt: Arbitrum `0x59863989d080B22476DB95656d0C3CC18be92214` y Base `0xf016413834E6D1A14F3D628B11D6Ef725a6bdbDD`. Las columnas de Polygon y Avalanche salen cortadas en el PDF; pedírselas a los mentores.
- Pool de Curve ARGt/USDT0 en Arbitrum: `0x356d349da9add7efb56a35fab939a2c6d852f853`.
- Vault Morpho "ARGt Prime" en Arbitrum: `0x9Dd3F844747AB78d616BF76DB92756E17A064aDD`.
- Precio de referencia: `https://api.belo.app/public/price` (bid, ask y mid por par).
- Logos: `https://assets.twin.finance/media/tokens/32x32/<TICKER>.svg`.
- El bridge de ARGt usa LayerZero V2 (OFT). El ABI y los adaptadores están en `docs/track twin.pdf`.

## Reglas de trabajo

- **SDD (spec-driven):** antes de codear un módulo tiene que existir su spec en `docs/superpowers/specs/` y su plan en `docs/superpowers/plans/`. Si el código y la spec divergen, se actualiza la spec en el mismo PR.
- **TDD liviano en backend y contratos:** tests de la lógica de negocio (cálculo de lo devengado, límites de retiro, permisos) antes o junto con la implementación. El objetivo es que funcione, no la cobertura. El frontend no lleva tests.
- **Git:** cada feature va en su propia branch y se integra por PR. No pushear a `main` salvo que lo pidan explícitamente. El repo todavía no tiene commits y la branch local es `master`, mientras que la principal esperada es `main`.
- **Módulos independientes:** trabajan en paralelo 4 cuentas de Claude Code y 2 de Codex. Cada módulo expone una interfaz chica y documentada, y se integra contra mocks hasta que el módulo real esté listo. Evitar que dos módulos editen los mismos archivos.
- **SOLID:** la lógica de dominio no depende de la chain ni de la UI. El acceso a la blockchain va detrás de una interfaz, con una implementación real y una mock para la demo offline.
- **Demo primero:** todo flujo que se muestre en el pitch necesita una salida de emergencia (datos sembrados o un modo mock) por si falla la red en vivo.

## Comandos

Todavía no hay código ni stack elegido. Cuando se scaffoldee, completar esta sección con build, lint, tests (incluido cómo correr un solo test) y deploy.
