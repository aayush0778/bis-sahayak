export function SchemeBadge({ scheme }: { scheme?: string | null }) {
  if (!scheme) return null;
  const isCrs = scheme.toUpperCase().includes("CRS");
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${
        isCrs ? "bg-violet-100 text-violet-800" : "bg-ink-800 text-saffron-400"
      }`}
    >
      {scheme}
    </span>
  );
}

export function MandatoryBadge({ mandatory }: { mandatory: boolean }) {
  return mandatory ? (
    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
      Mandatory certification
    </span>
  ) : (
    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
      Voluntary (no QCO on file)
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    "in-force": "bg-emerald-100 text-emerald-800",
    upcoming: "bg-saffron-400/20 text-ink-800 border border-saffron-500",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status === "upcoming" ? "Upcoming QCO" : "In force"}
    </span>
  );
}
