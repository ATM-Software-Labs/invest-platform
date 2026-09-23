"use client";

import { listingDomain, logoUrl } from "@/lib/catalog";
import { useState } from "react";

export function CompanyLogo({
  id,
  name,
  domain,
  size = 24,
  muted = false,
}: {
  id: string;
  name: string;
  domain?: string | null;
  size?: number;
  muted?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = logoUrl(domain ?? listingDomain(id), id);
  const initials = initialsOf(name, id);

  if (!src || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-white/[0.04] font-mono text-[9px] font-medium text-neutral-400"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    // Favicons are third-party marks; onError falls back to initials.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-md bg-white object-contain p-px ${muted ? "logo-mute" : ""}`}
      style={{ width: size, height: size }}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function initialsOf(name: string, id: string): string {
  const words = name
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0]?.length >= 2) return words[0].slice(0, 2).toUpperCase();
  return id.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "·";
}
