# Continuum: lo que cada jurado quiere escuchar

**Conclusión (BLUF).** Continuum encaja con el discurso de Twin casi palabra por palabra. Twin lista como caso de uso propio la **"liquidación de nóminas y proveedores el mismo día, cualquier día de la semana"** ([ITSitio](https://www.itsitio.com/fintech/america-latina-da-un-salto-historico-seis-stablecoins-en-moneda-local-todas-operativas-sobre-blockchain/)), y Continuum lleva eso a "cada segundo". El CEO de belo dice que **"la gente puede vivir en cripto sin saberlo"** y que eligieron "comenzar por los freelancers" ([ITSitio](https://www.itsitio.com/ar/fintech/manuel-beaudroit-la-gente-puede-vivir-en-cripto-sin-saberlo)). Las mejoras posibles a esta altura son de encuadre, no de features. Hay cinco cambios: (1) hablar de **freelancers y repartidores monotributistas que facturan** y de B2B, nunca de "sueldo de empleados"; (2) decir con todas las letras **"no es crédito, no es adelanto, no rinde: es plata que ya ganaste"**; (3) abrir con la frase de Twin y cerrar con la composabilidad (el historial de cobros onchain alimenta la idea 2 de Twin, capital de trabajo); (4) en el track Belo la IA vale **20%**, así que conviene mostrar un agente mínimo pero real (regla en lenguaje natural → regla estructurada → confirmación humana → `withdrawTo` con hash) o, si no está estable a las 15:00, mostrarlo con datos sembrados; (5) tener listas tres respuestas: "¿por qué no Sablier/Superfluid?", "¿quién paga y por qué fondea por adelantado?" y "¿por qué Arbitrum?". Dos riesgos siguen abiertos y hay que cerrarlos hoy con los mentores: que belo **acepte ARGt en Arbitrum** (su lista pública de redes no lo menciona) y cómo pagan hoy Rappi y PedidosYa a sus repartidores. Ninguno de los dos está verificado.

> **Convenciones.** **[Dato]** = con fuente enlazada. **[Inferencia]** = razonamiento propio. Confianza = qué tan seguros estamos de que la persona identificada es el jurado del slide. LinkedIn bloqueó la lectura automática, así que varios perfiles salen de prensa o de snippets. **Supuesto no verificado:** que "un jurado de cada track ve cada pitch" lo dijo el equipo y no se encontró fuente que lo confirme. Tampoco se sabe si ese jurado cruzado evalúa con la rúbrica de su track o con una general. Conviene preguntarlo.

---

## Cinco cambios concretos al pitch y al producto antes de las 15:00

| # | Cambio | Por qué | A quién le habla |
|---|---|---|---|
| 1 | Reemplazar "sueldo" por **"lo que ganás, cada segundo"** y nombrar al usuario: *repartidor o freelancer monotributista que factura*. "Sueldo por segundo" puede quedar como gancho, pero aclarado. | [Dato] La Ley 27.802 deja el salario en relación de dependencia "exclusivamente a través de bancos" y excluye billeteras ([iProfesional](https://www.iprofesional.com/management/449573-se-reglamento-reforma-laboral-cuales-son-principales-cambios-para-trabajador)). | Todos, sobre todo el legal de Team1, Delamónica y De Ambrosi |
| 2 | Una frase fija en el pitch y en la UI: **"No prestamos, no cobramos interés, no hay rendimiento."** No usar "ahorro", "invertí", "adelanto" ni "APY". En la UI, "apartar" en vez de "ahorrar". | [Dato] La CNV frenó ARGt porque podía leerse como inversión con interés. Levantó la medida el 15/4/2026, cuando quedó como "medio de pago… sin expectativa de intereses" ([iProUP](https://www.iproup.com/economia-digital/66852-cnv-levanta-la-sancion-contra-belo-y-twin-por-la-stablecoin-del-peso-argt)). | Twin y Belo (fueron los sancionados) |
| 3 | Apertura: *"Twin dice que los pagos a proveedores y nóminas se liquidan cualquier día. Nosotros liquidamos cada segundo."* Cierre: *"Cada cobro queda onchain: es el historial de ingresos que necesita el scoring de capital de trabajo."* | [Dato] Las ideas sugeridas por Twin incluyen capital de trabajo con scoring sobre historial de cobros onchain, y el track pide dinero "programable y componible" (`docs/track twin.pdf`). | De Ambrosi, Moragues, Brassesco |
| 4 | **IA visible pero acotada**: una regla ("el 5 pagá el alquiler", "apartá 20% para el monotributo") que el LLM convierte a una regla estructurada, el usuario confirma y se ejecuta con `withdrawTo` mostrando el hash y una explicación. Mostrar los guardrails (nunca más que lo devengado, destinos en allowlist). Si no está estable, datos sembrados o no mostrarla. | [Dato] Criterios del track Belo: problema LatAm 30%, funciona 25%, llevable a producto 25%, **IA no decorativa 20%** (`docs/Track Belo.pdf`). [Inferencia] Un agente que falla en vivo resta más de lo que suma. | Belo (20% del puntaje), panel AI, Moragues |
| 5 | Presentar el agente como **compatible con el MCP de belo** ("podría correr sobre belo Agentic Banking MCP") y no como algo que compite con él. | [Dato] belo lanzó el 7/10/2026 un MCP con aprobación humana: el agente propone y el usuario autoriza ([StartupJournal](https://www.startupjournal.io/article/belo-agentic-banking-mcp-agentes-ia-cuentas-pesos-reales-dolares-cripto)). | Beaudroit, Ortiz |

**Número para el slide del problema (con fuente):** se estima que hay **más de 1 millón** de repartidores y choferes de apps en Argentina (estimación sectorial, no oficial), y hacen falta unos **454 pedidos por mes** para cubrir una canasta que incluye alquiler y monotributo ([Chequeado](https://chequeado.com/el-explicador/radiografia-de-los-repartidores-y-conductores-de-apps-en-argentina-quienes-trabajan-cuanto-ganan-y-por-que-crece-el-sector/)). La alternativa de hoy es carísima: la mora con fintech y billeteras es del **30,1%**, con CFT de **hasta 1.375%**, y la deuda insume el **24,1% de la masa salarial** de los hogares ([CEPA, PDF](https://www.antena-libre.com.ar/wp-content/uploads/2026/08/Endeudamiento-y-mora-en-familias-y-empresas-Agosto-2026.pdf)). Frase posible: *"Hoy, para llegar a fin de mes, el repartidor se endeuda con un crédito de tres dígitos. Con Continuum usa la plata que ya ganó."*

---

## Track Stablecoins (Twin): las nóminas "cualquier día" ya son su pitch

**Rúbrica [Dato]:** Idea, Problema, Negocio y Pitch, de 1 a 5 y con el mismo peso. Buscan "ideas nuevas, no versiones onchain de productos que ya existen", con el token como "parte central" (`docs/track twin.pdf`). [Inferencia] El riesgo principal es la objeción "Sablier ya existe". La defensa está en la sección de riesgos.

**Contexto clave [Dato]:** iProfesional presenta a Rafael De Ambrosi como **CFO de belo** ([iProfesional](https://www.iprofesional.com/management/454125-fintech-argentina-levanto-14-millones-de-dolares-y-busca-personal-con-pago-en-cripto-y-dolares)) e iProUP como **CEO de Twin** ([iProUP](https://www.iproup.com/economia-digital/66852-cnv-levanta-la-sancion-contra-belo-y-twin-por-la-stablecoin-del-peso-argt)). [Inferencia] Twin y belo están muy relacionadas: los jurados de los dos tracks conocen ARGt y la sanción de la CNV por dentro.

### Rafael De Ambrosi — CEO, Twin (confianza alta)

| | |
|---|---|
| **Quién es** | [Dato] Su discurso es la infraestructura regional propia y los pagos 24/7 en moneda local. Dijo: "mover dinero… depende de sistemas que cierran los fines de semana y tardan 48 horas", y "el desafío en LatAm no es solo adoptar el dólar digitalizado" ([ITSitio](https://www.itsitio.com/fintech/america-latina-da-un-salto-historico-seis-stablecoins-en-moneda-local-todas-operativas-sobre-blockchain/)). Sostiene que la demanda "no surge de la especulación" y que copiar la regulación de EE.UU. puede ser "inaplicable" en economías con alta informalidad y baja bancarización ([Mercado](https://mercado.com.ar/en-primera-persona/rafael-de-ambrosi-de-twin)). |
| **Qué lo entusiasma** | [Inferencia] El trabajador informal y poco bancarizado, cobrar "un domingo a las 3 AM" y la idea de actualizar el sistema, no reemplazarlo. |
| **Cómo mapea Continuum** | Es su caso de uso de nóminas llevado al extremo, en pesos y no en dólares. |
| **Pregunta probable y respuesta** | *"¿Por qué ARGt y no USDT?"* → "Porque el repartidor gana y gasta en pesos: sin riesgo cambiario, sin conversión y sin dolarizarse. Con BRAt o MEXt es la misma primitiva para plataformas regionales." |
| **Usar / evitar** | Usar: "moneda local 24/7", "infraestructura de acceso", "no es especulación, es liquidez para llegar a fin de mes". Evitar: reserva de valor, dolarización, cualquier insinuación de rendimiento. |

### Mateo Moragues — Head of Ops & Finance, Twin (confianza alta)

| | |
|---|---|
| **Quién es** | [Dato] Es la voz de Twin en **finanzas agénticas**: agentes que automatizan compras y pagos, para los que "será imprescindible contar con monedas locales corriendo sobre blockchain". También habla de remesas y **B2B más rápido** ([iProUP](https://www.iproup.com/economia-digital/71858-propuesta-busca-tokenizar-el-peso-el-real-y-otras-monedas)). |
| **Qué lo entusiasma** | [Inferencia] Un agente que paga dentro de límites que define el usuario (es la idea 1 del track casi textual) y el B2B entre PyMEs. |
| **Cómo mapea** | El agente de reglas y la misma primitiva usada para cuentas a pagar B2B. [Dato] El 62% de las PyMEs industriales vio alargarse sus plazos de cobro ([Perfil/Noticias](https://noticias.perfil.com/noticias/amp/empresas/el-problema-no-es-vender-sino-cobrar.phtml)). |
| **Pregunta probable y respuesta** | *"¿Qué pasa con el saldo no devengado si se corta la relación?"* → "`cancel` le paga al trabajador lo devengado y le devuelve el resto al pagador, todo en una tx." *"¿Cuánto cuesta cada retiro?"* → tener el costo real del gas en Arbitrum medido hoy. |
| **Usar / evitar** | Usar: "el agente opera dentro de límites que definió el usuario". Evitar: el "carry trade" que él mencionó para BRAt y cualquier cosa que suene a inversión. |

### Ariel Brassesco — CTO, Twin (confianza media: el perfil existe pero no se pudo leer)

| | |
|---|---|
| **Quién es** | [Dato] Tiene LinkedIn asociado a Num Finance y Twin ([LinkedIn](https://ar.linkedin.com/in/arielbrassesco)), no legible. No se encontraron GitHub ni charlas. |
| **Qué lo entusiasma** | [Inferencia] Una tx **real** con ARGt en Arbitrum One, la seguridad del contrato que custodia sus tokens y la composabilidad. |
| **Cómo mapea** | `SafeERC20` + `ReentrancyGuard`, tests de Foundry sobre el devengado y los límites de retiro, `withdrawTo` solo para el recipient. |
| **Preguntas probables y respuestas** | *"¿Redondeo con 18 decimals?"* → explicar cómo se calcula el devengado (por `block.timestamp`) y qué pasa con el polvo. *"¿Wallets custodiales contradicen 'permissionless'?"* → "Es una decisión de demo y UX. En producción, la custodia la pone un partner regulado (belo) o smart accounts." *"¿Upgradeable?"* → decir la verdad sobre el diseño. |
| **Usar / evitar** | Usar: "cualquier contrato puede leer cuánto devengó un trabajador". Evitar: decir que el vault de Morpho es parte del producto (es rendimiento, aunque sea para el pagador). |

### Tomás Gómez Zelijoski — Fundraising & Business Case Lead, Credencial Boost (confianza baja)

| | |
|---|---|
| **Quién es** | [Dato] No se encontró nada público sobre él ni sobre "Credencial Boost". Existe **Credencial Payments**, PSP registrado en el BCRA que opera en 15 países, con prepagas y Cash In/Cash Out ([credencialpayments.com](https://credencialpayments.com/), [Crunchbase](https://www.crunchbase.com/organization/credencial-payments)). El vínculo no está confirmado. Bautista Díaz Geliot (track AI) tiene el mismo empleador. |
| **Qué lo entusiasma** | [Inferencia] Evalúa como inversor: quién paga, cuánto, cómo se distribuye y qué tan defendible es. |
| **Cómo mapea** | SaaS por trabajador activo, que paga el pagador (gratis para el trabajador). Distribución B2B2C vía plataformas y wallets. Lo devengado podría gastarse con tarjeta prepaga vía un emisor. |
| **Pregunta probable y respuesta** | *"¿Por qué una plataforma pagaría y además fondearía por adelantado?"* → "Retiene repartidores sin dar crédito y se ahorra desarrollar payouts y conciliar. Hipótesis a validar: el stream se fondea con el GMV del día, que entra antes de lo que se le paga al repartidor." |
| **Usar / evitar** | Usar: 1 o 2 números con fuente. Evitar: "todavía no tenemos modelo", cobrar spread o float sobre el saldo, inventar TAM. |

---

## Track Fintech (Belo): "vivir en cripto sin saberlo", empezando por el repartidor

**Rúbrica [Dato]:** problema LatAm 30%, funciona de punta a punta 25%, llevable a producto, respeta la regulación y un equipo de belo podría continuarlo 25%, IA no decorativa 20%. La consigna 4 es un agente que paga o aparta con reglas del usuario y explica cada movimiento. Entrega a las 17:30 (`docs/Track Belo.pdf`).

**Producto belo [Dato]:** app multimoneda con tarjeta, una web para empresas desde 2023 y un MCP agéntico desde octubre de 2026 ([StartupJournal](https://www.startupjournal.io/article/belo-agentic-banking-mcp-agentes-ia-cuentas-pesos-reales-dolares-cripto)). Serie A de US$14M liderada por Tether ([iProfesional](https://www.iprofesional.com/management/454125-fintech-argentina-levanto-14-millones-de-dolares-y-busca-personal-con-pago-en-cripto-y-dolares)). No se encontró ningún producto de nómina, streaming ni adelanto. [Inferencia] Continuum llena un hueco real del producto. La lista pública de redes de belo incluye Arbitrum **solo para USDT, USDC y ETH**, no para ARGt ([Help belo](https://help.belo.app/en/articles/5964418-which-networks-are-supported-by-belo)).

### Manuel Beaudroit — CEO y cofundador, belo (confianza alta)

| | |
|---|---|
| **Quién es** | [Dato] Cofundó Bitex en 2014 ([StartupJournal](https://www.startupjournal.io/article/belo-agentic-banking-mcp-agentes-ia-cuentas-pesos-reales-dolares-cripto)). Frases suyas: "la gente puede vivir en cripto sin saberlo… comenzar por los freelancers" ([ITSitio](https://www.itsitio.com/ar/fintech/manuel-beaudroit-la-gente-puede-vivir-en-cripto-sin-saberlo)); "cometimos el pecado original de sobre incentivar a los usuarios" y "no queremos ser un banco" ([El Cronista](https://www.cronista.com/finanzas-mercados/cometimos-el-pecado-original-de-sobreincentivar-a-los-usuarios-evalua-manuel-beaudroit)); el próximo salto de adopción "no pasa solo por acceder a dólares digitales" ([iProUP](https://www.iproup.com/economia-digital/66852-cnv-levanta-la-sancion-contra-belo-y-twin-por-la-stablecoin-del-peso-argt)). Sobre la banca tradicional: asumió "que del otro lado de la pantalla siempre hay una persona haciendo clic" ([StartupJournal](https://www.startupjournal.io/article/belo-agentic-banking-mcp-agentes-ia-cuentas-pesos-reales-dolares-cripto)). |
| **Qué lo entusiasma** | [Inferencia] Cripto invisible (el repartidor ve "$12.345,67 ganados hoy", no gas ni wallets), un uso diario de ARGt, distribución B2B2C que le traiga plataformas pagadoras, y agentes que operan plata. |
| **Cómo mapea** | Ningún jurado tiene una tesis tan alineada con Continuum. Frase sugerida: *"belo resolvió cómo cobrás del exterior. Continuum resuelve cuándo cobrás: cada segundo."* |
| **Pregunta probable y respuesta** | *"¿Por qué onchain y no un ledger interno de belo?"* → "El pagador y el que recibe no necesitan confiar entre sí: el depósito es verificable, la liquidación es 24/7 y cualquier wallet puede componer encima." |
| **Usar / evitar** | Usar: "diseñado para integrarse en belo", "valor por encima de incentivos". Evitar: decir "integrado con belo" (no hay acuerdo), prometer cashback o "ganá intereses". |

### María Delamónica — COO, belo (confianza alta)

| | |
|---|---|
| **Quién es** | [Dato] The Org la lista como COO verificada, en el equipo de Operations (22) ([The Org](https://theorg.com/org/belo/person/maria-delamonica)). No hay declaraciones públicas. |
| **Qué la entusiasma** | [Inferencia] Que el modelo elimine operación (sin adelantos manuales ni conciliación de anticipos) y que el pagador tenga control. |
| **Cómo mapea** | `topUp` y `cancel` (que devuelve solo lo no devengado), límites de retiro y un hash por cada movimiento como comprobante. |
| **Pregunta probable y respuesta** | *"¿Quién hace KYC/AML y quién atiende cuando un retiro falla?"* → "El KYC del trabajador y el KYB del pagador los hace el partner regulado en el on/off-ramp. El estado de cada stream es verificable onchain, y eso simplifica el soporte." |
| **Usar / evitar** | Evitar minimizar el compliance o el fraude (cuentas falsas de repartidores). |

### Franco Ortiz — Technical PM de pagos cross-border, belo (confianza alta)

| | |
|---|---|
| **Quién es** | [Dato] Su GitHub dice "Technical Product Manager at belo (payments, cross-border fintech)". Lideró 4 años mobile en belo (migración de Flutter a React Native) y tiene un side project con **servidor MCP** ([GitHub pakvothe](https://github.com/pakvothe)). |
| **Qué lo entusiasma** | [Inferencia] Un módulo embebible de verdad, una tx real en Arbiscan y una arquitectura limpia. |
| **Cómo mapea** | Módulo del trabajador mobile-first pensado para webview, con destinos de retiro que vienen de la API (`destination: 'wallet' \| 'belo'`) y `StreamGateway` real/mock (PRD §6.1, §8). |
| **Pregunta probable y respuesta** | *"¿Por qué Arbitrum si belo no lista ARGt ahí?"* → contestar según lo que digan hoy los mentores (ver pendientes). Si no está confirmado: "Retiramos a la wallet del trabajador. La dirección de destino la define el host, así que es una línea de config." |
| **Usar / evitar** | Usar: "el agente podría ser un cliente de su MCP". Evitar: hand-waving técnico. |

### Adriana Reyes — PM, belo (confianza media: LinkedIn conectado a belo, sin cargo visible)

| | |
|---|---|
| **Quién es** | [Dato] "Passionate about leading technological products from vision to execution"; 15 años como líder scout en Venezuela ([LinkedIn](https://ar.linkedin.com/in/missairn/en)). |
| **Qué la entusiasma** | [Inferencia] Un usuario con nombre, un dolor concreto, un MVP acotado y métricas. |
| **Cómo mapea** | Storytelling de un repartidor con nombre. Métricas propuestas: % del devengado que se retira, retiros por semana, retención del repartidor en la plataforma. |
| **Pregunta probable y respuesta** | *"¿Cómo validaron el problema?"* → ser honestos: datos secundarios con fuente (Chequeado, CEPA) y, si llegan, una charla con un repartidor hoy. |
| **Usar / evitar** | Evitar métricas inventadas presentadas como reales. |

---

## Track AI: el agente tiene que ejecutar, no conversar

[Dato] No se encontraron criterios públicos del track AI. [Inferencia] El panel junta un builder de agentes, IA operativa con ROI, corporate development, educación y un CTO fintech/Web3. La feature que les habla a todos es **una regla en lenguaje natural → regla estructurada que el usuario confirma → ejecución determinística con hash y explicación**. Guion de unos 25 segundos: escribir la regla, ver la tarjeta de confirmación, "Ejecutar reglas de hoy", ver el hash y leer *"Te pagué $X de alquiler de lo que ya ganaste; te quedan $Y."*

| Jurado | Confianza | Quién es [Dato] | Qué lo entusiasma / cómo mapea [Inferencia] | Pregunta probable → respuesta | Usar / evitar |
|---|---|---|---|---|---|
| **Joaquín Giorgis**, CTO The Ai Room | Media-alta (no se encontró vínculo con "The Ai Room") | Dev cordobés, ex Naranja X y JPMorgan, construye Elbi (agente de IA), organizó Córdoba Hack ([joaquingiorgis.com](https://www.joaquingiorgis.com/)). Su equipo ganó Cal Hacks 13.0 ([Rivadavia](https://rivadavia.com.ar/noticias/el-sillon-de-rivadavia/joaquin-giorgis-tuvimos-que-desarrollar-el-dispositivo-en-tan-solo-36-horas)) | Demo en vivo, saldo que sube cada segundo, tool-calls reales (mostrar el log) | *"¿Qué hace el agente que no haga un cron con un if?"* → "El LLM interpreta la regla una sola vez y la convierte en estructura. Desde ahí la ejecución es determinística y nunca supera lo devengado." | Evitar vender la IA como el núcleo o un chat genérico |
| **Bautista Díaz Geliot**, M&A & New Business, Credencial Boost | Media (figuraba en Accenture M&A) | LinkedIn: M&A Associate Manager en Accenture ([LinkedIn](https://ar.linkedin.com/in/bautista-diaz-geliot-84b466159)). Credencial: PSP con prepagas y Cash Out ([credencialpayments.com](https://credencialpayments.com/)) | Lente de corporate dev: ¿es integrable o adquirible por un PSP? Continuum como capa que se enchufa a PSPs y emisores | *"¿Cómo compiten con el adelanto de sueldo de las billeteras?"* → "Ellas prestan y cobran. Nosotros no tenemos capital en riesgo: el trabajador retira lo que ya ganó." | Evitar cifras de mercado sin fuente |
| **Iván Domínguez de Alzaga**, AI Leader, Flexways | Media-alta (email @flexways.co, [ZoomInfo](https://www.zoominfo.com/p/Iva%CC%81n-De-a%CC%81lzaga/13669579270)) | Flexways: red de alquiler de autos en más de 50 países, con IA en pricing y contact center 24/7 ([Auto Rental News](https://autorentalnews.com/10240666/flexways-adds-ai-to-its-operations)) | IA en producción con ROI. Le habla la versión B2B (pagar a afiliados y proveedores por stream) y la explicación de cada movimiento, que reduce tickets de soporte | *"¿Qué pasa si el LLM alucina una regla?"* → "La regla no se ejecuta sin confirmación humana, los destinos están en allowlist y hay un fallback sin IA." | Evitar la IA "porque sí" |
| **Nacho Vuotto**, Head of Learning, Digital House | Alta (cargo de 2025) | "Una persona no puede desarrollarse como programador sin tener pensamiento crítico" ([Infobae](https://www.infobae.com/educacion/2025/05/15/formacion-de-talento-en-la-era-digital-un-modelo-que-anticipa-el-futuro-laboral/)) | Claridad, narrativa centrada en una persona, cómo trabajó el equipo (4 personas, Claude Code/Codex, SDD) | *"¿Qué aprendieron?"* → tener una respuesta honesta de una oración | Evitar jerga (beacon proxy, OFT). Decir "pesos digitales" |
| **Nahuel Alberti**, CTO, Paisanos | Alta | Paisanos hizo la **estrategia de marca de Twin** en 2025 ("The architecture of value") ([Paisanos](https://www.paisanos.io/projects/twin-website-case-study)). Es software factory fintech/Web3 (Modo, Galicia, Brubank) ([iProfesional](https://www.iprofesional.com/tecnologia/395237-paisanos-apunta-al-crecimiento-de-web-3-en-2024)) | El jurado de AI más cercano a Twin. Mira la calidad de la ingeniería, una UX de wallet de primer nivel y la IA con impacto de negocio | *"¿Un contrato por stream o uno con muchos? ¿Cómo escalan?"* → "Un solo contrato con muchos streams y `createStreamsBatch` para N repartidores." | Usar el lenguaje de la marca Twin: "medio de pago", "moneda local", "infraestructura" |

---

## Track Blockchain (Avalanche): la pregunta segura es "¿por qué no Avalanche?"

**Rúbrica [Dato]:** Impacto 25, **Uso de Avalanche 25**, Factibilidad técnica 20, Negocio 20 y Presentación 10, más bonus de 0xGasless (gas patrocinado) y KUMPLY (KYB). El PDF lista entre sus casos de uso **"payroll only between verified business addresses"** y pagos en stablecoin sin gas para el usuario (`docs/HackaTwin — Blockchain Track Rules…pdf`, firmado "@sofi"). [Inferencia] Continuum puntuaría bien en impacto y negocio y casi cero en "uso de Avalanche". La respuesta tiene que ser **una línea de roadmap honesta**, no una integración. No vale la pena gastar tiempo antes del freeze: un deploy extra en Fuji (unos 15-30 min) solo si sobra tiempo y sin tocar el flujo principal.

**Línea sugerida:** *"El contrato es EVM estándar y ARGt también existe en Avalanche. Elegimos Arbitrum porque ahí está la liquidez de ARGt (pool de Curve). El próximo paso es C-Chain con gas patrocinado para que el repartidor nunca pague gas y KYB para que solo empresas verificadas abran streams."* No decir que ya está integrado.

| Jurado | Confianza | Quién es [Dato] | Qué lo entusiasma / cómo mapea [Inferencia] | Pregunta probable → respuesta | Usar / evitar |
|---|---|---|---|---|---|
| **Rocío Ferreiro**, CTO R3AL Blocks | Alta | CTO de una plataforma de tokenización RWA. Implementation Manager en **Mastercard** (integraciones de pagos y APIs). 2.º puesto general en Avalanche LATAM Summit 2024 con un sistema de subsidios educativos onchain ([rocioferreiro.com](https://www.rocioferreiro.com/)) | Demo de punta a punta, seguridad y "API de pagos". `createStreamsBatch` se puede presentar como una API de nómina para plataformas | *"Claves custodiales en env vars: ¿en producción?"* → "KMS/MPC o account abstraction, o custodia de un partner regulado. Lo de hoy son wallets de demo." | Usar: los tests de Foundry. Evitar prometer seguridad sin tests |
| **Freddy Chambi**, CTO Axion Labs / Team1 | Alta como Freddy de Team1; baja con Axion Labs | Web3 dev boliviano, educador de Solidity, jurado/mentor del Avalanche LATAM Institutional Hackathon ([Avalanche Academy](https://academy.avax.network/events/8a8ee2e9-d91d-4087-adba-c1221b72e407), [Gitcoin](https://checker.gitcoin.co/public/project/show/freddy-chambi)) | Contrato propio y bien explicado, con OpenZeppelin, eventos y tests | *"¿Los workers pagan gas?"* → "En la demo no (wallets custodiales). En C-Chain lo resolvería un paymaster." | Evitar decir "Arbitrum es mejor" |
| **Sofía Priore**, Regional Lead LATAM, Team1 | Media-alta | Hostea los hackathons y workshops de Team1 en LATAM, incluido "Economía Agéntica en Avalanche" ([Luma](https://luma.com/hlwnkasf)). Probablemente escribió las reglas del track ("@sofi") | Adopción del ecosistema, uso de partners, economía agéntica y negocio claro | *"¿Tienen validación con repartidores o PyMEs?"* → ser honestos sobre lo que se validó | Usar la línea de roadmap con 0xGasless y KUMPLY |
| **Mariano**, Legal Counsel, Team1 | Nula (no identificado) | No hay fuente pública. El abogado de Ava Labs LATAM con perfil público es Leandro Davo, **que no es el jurado** ([Avalanche blog](https://www.avalanche.com/about/blog/blockchain-adoption-in-latin-america-according-to-an-argentine-lawyer)) | Lo más probable es que pregunte por lo legal: salario, crédito, custodia/PSAV, KYC | Ver el cheat sheet: *"¿Es legal pagar sueldo en stablecoin?"* | Evitar "eliminamos a los bancos" y "no hace falta regulación" |

---

## Riesgos transversales: cuatro objeciones que pueden tumbar el pitch

**1. Regulatorio laboral: no es "sueldo de empleados".** [Dato] Según iProfesional, la Ley 27.802 deja el salario "exclusivamente a través de bancos o entidades oficiales de ahorro" y excluye las billeteras ([iProfesional](https://www.iprofesional.com/management/449573-se-reglamento-reforma-laboral-cuales-son-principales-cambios-para-trabajador)). El artículo que habilitaba los PSP se retiró por presión de los bancos ([El Economista](https://eleconomista.com.ar/economia/golpe-galperin-milei-freno-una-bomba-reforma-laboral-ganaron-bancos-n92565/amp)). Otra fuente dice que el cripto se permite solo como complemento en especie, con tope del 20% ([iProUP](https://www.iproup.com/economia-digital/66174-ya-rige-la-reforma-laboral-como-cambia-tu-sueldo-en-dolar-cripto)). **Las fuentes no coinciden en fechas ni en artículos**, y nada se verificó en el Boletín Oficial. Igual, las dos lecturas llevan a la misma conclusión: **el foco es el pago de servicios a monotributistas y el B2B**. [Dato] Hay además un matiz: la Suprema Corte bonaerense consideró a los repartidores de Rappi en relación de dependencia ([Descubre.vc](https://www.descubre.vc/noticia/fallo-hist-rico-en-argentina-rappi-deber-reconocer-relaci-n-laboral-de-repartidores-2026-04-10)). [Inferencia] Por eso conviene que el usuario del pitch sea "freelancer o repartidor monotributista" en general y no "repartidor de Rappi".

**2. Rendimiento, adelanto e inversión.** [Dato] La sanción de la CNV fue justamente por la lectura de ARGt como inversión ([iProUP](https://www.iproup.com/economia-digital/66852-cnv-levanta-la-sancion-contra-belo-y-twin-por-la-stablecoin-del-peso-argt)). Ojo: el help center de belo **todavía** dice que ARGt "earn daily yields" ([Help belo](https://help.belo.app/en/articles/12833571-what-is-argt)), y belo tiene Alcancías, un ahorro con rendimiento ([StartupJournal](https://www.startupjournal.io/article/belo-agentic-banking-mcp-agentes-ia-cuentas-pesos-reales-dolares-cripto)). No copiar ese lenguaje ni enlazar Continuum con Alcancías. "Adelanto" suena a crédito: [Dato] en EE.UU., el fiscal general de NY sostiene que las comisiones de EWA equivalen a tasas de 250–750% anual, mientras que el CFPB considera que no es crédito si no supera lo devengado y no tiene recurso ([Goodwin](https://www.goodwinlaw.com/en/insights/blogs/2026/01/cfpb-says-some-earned-wage-access-products-not-considered-credit)). [Inferencia] Continuum cumple esos criterios por diseño, pero es regulación de EE.UU.: usarlo como analogía, no como argumento legal. **Custodia:** [Inferencia] las wallets custodiales en producción acercarían a Continuum a la figura de PSAV ante la CNV. La respuesta es "la custodia la pone un partner regulado". No se verificó si belo está inscripto como PSAV.

**3. ARGt en Arbitrum hacia belo, sin confirmar.** [Dato] La página de redes de belo lista Arbitrum solo para USDT, USDC y ETH ([Help belo](https://help.belo.app/en/articles/5964418-which-networks-are-supported-by-belo)). Si no se confirma, se aplica el plan B del PRD: retiro a la wallet del trabajador y belo como "siguiente paso". En el pitch, **"diseñado para belo"**, nunca "integrado" ni "retiro a tu belo" si no se probó una tx real.

**4. "Esto ya existe": Sablier, Superfluid y las plataformas que pagan rápido.** [Dato] Sablier Labs entró en **maintenance mode** el 13/7/2026 por caída de ingresos. Los contratos siguen funcionando ([The Defiant](https://thedefiant.io/news/defi/sablier-labs-enters-maintenance-mode-halts-development)) y su propio blog admite que no cubre compliance ni reporte impositivo ([blog Sablier](https://blog.sablier.com/crypto-payroll-tools-compared-sablier-vs-traditional-solutions)). [Inferencia] Respuesta: "La primitiva existe desde 2019 y no llegó a la nómina masiva porque le faltaban moneda local, salida a pesos, un pagador real y distribución. Los protocolos genéricos sin distribución no sobreviven. Continuum es producto en pesos, vendido a la plataforma." El estado de Superfluid en 2026 no se verificó. **Rappi y PedidosYa:** no se encontró con fuentes de 2025–2026 cómo y cada cuánto les pagan hoy a los repartidores en Argentina, ni si ofrecen retiro instantáneo. Si lo ofrecen: "Continuum es la infraestructura para que cualquier empresa lo ofrezca sin construirlo, con fondos depositados y verificables". **No afirmar en el pitch que pagan a 15 o 30 días.**

---

## Cheat sheet de Q&A (2 minutos)

| Pregunta | Respuesta en una o dos oraciones |
|---|---|
| ¿Es legal pagar sueldo en ARGt? | "No pagamos sueldos en relación de dependencia: eso va por banco y en pesos. Continuum es el medio de pago de servicios a freelancers y monotributistas, y de pagos B2B." |
| ¿Es un préstamo o adelanto? | "No. La plata ya está depositada por el pagador y el trabajador retira solo lo que ya ganó. No hay crédito, interés ni rendimiento." |
| ¿Por qué ARGt y no USDT? | "El repartidor gana y gasta en pesos: sin riesgo cambiario ni conversión. Es la misma primitiva para BRAt o MEXt." |
| ¿Por qué onchain y no una base de datos? | "Pagador y receptor no tienen que confiar entre sí: fondos verificables, liquidación 24/7 y cualquier contrato puede leer el historial de ingresos." |
| ¿Por qué no Sablier o Superfluid? | "Son primitivas genéricas en USD para cripto-nativos. Sablier entró en maintenance mode. Nosotros hacemos producto en pesos, con pagador real, batch y salida a una wallet." |
| ¿Quién paga? | "La plataforma o empresa pagadora: fee mensual por trabajador activo. Para el trabajador es gratis." |
| ¿Por qué la plataforma fondearía por adelantado? | "Retiene repartidores sin dar crédito y no tiene que construir ni conciliar payouts. Hipótesis a validar: lo fondea con el GMV del día." |
| ¿Por qué Arbitrum (y no Avalanche)? | "Ahí está la liquidez de ARGt. El contrato es EVM estándar y portable." |
| ¿Quién tiene las claves? | "En la demo, wallets de prueba. En producción, la custodia la pone un partner regulado, o smart accounts." |
| ¿Qué hace la IA que no haga un cron? | "Traduce una regla en lenguaje natural a una regla estructurada que el usuario confirma. La ejecución es determinística y nunca supera lo devengado." |
| ¿Y el monotributo? ¿Cada retiro es una factura? | "No. Se factura el período como hoy: el stream es el mecanismo de pago, no el comprobante." (Inferencia: confirmar con un contador.) |
| ¿Qué pasa si se corta la relación? | "`cancel`: el trabajador cobra lo devengado y el resto vuelve al pagador, en una sola tx." |

---

## Para confirmar hoy con los mentores (antes del freeze de las 15:00)

| Qué | Con quién | Por qué importa |
|---|---|---|
| ¿Una dirección de belo recibe ARGt **en Arbitrum**? Pedir la dirección y hacer una tx de prueba | Mentores de belo y Twin | Define si se puede decir "retiro a belo" en vivo |
| ¿El jurado cruzado evalúa con su rúbrica o con una general? ¿Es cierto que un jurado de cada track ve cada pitch? | Organización | Define cuánto tiempo dedicarle a la línea de Avalanche y a la IA |
| ¿Cómo y cada cuánto pagan Rappi y PedidosYa a sus repartidores? | Mentores, o un repartidor en la puerta | Es la objeción más probable y no tiene fuente |
| Dirección de ARGt en Avalanche C-Chain (sale cortada en el PDF) | Mentores de Twin | Solo para sostener la línea "Avalanche-ready" |
| Qué es Credencial Boost y quién es Mariano (Team1 legal) | Charla informal en el venue | Ajustar el ángulo de dos jurados sin identificar |
| Costo real de gas por retiro en Arbitrum | El equipo, midiendo con una tx | Pregunta casi segura de Moragues y los técnicos |

## Conclusión

El veredicto de los jurados no depende de agregar features. Depende de que nadie pueda decir "esto es crédito", "esto es rendimiento" o "esto es el sueldo de un empleado". Los dos tracks en los que compiten son de las empresas que pasaron por la sanción de la CNV de este año, y cualquier palabra que suene a inversión cuesta más que una feature que falte. Al revés, el encuadre correcto convierte a Continuum en **la demo del caso de uso que Twin ya promociona y del usuario (el freelancer) con el que belo empezó**. Eso es más fuerte que cualquier novedad técnica.

El segundo hallazgo es que el agente de IA deja de ser un "si sobra tiempo". En Belo vale el 20% del puntaje, Moragues lo tiene como tesis y el panel AI lo va a mirar. Pero solo suma si es chico, confirmable y no falla: una regla, una confirmación, un hash. Si a las 15:00 no está estable, conviene mostrarlo con datos sembrados y no arriesgarlo en vivo.
