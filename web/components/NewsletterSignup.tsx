"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Status = "idle" | "loading" | "done" | "invalid" | "unavailable" | "error";

const STATUS_COPY: Record<Exclude<Status, "idle" | "loading">, string> = {
  done: "Listo. Recibirás las notas en ese correo.",
  invalid: "Escribe un correo válido.",
  unavailable: "La suscripción no está activa en este momento.",
  error: "No se ha podido completar. Inténtalo de nuevo.",
};

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (response.ok && data?.ok) {
        setStatus("done");
        setEmail("");
        return;
      }
      if (data?.error === "invalid_email") {
        setStatus("invalid");
        return;
      }
      if (response.status === 503 || data?.error === "not_configured") {
        setStatus("unavailable");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const feedback = status === "idle" || status === "loading" ? null : STATUS_COPY[status];

  return (
    <section
      aria-labelledby="digest-title"
      className="mt-10 rounded-xl border border-slate-800 bg-slate-950/40 p-5 sm:p-6"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">Boletín</p>
      <h2 id="digest-title" className="mt-2 text-lg font-medium tracking-tight text-slate-100">
        Markets Digest
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Notas de mercado entre semana. No es consejo de inversión.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row" noValidate>
        <label className="sr-only" htmlFor="digest-email">
          Correo electrónico
        </label>
        <input
          id="digest-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle" && status !== "loading") setStatus("idle");
          }}
          placeholder="tu@correo.com"
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70"
        >
          {status === "loading" ? "Enviando…" : "Suscribirme"}
        </button>
      </form>
      {feedback ? (
        <p className="mt-3 text-[13px] text-slate-300" role="status">
          {feedback}
        </p>
      ) : null}
      <p className="mt-3 text-[12px] leading-5 text-slate-500">
        El correo se usa solo para esas notas. Consulta la{" "}
        <Link
          href="/privacidad/"
          className="text-slate-300 underline decoration-slate-600 underline-offset-2 hover:text-white"
        >
          privacidad
        </Link>
        .
      </p>
    </section>
  );
}
