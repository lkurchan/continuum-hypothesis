# Legales de Continuum

> Investigación para la HackaTwin (7/11/2026). **No es asesoramiento legal**: lo marcado como pendiente lo tiene que confirmar un abogado o un contador. [Dato] = con fuente. [Inferencia] = razonamiento propio. Las secciones 1 y 2 se investigaron a fondo. La sección 3 (regulación financiera) y la 4 (otros riesgos) salen de la investigación de jurados de esta mañana y de inferencia, sin una investigación dedicada.

## Resumen

| Caso | ¿Se puede con Continuum? | Riesgo principal |
|---|---|---|
| Sueldo de empleado en relación de dependencia, en ARGt | **No** | El art. 124 de la LCT exige pagar "únicamente" por acreditación en banco, bajo pena de nulidad |
| Repartidores de plataformas (régimen de la Ley 27.802) | **En principio sí**: la ley prevé "cuenta bancaria o billetera electrónica" | Recalificación como empleados (fallo SCBA contra Rappi y PedidosYa) |
| Freelancers y monotributistas | **Sí, si se pacta** en el contrato | Deducibilidad e IVA para el pagador (Ley Antievasión) |
| B2B entre empresas | **Sí, si se pacta** | Deducibilidad e IVA, y choque con la Factura de Crédito Electrónica MiPyME |
| Operar en producción con wallets custodiales | Solo con un partner regulado | Régimen de proveedores de activos virtuales (PSAV) de la CNV |

**Encuadre para el pitch:** "Continuum es un medio de pago para servicios de freelancers, repartidores independientes y proveedores. No paga sueldos de empleados, no presta plata y no da rendimiento."

---

## 1. Sueldos en relación de dependencia: no

**Qué dice la ley.** [Dato] La Ley 27.802 de Modernización Laboral se sancionó el 27/2/2026 y se publicó en el Boletín Oficial el 6/3/2026 ([BO](https://www.boletinoficial.gob.ar/pdf/aviso/primera/339128/20260306), [Marval](https://www.marval.com/Publicacion/especial-ley-de-modernizacion-laboral-17500)). Su art. 35 reescribe el **art. 124 de la LCT**: el sueldo se paga "bajo pena de nulidad, únicamente mediante la acreditación en cuenta abierta a su nombre" en un banco o una institución de ahorro oficial. La opción de billeteras virtuales y PSP estaba en el proyecto de diciembre de 2025, pero **se sacó** antes de sancionar la ley ([Canal 26](https://www.canal26.com/economia/2026/02/10/cobrar-tu-sueldo-mediante-billeteras-virtuales-la-camara-fintech-presiona-al-gobierno-para-sumarlo-a-la-reforma-laboral/), [iProfesional](https://www.iprofesional.com/impuestos/450489-reforma-laboral-formas-pago-salario-quedaron-prohibidas), [El Cronista](https://www.cronista.com/economia-politica/adios-al-pago-en-efectivo-el-cambio-de-la-reforma-laboral-que-impactara-en-los-salarios)). Esto resuelve la contradicción del informe de jurados: **solo banco**.

**Cripto y especie.** [Dato] El art. 105 dice que el salario se paga "en dinero, ya sea en moneda nacional o extranjera", sin mencionar cripto. El art. 107 no se modificó y mantiene un tope de 20% para la parte en especie. iProUP dice que la cripto se puede usar como complemento dentro de ese 20% ([iProUP](https://www.iproup.com/economia-digital/66174-ya-rige-la-reforma-laboral-como-cambia-tu-sueldo-en-dolar-cripto)), pero no se encontró esa frase en el texto del BO. [Inferencia] Pagar hasta un 20% en ARGt como "especie" es **dudoso** y no conviene ponerlo en el pitch.

**"Por segundo".** [Dato] Los arts. 126, 128 y 130 no cambiaron. Los períodos siguen siendo mensual, quincenal o semanal, y los adelantos tienen un tope de 50% de un período, con recibo (que ahora puede ser digital, art. 139). Con la reforma, lo que se descuenta por un adelanto no puede pasar del 20% del salario que se paga (art. 133).

**Variantes legales para empleados** [Inferencia]:
- **A (la más segura): producto del lado del trabajador.** El sueldo entra al banco y el trabajador decide pasar fondos a ARGt. Continuum no paga el sueldo.
- **B: adelantos acreditados en el banco**, dentro del tope del 50%. Si los adelanta un tercero, puede ser crédito: lo tiene que ver un abogado.
- **C: pago semanal por banco** para jornaleros u horistas.

**Frase para el pitch:** "El sueldo formal se cobra en el banco. Continuum es para lo que se paga como servicio." Nunca decir "pagamos sueldos en ARGt". Tampoco usar como argumento que belo paga a sus empleados en cripto: no se encontró cómo lo encuadra legalmente.

## 2. Repartidores de plataformas: un régimen propio, con riesgo de recalificación

[Dato] La Ley 27.802 crea un régimen para "prestadores independientes de plataformas tecnológicas" (Título XII, arts. 119 a 128 aprox.; hay que verificar la numeración exacta). Los deja fuera de la LCT, les paga una "retribución dineraria a través de la plataforma" y les exige una **"cuenta bancaria o billetera electrónica"** con CBU/CVU (art. 125.3). [Inferencia] Para este grupo la billetera está prevista. Queda abierto si una wallet onchain con ARGt cuenta como "billetera electrónica" (en general se entiende un PSP con CVU). Lo prolijo es que la salida sea a belo u otro PSP con CVU.

**Riesgo:** [Dato] en abril de 2026 la Suprema Corte bonaerense confirmó multas a Rappi y PedidosYa y sostuvo que los repartidores deben considerarse empleados ([Microjuris](https://aldiaargentina.microjuris.com/2026/04/14/fallos-scba-se-confirma-la-multa-impuesta-a-una-empresa-de-plataformas-digitales-de-reparto-por-infracciones-a-la-legislacion-laboral-y-de-seguridad-social/), [Bloomberg Línea](https://www.bloomberglinea.com/latinoamerica/argentina/el-fallo-de-la-corte-suprema-de-justicia-de-la-provincia-de-buenos-aires-contra-rappi-y-pedidosya/), [Diario Judicial](https://www.diariojudicial.com/news-103204-los-repartidores-son-empleados)). [Inferencia] **Ajuste de producto:** un stream que avanza por tiempo conectado se parece a un pago por jornada, que es un indicio de dependencia. Devengar **por tarea completada** es más coherente con la independencia. En la demo, el stream por tiempo sirve para freelancers con contrato por período. Para repartidores conviene hablar de "lo que ganaste por tus entregas".

## 3. Freelancers, monotributistas y B2B: se puede, con un problema fiscal

**Civil: el pago vale si se pacta.** [Dato] Desde el DNU 70/23, el art. 765 del Código Civil y Comercial abarca la moneda "sea o no de curso legal", y los jueces no pueden cambiar la moneda pactada. La doctrina acepta que el deudor se libere pagando en cripto **si el acreedor lo aceptó** ([Microjuris](https://aldiaargentina.microjuris.com/2025/06/19/doctrina-criptomonedas-obligaciones-dinerarias-y-dnu-70-23/)). [Inferencia] El contrato o los términos de Continuum tienen que decir:
- que el acreedor acepta pagos parciales continuos (art. 869) en ARGt, a paridad 1:1;
- que la factura queda cancelada cuando lo devengado alcanza el total;
- que mientras el pagador pueda cancelar el stream, el depósito es una garantía, no un pago.

**Fiscal: el riesgo más grande.** [Dato] La **Ley Antievasión 25.345** dice que los pagos de más de $1.000 hechos fuera de los medios bancarios no son computables para deducir el gasto ni para tomar el crédito fiscal de IVA. El tope nunca se actualizó. La Corte la declaró inconstitucional en "Mera" (2014), pero ARCA puede impugnar igual. Hay un proyecto para derogarla, sin aprobación ([iProfesional](https://www.iprofesional.com/impuestos/429823-sanciones-arca-proponen-derogar-prohibicion-de-pagos-en-efectivo)). Ni la Ley 27.799 ni la 27.826 de Inocencia Fiscal la tocaron. La 27.826 sí agregó que quienes estén en Ganancias simplificada tienen que operar con medios autorizados por el BCRA o la CNV ([Consejo Salta](https://www.consejosalta.org.ar/wp-content/uploads/Ley-27.826-y-Dec-1160-2026.pdf)). [Inferencia, sin verificar] La cripto no está entre los medios válidos. **Mitigación:** que la compra de ARGt del pagador y la venta del receptor pasen por un banco o un PSAV registrado. **Para el pitch:** si un jurado pregunta, reconocer que esto se resuelve con un PSAV como puerta de entrada y de salida (por ejemplo belo).

**Factura de Crédito Electrónica MiPyME.** [Dato] Es obligatoria cuando una MiPyME le factura a una gran empresa desde $5.549.862 (desde el 14/4/2026). Para aceptarla hay que informar banco y CBU, y lo impago se cobra por débito al vencimiento. La Res. 424/2026 extendió el plazo de 21 días hasta el 31/10/2027 ([Microjuris](https://aldiaargentina.microjuris.com/2026/10/29/legislacion-factura-de-credito-electronica-mipymes-se-prorrogaron-los-plazos-de-aceptacion-y-rechazo/), [ARCA](https://servicioscf.afip.gob.ar/facturadecreditoelectronica/preguntasFrecuentes/receptor-factura.asp)). [Inferencia] Pagar una FCE en ARGt por fuera del registro arriesga un doble cobro. **El ejemplo B2B del pitch tiene que ser entre PyMEs o por debajo del umbral**, no "PyME que le factura a una gran empresa".

**Impuestos de ARGt** [Dato]:
- Ganancias: vender monedas digitales tributa 5% si son en moneda nacional sin ajuste y 15% si son en moneda extranjera o con ajuste ([iProfesional](https://www.iprofesional.com/actualidad/393767-ganancias-tratamiento-de-las-monedas-digitales-o-stablecoins)).
- Impuesto al cheque: el Decreto 475/2026 exime a las cuentas de PSAV registrados ([La Nación](https://www.lanacion.com.ar/economia/IA/el-gobierno-anuncio-que-los-psav-quedaran-exentos-del-impuesto-al-debito-y-credito-nid18062026/)).
- Bienes Personales: alcanza a los criptoactivos.
- Contabilidad: según la FACPCE se registran como intangibles, no como moneda.
- Sin fuentes: IVA de las stablecoins, Ingresos Brutos y SIRCREB.

**Facturación del monotributista.** [Inferencia] Se factura el período en pesos, como hoy. El stream es el mecanismo de pago, no el comprobante. Lo tiene que confirmar un contador.

## 4. Regulación financiera (sin investigación dedicada)

- **Rendimiento.** [Dato] En 2026 la CNV frenó ARGt porque se podía leer como un valor con interés. Levantó la medida el 15/4/2026, cuando quedó como "medio de pago digital vinculado al peso argentino, sin expectativa de intereses" ([iProUP](https://www.iproup.com/economia-digital/66852-cnv-levanta-la-sancion-contra-belo-y-twin-por-la-stablecoin-del-peso-argt)). En la UI y en el pitch, nunca usar "rendimiento", "interés", "invertir" ni "ahorro". Tampoco mandar el saldo no devengado al vault de Morpho.
- **Custodia (PSAV).** [Inferencia] Si Continuum guarda las claves de los usuarios, en producción probablemente sea un PSAV y deba registrarse en la CNV (Ley 27.739), con obligaciones antilavado ante la UIF (KYC). Opciones: un modelo no custodial (contrato + interfaz, el usuario firma) o la custodia en un partner registrado.
- **Crédito.** [Inferencia] No es crédito: el pagador deposita antes y el trabajador retira solo lo devengado, sin interés. Si un tercero pusiera la plata por adelantado, sí podría ser crédito y caer bajo el BCRA.
- **Captación de fondos.** [Inferencia] Que el depósito del pagador quede en un contrato que no controla Continuum ayuda a no caer en "intermediación financiera". Hay que confirmarlo.
- **Pendiente sin verificar:** si belo está registrado como PSAV, el régimen de proveedores de servicios de pago del BCRA y la normativa de la UIF aplicable.

## 5. Otros riesgos (sin investigación dedicada)

- **Datos personales (Ley 25.326)** [Inferencia]: en una chain pública cualquiera puede ver cuánto cobra cada dirección, y eso no se puede borrar. En producción no hay que vincular nombres con direcciones en ningún lugar público. Supabase, Vercel y Anthropic implican transferir datos al exterior.
- **Agente de IA** [Inferencia]: si ejecuta mal una regla, la responsabilidad es de Continuum. Por eso: confirmación humana antes de activar una regla, destinos en allowlist y nunca más que lo devengado. La política de uso de Anthropic pide supervisión humana en decisiones financieras de alto impacto (hay que verificar el texto).
- **Marcas** [Dato del PRD + Inferencia]: decir "diseñado para integrarse en belo", nunca "integrado". No copiar la marca ni la UI de belo. Revisar los términos de uso de la API pública de precios de belo y de los logos de Twin.
- **Claves en variables de entorno sobre mainnet** [Inferencia]: usar wallets demo con saldos mínimos y no reutilizarlas fuera de la demo.
- **Bugs del contrato** [Inferencia]: la plata depositada depende del código. En producción hace falta una auditoría. En el pitch, mencionar los tests.

## Cheat sheet legal para preguntas del jurado

| Pregunta | Respuesta |
|---|---|
| ¿Es legal pagar sueldos en ARGt? | "No. Desde la Ley 27.802 el sueldo se paga solo por banco. Continuum es para servicios: freelancers, repartidores independientes y proveedores." |
| ¿Y los repartidores? | "La ley de 2026 les permite cobrar en billetera electrónica. Por el riesgo de recalificación, devengamos por entrega, no por hora conectada." |
| ¿El pagador puede deducir ese gasto? | "Con la Ley Antievasión, el pago tiene que entrar y salir por medios regulados. Por eso la puerta de entrada y salida es un PSAV, como belo." |
| ¿Es un préstamo? | "No. La plata ya la depositó el pagador, el trabajador solo retira lo ganado y no hay interés." |
| ¿Quién custodia? | "En la demo, wallets de prueba. En producción, el usuario firma o la custodia la pone un PSAV registrado." |

## Pendientes para un abogado o contador

- Número del decreto que reglamentó la Ley 27.802 y qué artículos tienen vigencia diferida.
- Si una wallet con ARGt cuenta como "billetera electrónica" para el régimen de plataformas.
- Si ARCA acepta el pago en ARGt como pago computable (Ley Antievasión).
- IVA, Ingresos Brutos y SIRCREB sobre stablecoins.
- Si Continuum, siendo no custodial, igual sería PSAV.
- Cómo encuadra legalmente belo el pago de sueldos en cripto a sus empleados.
