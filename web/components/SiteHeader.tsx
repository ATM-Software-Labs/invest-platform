"use client";

import { GlobalAssetSearchBar } from "@/components/GlobalAssetSearchBar";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0b0f17]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
        <Link href="/" className="shrink-0 text-[13px] font-extrabold uppercase tracking-[0.14em] text-slate-100">
          INVEST
        </Link>
        <div className="min-w-0 flex-1">
          <GlobalAssetSearchBar />
        </div>
      </div>
    </header>
  );
}
