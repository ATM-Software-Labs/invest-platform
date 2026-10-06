// Page bodies (Spanish body text; chrome is i18n'd elsewhere). Original text by INVEST.
export const PROSE = "prose-atm space-y-4 text-base leading-relaxed text-mute [&_h2]:mt-8 [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_strong]:text-ink [&_code]:font-mono [&_code]:text-sm [&_code]:text-accent [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2";

export const mungerIntro = `
<p>El checklist resume en tres preguntas medibles una idea que Charlie Munger repiti&oacute; muchas veces: preferir negocios que generan mucho dinero sobre lo que venden y que no dependen de la deuda para sobrevivir. <strong>Munger nunca public&oacute; esta lista exacta</strong>; es una simplificaci&oacute;n nuestra, inspirada en esa idea, para leer cifras p&uacute;blicas con criterio y sin adornos.</p>
<p>No es una puntuaci&oacute;n, no ordena empresas y no es una se&ntilde;al de compra o venta. Solo dice si tres cifras del &uacute;ltimo informe anual cumplen o no un umbral fijo, y cu&aacute;ndo no hay datos suficientes para decirlo.</p>`;

export const mungerBody = `
<h2 id="criterios">Los tres criterios</h2>
<div class="callout">
  <h3 class="font-sans text-base font-semibold text-ink">1. Margen neto &ge; 15&nbsp;%</h3>
  <p class="mt-2"><strong>Qu&eacute; mide:</strong> qu&eacute; parte de cada euro (o d&oacute;lar) vendido queda como beneficio despu&eacute;s de todos los gastos, intereses e impuestos.</p>
  <p class="mt-2"><strong>Por qu&eacute; importa:</strong> un margen alto y sostenido suele indicar poder de fijaci&oacute;n de precios o una ventaja de costes. Un margen fino deja poco espacio para errores.</p>
  <p class="mt-2"><strong>C&aacute;lculo:</strong> <code>NetIncomeLoss / Ingresos</code>, donde ingresos es el primer concepto disponible entre <code>RevenueFromContractWithCustomerExcludingAssessedTax</code>, <code>Revenues</code> y <code>SalesRevenueNet</code>. Solo se calcula si ambas cifras corresponden al mismo cierre de ejercicio.</p>
</div>
<div class="callout">
  <h3 class="font-sans text-base font-semibold text-ink">2. Margen de flujo de caja libre &ge; 10&nbsp;%</h3>
  <p class="mt-2"><strong>Qu&eacute; mide:</strong> el efectivo que genera la operaci&oacute;n despu&eacute;s de pagar las inversiones en activo fijo, en proporci&oacute;n a las ventas.</p>
  <p class="mt-2"><strong>Por qu&eacute; importa:</strong> el beneficio contable puede no convertirse en caja. El flujo de caja libre es lo que de verdad queda para reducir deuda, recomprar acciones, pagar dividendos o aguantar un mal a&ntilde;o.</p>
  <p class="mt-2"><strong>C&aacute;lculo:</strong> <code>FCF = NetCashProvidedByUsedInOperatingActivities &minus; PaymentsToAcquirePropertyPlantAndEquipment</code>; margen FCF <code>= FCF / Ingresos</code>, con las tres cifras del mismo cierre.</p>
</div>
<div class="callout">
  <h3 class="font-sans text-base font-semibold text-ink">3. Efectivo &ge; deuda a largo plazo</h3>
  <p class="mt-2"><strong>Qu&eacute; mide:</strong> si la caja y las inversiones a corto plazo bastar&iacute;an para cubrir la deuda financiera a largo plazo.</p>
  <p class="mt-2"><strong>Por qu&eacute; importa:</strong> es la versi&oacute;n en balance de la <a href="/ensayos/redundancia-de-efectivo/">redundancia de efectivo</a>: una empresa que no necesita refinanciarse no puede ser obligada a vender en el peor momento.</p>
  <p class="mt-2"><strong>C&aacute;lculo:</strong> efectivo <code>= CashCashEquivalentsAndShortTermInvestments</code> (o, si no existe, <code>CashAndCashEquivalentsAtCarryingValue</code>) frente a deuda LP <code>= LongTermDebtNoncurrent</code> (o <code>LongTermDebt</code>).</p>
</div>

<h2 id="calculo">C&oacute;mo se obtiene el resultado</h2>
<ol>
<li>El precio viene de Yahoo Finance (puede ir retrasado). Si el s&iacute;mbolo cotiza en EE.&nbsp;UU., se busca su n&uacute;mero CIK en la lista p&uacute;blica de la SEC.</li>
<li>Para cada concepto se consulta la API XBRL de la SEC (<code>data.sec.gov</code>) y se toma el dato anual m&aacute;s reciente presentado en un formulario <strong>10-K</strong> (periodo fiscal completo, <code>fp = FY</code>). Cada cifra enlaza a su fuente.</li>
<li>Cada criterio queda como <strong>Cumple</strong>, <strong>No cumple</strong> o <strong>Sin datos</strong>. Si falta una cifra, no se rellena con cero ni se estima.</li>
<li>El resumen &laquo;Coincide con X de Y&raquo; cuenta solo los criterios medibles (Y puede ser 0, 1, 2 o 3). No hay ponderaciones ni nota de 1 a 10.</li>
</ol>

<h2 id="limites">L&iacute;mites del m&eacute;todo</h2>
<ul>
<li><strong>Una sola foto anual.</strong> Un buen o mal a&ntilde;o puntual cambia el resultado; no mide la tendencia ni la estabilidad de los m&aacute;rgenes.</li>
<li><strong>No mide el precio.</strong> Un negocio excelente puede estar caro. El checklist no dice nada del <a href="/modelos/#margen-de-seguridad">margen de seguridad</a>.</li>
<li><strong>Sectores donde no encaja:</strong> bancos, aseguradoras y otras financieras tienen balances en los que &laquo;deuda&raquo; y &laquo;efectivo&raquo; significan otra cosa; el resultado ah&iacute; no es comparable.</li>
<li><strong>Deuda incompleta:</strong> no incluye deuda a corto plazo, arrendamientos ni obligaciones por pensiones.</li>
<li><strong>Capex parcial:</strong> solo pagos por inmovilizado material; no incluye adquisiciones ni software capitalizado.</li>
<li><strong>Etiquetas XBRL variables:</strong> si una empresa usa otro concepto contable, el criterio aparece como &laquo;Sin datos&raquo; aunque la cifra exista en el informe.</li>
<li><strong>Umbrales redondos:</strong> 15&nbsp;% y 10&nbsp;% son heur&iacute;sticas, no leyes. Un 14,9&nbsp;% no es peor negocio que un 15,1&nbsp;%.</li>
<li><strong>Solo EE.&nbsp;UU.:</strong> sin filings SEC no hay checklist (por ejemplo, la mayor&iacute;a de cotizadas espa&ntilde;olas).</li>
<li><strong>Lo que no ve:</strong> calidad de la direcci&oacute;n, incentivos, ventaja competitiva duradera, riesgos regulatorios. Ver <a href="/modelos/">modelos mentales</a>.</li>
</ul>

<h2 id="aviso">Aviso</h2>
<p>Informaci&oacute;n general y educativa elaborada de forma automatizada a partir de datos p&uacute;blicos. No es asesoramiento en materia de inversi&oacute;n ni una recomendaci&oacute;n personalizada con arreglo a la Directiva 2014/65/UE (MiFID II) y a la Ley 6/2023. Los datos pueden ser incompletos o err&oacute;neos; compru&eacute;belos en la fuente enlazada.</p>`;

const models = [
  ["margen-de-seguridad", "Margen de seguridad", "Comprar o decidir dejando una holgura entre lo que se cree que vale algo y lo que se paga por ello. La holgura no est&aacute; para ganar m&aacute;s, sino para que un error de estimaci&oacute;n no se convierta en una p&eacute;rdida grave.", "Si mi estimaci&oacute;n est&aacute; equivocada en un tercio, &iquest;sigue siendo una decisi&oacute;n razonable?"],
  ["circulo-de-competencia", "C&iacute;rculo de competencia", "Saber d&oacute;nde termina lo que uno entiende de verdad. Importa menos el tama&ntilde;o del c&iacute;rculo que conocer su borde: fuera de &eacute;l, la confianza crece m&aacute;s r&aacute;pido que el conocimiento. El <a href=\"/perfil/\">perfil</a> de INVEST sirve para anotar ese borde.", "&iquest;Podr&iacute;a explicar c&oacute;mo gana dinero este negocio y qu&eacute; lo har&iacute;a fracasar?"],
  ["inversion", "Inversi&oacute;n (pensar al rev&eacute;s)", "En lugar de preguntar c&oacute;mo acertar, preguntar c&oacute;mo se fracasar&iacute;a con seguridad y evitarlo. Suele ser m&aacute;s f&aacute;cil enumerar errores que recetas de &eacute;xito, y evitar la ruina pesa m&aacute;s que optimizar el rendimiento.", "&iquest;Qu&eacute; tendr&iacute;a que pasar para que esto saliera muy mal, y cu&aacute;nto me importa?"],
  ["coste-de-oportunidad", "Coste de oportunidad", "Toda decisi&oacute;n se compara con la mejor alternativa disponible, no con no hacer nada. Una opci&oacute;n &laquo;buena&raquo; puede ser mala si desplaza otra mejor que ya se entiende.", "&iquest;Es esto mejor que lo mejor que ya tengo o conozco?"],
  ["redundancia", "Redundancia y colch&oacute;n de efectivo", "Mantener capacidad sobrante (caja, tiempo, alternativas) que casi nunca se usa. Parece ineficiente en a&ntilde;os tranquilos y es lo que permite no vender en el peor momento. Desarrollado en el <a href=\"/ensayos/redundancia-de-efectivo/\">ensayo sobre redundancia de efectivo</a>.", "Si ma&ntilde;ana necesitara liquidez durante un a&ntilde;o, &iquest;de d&oacute;nde saldr&iacute;a sin vender nada?"],
  ["tasas-base", "Tasas base", "Antes de mirar los detalles de un caso, preguntar qu&eacute; suele pasar con casos parecidos. La historia concreta casi siempre es m&aacute;s convincente que la estad&iacute;stica, y casi siempre deber&iacute;a pesar menos.", "&iquest;Con qu&eacute; frecuencia les sale bien esto a quienes lo intentan en situaciones parecidas?"],
  ["incentivos", "Incentivos", "Entender qui&eacute;n gana qu&eacute; con cada decisi&oacute;n o recomendaci&oacute;n. Los incentivos explican buena parte del comportamiento de directivos, intermediarios y de uno mismo, a menudo sin mala fe.", "&iquest;Qui&eacute;n cobra si hago esto, y cobrar&iacute;a igual si sale mal?"]
];
export const modelosBody = `
<p>Herramientas para pensar antes de decidir. Cada una cabe en una pregunta; ninguna es una regla de inversi&oacute;n ni una recomendaci&oacute;n.</p>
<nav class="flex flex-wrap gap-2 not-prose" aria-label="Modelos">
${models.map(m => `<a href="#${m[0]}" class="rounded-full border border-line bg-elev px-3 py-1 text-xs font-medium text-mute no-underline hover:text-ink">${m[1]}</a>`).join("\n")}
</nav>
${models.map((m, i) => `<section class="callout" id="${m[0]}" aria-labelledby="${m[0]}-t">
  <div class="flex items-center gap-2"><span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Modelo ${i + 1}</span></div>
  <h2 id="${m[0]}-t" class="!mt-2 text-base font-semibold text-ink">${m[1]}</h2>
  <p class="mt-2">${m[2]}</p>
  <p class="mt-3 font-mono text-xs text-dim">Pregunta &uacute;til: <span class="text-ink">${m[3]}</span></p>
</section>`).join("\n")}
<p class="font-mono text-xs text-dim">Textos propios de INVEST con fin educativo. No constituyen asesoramiento (MiFID II / Ley 6/2023).</p>`;

const terms = [
  ["ticker", "Ticker o s&iacute;mbolo", "C&oacute;digo con el que cotiza un valor (p.&nbsp;ej. <code>AAPL</code>). Los mercados no estadounidenses llevan sufijo: <code>.MC</code> para Madrid."],
  ["precio", "Precio de mercado", "&Uacute;ltimo precio que devuelve Yahoo Finance en la moneda de cotizaci&oacute;n. Puede ir retrasado y no es un precio de ejecuci&oacute;n."],
  ["variacion", "Variaci&oacute;n diaria", "Cambio porcentual frente al cierre anterior seg&uacute;n Yahoo. Se muestra en el mismo color que el resto del texto: no es una se&ntilde;al."],
  ["sec", "SEC / EDGAR", "Comisi&oacute;n del Mercado de Valores de EE.&nbsp;UU. y su base de datos p&uacute;blica de informes. INVEST usa su API XBRL (<code>data.sec.gov</code>)."],
  ["10-k", "10-K", "Informe anual que las cotizadas estadounidenses presentan ante la SEC, con estados financieros auditados. Solo se usan cifras de 10-K del ejercicio completo."],
  ["xbrl", "XBRL", "Formato que etiqueta cada cifra del informe con un concepto contable (p.&nbsp;ej. <code>NetIncomeLoss</code>). Si la empresa usa otra etiqueta, la cifra aparece como &laquo;sin dato&raquo;."],
  ["ejercicio", "Ejercicio fiscal (FY) y cierre", "Periodo anual que cubre el informe y su fecha de cierre. Algunas empresas cierran fuera de diciembre."],
  ["ingresos", "Ingresos", "Ventas del ejercicio. Primer concepto disponible entre <code>RevenueFromContractWithCustomerExcludingAssessedTax</code>, <code>Revenues</code> y <code>SalesRevenueNet</code>."],
  ["resultado-neto", "Resultado neto", "Beneficio (o p&eacute;rdida) despu&eacute;s de todos los gastos, intereses e impuestos (<code>NetIncomeLoss</code>)."],
  ["margen-neto", "Margen neto", "Resultado neto dividido entre ingresos del mismo ejercicio. Criterio 1 del <a href=\"/munger/\">checklist</a> (&ge; 15&nbsp;%)."],
  ["fco", "Flujo de caja de explotaci&oacute;n", "Efectivo generado por la actividad ordinaria (<code>NetCashProvidedByUsedInOperatingActivities</code>)."],
  ["capex", "Pagos por inmovilizado (capex)", "Efectivo invertido en activo fijo material (<code>PaymentsToAcquirePropertyPlantAndEquipment</code>)."],
  ["fcf", "Flujo de caja libre (FCF)", "Flujo de explotaci&oacute;n menos capex. Lo que queda para deuda, dividendos, recompras o reservas."],
  ["margen-fcf", "Margen FCF", "FCF dividido entre ingresos del mismo ejercicio. Criterio 2 del checklist (&ge; 10&nbsp;%)."],
  ["efectivo", "Efectivo", "Caja, equivalentes e inversiones a corto plazo cuando la empresa las reporta juntas; si no, solo caja y equivalentes."],
  ["deuda-lp", "Deuda a largo plazo (deuda LP)", "Deuda financiera con vencimiento superior a un a&ntilde;o (<code>LongTermDebtNoncurrent</code> o <code>LongTermDebt</code>). No incluye arrendamientos ni deuda a corto."],
  ["etf", "ETF", "Fondo cotizado. No presenta 10-K como una empresa operativa, por eso no tiene checklist."],
  ["coincide", "&laquo;Coincide con X de Y&raquo;", "Cu&aacute;ntos criterios se cumplen (X) entre los que se pueden medir con datos reales (Y). No es una nota."],
  ["sin-dato", "Sin dato / Sin datos", "La fuente no devuelve la cifra o no es comparable. Nunca se sustituye por cero ni por una estimaci&oacute;n."]
];
export const glosarioBody = `
<p>T&eacute;rminos que aparecen en la consulta, en el <a href="/munger/">checklist Munger</a> y en <a href="/comparar/">comparar</a>.</p>
<dl class="term space-y-4">
${terms.map(t => `<div class="callout" id="${t[0]}"><dt>${t[1]}</dt><dd class="mt-1.5">${t[2]}</dd></div>`).join("\n")}
</dl>`;

export const privBody = `
<h2>1. Responsable</h2>
<p>Alberto Trujillo Mingorance (Trujillo Mingorance / ATM Labs). Contacto: <a href="mailto:security@trujillomingorance.com">security@trujillomingorance.com</a>.</p>
<h2>2. Qu&eacute; datos se tratan</h2>
<p><strong>Suscripci&oacute;n por correo (opcional).</strong> Si te suscribes desde <a href="/suscribirse/">/suscribirse/</a> se tratan: tu direcci&oacute;n de correo, las listas que elijas (<em>Markets</em> y/o <em>INVEST</em>), la fecha de alta y los datos t&eacute;cnicos de la confirmaci&oacute;n que registra el proveedor de listas (fecha y, en su caso, IP de confirmaci&oacute;n). Se usa doble confirmaci&oacute;n (doble opt-in): no se te a&ntilde;ade a ninguna lista hasta que pulsas el enlace del correo de confirmaci&oacute;n. Mientras el formulario indique &laquo;Suscripci&oacute;n disponible pronto&raquo;, no se recoge ning&uacute;n dato.</p>
<p><strong>Finalidad:</strong> enviarte &uacute;nicamente las listas elegidas: <em>Markets</em> (actualizaciones de mercado en las franjas de 09:00, 15:00 y 22:15, hora de Madrid, desde markets@trujillomingorance.com) e <em>INVEST</em> (educaci&oacute;n, modelos mentales e ideas de inversi&oacute;n con fin educativo, desde invest@trujillomingorance.com). <strong>Base jur&iacute;dica:</strong> tu consentimiento (art. 6.1.a RGPD), que puedes retirar en cualquier momento.</p>
<p><strong>Control anti-abuso.</strong> El formulario usa Cloudflare Turnstile para distinguir personas de bots, un campo trampa invisible y un l&iacute;mite de intentos. Para ese l&iacute;mite se guarda durante un m&aacute;ximo de una hora un resumen criptogr&aacute;fico (hash) de la IP, y durante 15 minutos un hash del correo para evitar env&iacute;os repetidos. La IP no se guarda en claro.</p>
<p><strong>Navegador.</strong> Pueden guardarse preferencias t&eacute;cnicas (b&uacute;squedas recientes, listas, favoritos, perfil, conteos de an&aacute;lisis, tema, idioma) en <code>localStorage</code>, sin enviarlas al servidor.</p>
<h2>3. Destinatarios y transferencias</h2>
<p>Encargados del tratamiento: <strong>Brevo</strong> (Sendinblue SAS, Francia, UE), que aloja las listas y env&iacute;a el correo de confirmaci&oacute;n; <strong>Resend</strong> (Resend, Inc., EE.&nbsp;UU.), que puede usarse para el env&iacute;o de los correos de las listas; y <strong>Cloudflare</strong> (alojamiento del sitio y Turnstile), que trata datos t&eacute;cnicos de conexi&oacute;n. Las transferencias a EE.&nbsp;UU. se amparan en las garant&iacute;as previstas en el RGPD (Marco de Privacidad de Datos UE-EE.&nbsp;UU. o cl&aacute;usulas contractuales tipo). No se ceden datos a terceros con fines comerciales.</p>
<h2>4. Derechos</h2>
<p>Puede ejercer acceso, rectificaci&oacute;n, supresi&oacute;n, oposici&oacute;n, limitaci&oacute;n y portabilidad escribiendo a <a href="mailto:security@trujillomingorance.com">security@trujillomingorance.com</a>. Tambi&eacute;n puede reclamar ante la Agencia Espa&ntilde;ola de Protecci&oacute;n de Datos (AEPD).</p>
<h2>5. Conservaci&oacute;n y baja</h2>
<p>El correo se conserva mientras la suscripci&oacute;n est&eacute; activa. Cada correo incluye un enlace de baja y de preferencias para dejar una lista o las dos; tambi&eacute;n puede pedirla escribiendo a la direcci&oacute;n de contacto. Si no confirmas la suscripci&oacute;n, no se te a&ntilde;ade a ninguna lista. Los datos en <code>localStorage</code> permanecen en su dispositivo hasta que los borre.</p>
`;

export const cookiesBody = `
<h2>1. Principio</h2>
<p>INVEST no utiliza cookies de publicidad, anal&iacute;tica de terceros ni rastreo entre sitios. Conforme a la Directiva 2002/58/CE (privacidad electr&oacute;nica) y a la Gu&iacute;a de cookies de la AEPD, las cookies estrictamente necesarias para el servicio no requieren consentimiento previo.</p>
<h2>2. Qu&eacute; se usa</h2>
<p><strong>Almacenamiento local (localStorage)</strong>:</p>
<ul>
<li>Clave <code>invest.searches.v1</code>: b&uacute;squedas con resultado correcto (hasta 20) para reutilizarlas en el dispositivo.</li>
<li>Clave <code>invest.lists.v1</code>: listas de tickers creadas por el usuario en el navegador.</li>
<li>Clave <code>invest.favorites.v1</code>: favoritos (estrella) sin necesidad de crear una lista.</li>
<li>Clave <code>invest.profile.v1</code>: perfil inversor local (edad, pa&iacute;s, sectores conocidos).</li>
<li>Clave <code>invest.analysis.v1</code>: conteo de an&aacute;lisis con resultado por ticker (filtro &laquo;M&aacute;s analizados&raquo;).</li>
<li>Clave <code>invest.theme.v1</code>: preferencia de tema claro/oscuro.</li>
<li>Clave <code>invest.lang.v1</code>: preferencia de idioma (es/en) para la interfaz.</li>
</ul>
<p><strong>Cloudflare Turnstile</strong>: solo se carga en los formularios de suscripci&oacute;n, cuando la suscripci&oacute;n est&aacute; activa, para comprobar que quien env&iacute;a es una persona. Es un elemento de seguridad estrictamente necesario para ese formulario; no se usa para publicidad ni perfilado.</p>
<p>El proveedor de red (Cloudflare) puede fijar cookies t&eacute;cnicas de seguridad o de equilibrio de carga. No las usamos para perfilar.</p>
<h2>3. C&oacute;mo desactivarlas</h2>
<p>Puede borrar el almacenamiento del sitio en la configuraci&oacute;n del navegador. Si bloquea todo el almacenamiento, las b&uacute;squedas y listas no se recordar&aacute;n entre visitas.</p>
`;

export const subscribeInfo = `
<h2 id="que-recibes">Qu&eacute; recibir&aacute;s</h2>
<ul>
<li><strong>Markets</strong> (desde <code>markets@trujillomingorance.com</code>): actualizaciones de mercado en cada franja del d&iacute;a: ma&ntilde;ana 09:00, mediod&iacute;a 15:00 y cierre 22:15 (hora de Madrid). Contexto informativo, sin se&ntilde;ales de compra o venta.</li>
<li><strong>INVEST</strong> (desde <code>invest@trujillomingorance.com</code>): educaci&oacute;n, modelos mentales e ideas de inversi&oacute;n con fin educativo, como los <a href="/ensayos/redundancia-de-efectivo/">ensayos del cuaderno</a>. Sin frecuencia fija.</li>
</ul>
<h2 id="como-funciona">C&oacute;mo funciona</h2>
<ol>
<li>Marcas una lista o las dos, escribes tu correo y aceptas la pol&iacute;tica de privacidad.</li>
<li>Recibes un correo de confirmaci&oacute;n desde <code>invest@trujillomingorance.com</code>. Hasta que no pulsas el enlace, no se te a&ntilde;ade a ninguna lista (doble opt-in).</li>
<li>Cada correo incluye un enlace para darte de baja o cambiar de lista.</li>
</ol>
<h2 id="datos">Datos y filtro de calidad</h2>
<p>Solo se guarda lo necesario: correo, listas elegidas y fechas de alta y confirmaci&oacute;n. Para evitar abusos se usan Cloudflare Turnstile, un campo trampa invisible, validaci&oacute;n b&aacute;sica del correo y un l&iacute;mite de intentos. Detalles en la <a href="/privacidad/">pol&iacute;tica de privacidad</a>.</p>
<p class="font-mono text-xs text-dim">Informaci&oacute;n general y educativa. No es asesoramiento en materia de inversi&oacute;n (MiFID II / Ley 6/2023). Contacto: <a href="mailto:security@trujillomingorance.com">security@trujillomingorance.com</a>.</p>`;
