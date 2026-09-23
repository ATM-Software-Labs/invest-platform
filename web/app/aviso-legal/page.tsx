import { LegalPage } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso legal · INVEST",
  description: "Información societaria y descargo de responsabilidad de invest.trujillomingorance.com.",
};

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal">
      <h2 className="text-neutral-100">1. Titular del sitio</h2>
      <p>
        El sitio <strong className="text-neutral-100">invest.trujillomingorance.com</strong> (en adelante, «INVEST») es
        un terminal informativo editado por Alberto Trujillo Mingorance, que opera bajo la marca Trujillo Mingorance /
        ATM Labs. Contacto:{" "}
        <a className="text-neutral-100 underline" href="mailto:security@trujillomingorance.com">
          security@trujillomingorance.com
        </a>
        . Sitio institucional:{" "}
        <a className="text-neutral-100 underline" href="https://labs.trujillomingorance.com">
          labs.trujillomingorance.com
        </a>
        .
      </p>
      <h2 className="text-neutral-100">2. Naturaleza del servicio</h2>
      <p>
        INVEST publica información general sobre instrumentos financieros y sociedades cotizadas, elaborada de forma
        automatizada a partir de cuentas públicas y precios de mercado. El contenido se ofrece únicamente con fines
        informativos y educativos.
      </p>
      <h2 className="text-neutral-100">3. No es asesoramiento en materia de inversión</h2>
      <p>
        Nada de lo publicado constituye asesoramiento en materia de inversión, recomendación personalizada, oferta
        pública, colocación, ni invitación a contratar un instrumento financiero, en el sentido de la Directiva
        2014/65/UE del Parlamento Europeo y del Consejo, de 15 de mayo de 2014 (MiFID II), del Reglamento (UE)
        600/2014 (MiFIR) y de la Ley 6/2023, de 17 de marzo, de los Mercados de Valores y de los Servicios de
        Inversión.
      </p>
      <p>
        El titular <strong className="text-neutral-100">no</strong> está inscrito en el registro de empresas de
        servicios de inversión de la Comisión Nacional del Mercado de Valores (CNMV) ni presta el servicio de
        asesoramiento previsto en el artículo 140 de la Ley 6/2023. Un semáforo, una afinidad o un comentario de
        modelo de lenguaje no equivalen a una recomendación a comprar, vender o mantener.
      </p>
      <h2 className="text-neutral-100">4. Riesgo y rentabilidades</h2>
      <p>
        Invertir en acciones, deuda, criptoactivos o divisas conlleva riesgo de pérdida, incluida la pérdida total del
        capital. Las rentabilidades pasadas no predicen rentabilidades futuras. Los precios pueden ir retrasados. Los
        fundamentos pueden estar incompletos, estimados o no ser comparables entre normas contables (NIIF / US GAAP).
      </p>
      <h2 className="text-neutral-100">5. Propiedad intelectual y marcas</h2>
      <p>
        Los logotipos, denominaciones sociales y marcas de las compañías mostradas pertenecen a sus respectivos
        titulares y se reproducen con carácter meramente identificativo. INVEST no está afiliado, patrocinado ni
        aprobado por dichas compañías, salvo indicación expresa.
      </p>
      <h2 className="text-neutral-100">6. Limitación de responsabilidad</h2>
      <p>
        Se procura la exactitud de los datos, sin garantizarla. El titular no responde de decisiones de inversión,
        omisiones de proveedores de mercado, interrupciones del servicio ni de daños derivados del uso de la
        información, en la medida permitida por el derecho español y de la Unión Europea.
      </p>
      <h2 className="text-neutral-100">7. Ley aplicable</h2>
      <p>
        Este aviso se rige por la legislación española y, en lo que resulte de aplicación, por el derecho de la Unión
        Europea. Para cualquier controversia, con carácter previo se intentará una solución amistosa.
      </p>
    </LegalPage>
  );
}
