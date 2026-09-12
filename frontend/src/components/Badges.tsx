export function SchemeBadge({ scheme }: { scheme?: string | null }) {
  if (!scheme) return null;
  const isCrs = scheme.toUpperCase().includes("CRS");
  return (
    <span
      className={`smallcaps border px-2 py-0.5 text-xs font-semibold ${
        isCrs ? "border-navy/40 bg-navy-wash text-navy" : "border-navy bg-navy text-white"
      }`}
    >
      {scheme}
    </span>
  );
}

export function MandatoryBadge({ mandatory }: { mandatory: boolean }) {
  return mandatory ? (
    <span className="smallcaps border border-brass-deep bg-brass-wash px-2 py-0.5 text-xs font-bold text-brass-deep">
      Mandatory certification
    </span>
  ) : (
    <span className="smallcaps border border-paper-edge bg-paper-deep px-2 py-0.5 text-xs font-semibold text-ink-soft">
      Voluntary — no QCO on file
    </span>
  );
}

export function StatusPill({ status }: { status: "in-force" | "upcoming" }) {
  return status === "upcoming" ? (
    <span className="smallcaps border border-signal bg-signal-wash px-2 py-0.5 text-xs font-bold text-signal">
      Upcoming QCO
    </span>
  ) : (
    <span className="smallcaps border border-moss bg-moss-wash px-2 py-0.5 text-xs font-semibold text-moss">
      In force
    </span>
  );
}
