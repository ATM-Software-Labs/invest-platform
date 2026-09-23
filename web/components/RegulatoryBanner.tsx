export function RegulatoryBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] leading-relaxed text-slate-500">
        Información general, no asesoramiento en materia de inversión (MiFID II). Puede perderse el capital
        invertido.{" "}
        <a href="/aviso-legal/" className="text-slate-400 underline decoration-slate-700 underline-offset-2 hover:text-slate-200">
          Aviso legal
        </a>
      </p>
    );
  }

  return (
    <aside className="border-y border-white/5">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-3 text-[11px] leading-relaxed text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Esta web ofrece información general sobre sociedades cotizadas. No es una recomendación
          personalizada ni un servicio de inversión. No estamos registrados en la CNMV como empresa de
          servicios de inversión.
        </p>
        <p className="shrink-0">
          <a href="/aviso-legal/" className="hover:text-neutral-200">
            Aviso legal
          </a>
          <span className="mx-2 text-neutral-700">·</span>
          <a href="/privacidad/" className="hover:text-neutral-200">
            Privacidad
          </a>
          <span className="mx-2 text-neutral-700">·</span>
          <a href="/cookies/" className="hover:text-neutral-200">
            Cookies
          </a>
        </p>
      </div>
    </aside>
  );
}
