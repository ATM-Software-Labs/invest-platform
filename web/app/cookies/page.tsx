import { LegalPage } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies · INVEST",
  description: "Política de cookies y almacenamiento local de invest.trujillomingorance.com.",
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies y almacenamiento">
      <h2 className="text-neutral-100">1. Principio</h2>
      <p>
        INVEST no utiliza cookies de publicidad, analítica de terceros ni rastreo entre sitios. Conforme a la
        Directiva 2002/58/CE (privacidad electrónica) y a la Guía de cookies de la AEPD, las cookies estrictamente
        necesarias para el servicio no requieren consentimiento previo.
      </p>
      <h2 className="text-neutral-100">2. Qué se usa</h2>
      <p>
        <strong className="text-neutral-100">Almacenamiento local (localStorage)</strong>, clave{" "}
        <code className="text-neutral-100">invest.mesa.v1</code>: guarda los identificadores de las empresas de su
        mesa para que, al volver, sigan las 50 predefinidas más las que haya añadido. Es un dato técnico del terminal,
        no un identificador publicitario.
      </p>
      <p>
        El proveedor de red (Cloudflare) puede fijar cookies técnicas de seguridad o de equilibrio de carga. No las
        usamos para perfilar.
      </p>
      <h2 className="text-neutral-100">3. Cómo desactivarlas</h2>
      <p>
        Puede borrar el almacenamiento del sitio en la configuración del navegador o pulsar «Restablecer las 50» en la
        mesa. Si bloquea todo el almacenamiento, la mesa volverá al listado predefinido en cada visita.
      </p>
    </LegalPage>
  );
}
