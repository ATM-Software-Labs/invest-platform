"use client";

import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-800/80 bg-[#0b0f17]">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="text-[13px] font-medium tracking-[0.14em] text-slate-200">
          INVEST
        </Link>
        <nav className="flex items-center gap-3 text-[12px] text-slate-400">
          <a
            href="https://charts.trujillomingorance.com/"
            className="hover:text-slate-200"
          >
            Markets Briefing
          </a>
        </nav>
      </div>
    </header>
  );
}
