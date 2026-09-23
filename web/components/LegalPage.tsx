import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">INVEST · cumplimiento</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight text-neutral-100">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">Última actualización: 20 de septiembre de 2026</p>
      <div className="legal-copy mt-8 space-y-4 text-sm leading-relaxed text-neutral-400">{children}</div>
    </article>
  );
}
