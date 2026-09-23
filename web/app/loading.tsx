export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="h-6 w-40 animate-pulse rounded bg-white/5" />
      <div className="mt-8 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
