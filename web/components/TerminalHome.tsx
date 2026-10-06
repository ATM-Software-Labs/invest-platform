import { NewsletterSignup } from "@/components/NewsletterSignup";

export function TerminalHome() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-16 sm:py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">INVEST</p>
      <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-slate-50">
        Información de mercado, en claro.
      </h1>
      <p className="mt-4 text-[15px] leading-7 text-slate-400">
        INVEST es una página informativa de Trujillo Mingorance. Resume contexto de mercado a partir de
        información pública. No recomienda comprar ni vender, y no sustituye el criterio de cada persona.
      </p>
      <NewsletterSignup />
    </div>
  );
}
