import { RegulatoryBanner } from "@/components/RegulatoryBanner";

export function SiteFooter() {
  return (
    <footer className="mt-16">
      <RegulatoryBanner />
      <div className="mx-auto max-w-5xl px-5 py-10 text-[13px] leading-relaxed text-neutral-500">
        <p>
          INVEST es un terminal informativo de Trujillo Mingorance. Lee cuentas públicas y precios de mercado. No
          constituye asesoramiento en materia de inversión, oferta pública ni recomendación personalizada con arreglo
          a la Directiva 2014/65/UE (MiFID II) ni a la Ley 6/2023, de 17 de marzo, de los Mercados de Valores y de
          los Servicios de Inversión.
        </p>
        <p className="mt-3">
          Las rentabilidades pasadas no predicen rentabilidades futuras. Puede perderse la totalidad del capital. Un
          semáforo verde no garantiza ganancias. Los precios pueden ir retrasados y los fundamentos, incompletos.
        </p>
        <p className="mt-3">
          El titular no está inscrito en el registro de empresas de servicios de inversión de la CNMV ni presta el
          servicio de asesoramiento del artículo 140 de la Ley 6/2023.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-neutral-500">
          <a href="/aviso-legal/" className="hover:text-neutral-200">
            Aviso legal
          </a>
          <a href="/privacidad/" className="hover:text-neutral-200">
            Privacidad
          </a>
          <a href="/cookies/" className="hover:text-neutral-200">
            Cookies
          </a>
          <a href="https://labs.trujillomingorance.com" className="hover:text-neutral-200">
            ATM Labs
          </a>
          <span>Motor determinista · los modelos de IA no inventan ratios</span>
        </div>
      </div>
    </footer>
  );
}
