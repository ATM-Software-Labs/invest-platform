import { LegalPage } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad · INVEST",
  description: "Información sobre el tratamiento de datos personales en invest.trujillomingorance.com.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <h2 className="text-neutral-100">1. Responsable</h2>
      <p>
        Alberto Trujillo Mingorance (Trujillo Mingorance / ATM Labs). Contacto:{" "}
        <a className="text-neutral-100 underline" href="mailto:security@trujillomingorance.com">
          security@trujillomingorance.com
        </a>
        .
      </p>
      <h2 className="text-neutral-100">2. Qué datos se tratan</h2>
      <p>
        INVEST no exige cuenta ni identifica al visitante. No se vende información personal. El tratamiento, cuando
        existe, se limita a datos técnicos imprescindibles para servir la página (dirección IP en registros de red del
        proveedor de infraestructura, Cloudflare) con base en el artículo 6.1.f del Reglamento (UE) 2016/679 (interés
        legítimo: seguridad y funcionamiento del servicio).
      </p>
      <h2 className="text-neutral-100">3. Mesa local</h2>
      <p>
        La lista de empresas de la mesa (las 50 predefinidas y las que usted añade) se guarda en el almacenamiento
        local de su navegador. No se envía a nuestros servidores. Puede borrar esos datos limpiando el almacenamiento
        del sitio o pulsando «Restablecer las 50».
      </p>
      <h2 className="text-neutral-100">4. Logotipos</h2>
      <p>
        Para mostrar la marca de cada sociedad se solicitan iconos públicos de dominio (servicio de faviconos). Esa
        petición puede revelar al proveedor el dominio de la compañía consultada, no su identidad. Los logotipos no se
        usan para elaborar un perfil comercial del visitante.
      </p>
      <h2 className="text-neutral-100">5. Destinatarios y transferencias</h2>
      <p>
        La infraestructura se sirve desde la red perimetral de Cloudflare. No se ceden datos a terceros para
        publicidad. No se elaboran perfiles ni se toman decisiones automatizadas con efectos jurídicos sobre el
        visitante.
      </p>
      <h2 className="text-neutral-100">6. Derechos</h2>
      <p>
        Puede solicitar acceso, rectificación, supresión, limitación, oposición y portabilidad, y reclamar ante la
        Agencia Española de Protección de Datos (AEPD, aepd.es). Como no hay cuenta, el ejercicio práctico de derechos
        sobre la mesa se hace en su propio navegador.
      </p>
      <h2 className="text-neutral-100">7. Conservación</h2>
      <p>
        Los registros técnicos de red se conservan el tiempo mínimo del proveedor. El almacenamiento local permanece
        hasta que usted lo borre.
      </p>
    </LegalPage>
  );
}
