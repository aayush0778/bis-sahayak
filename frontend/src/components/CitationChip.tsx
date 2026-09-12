import type { Citation } from "../lib/api";

export default function CitationChip({ citation, animate = false }: { citation: Citation; animate?: boolean }) {
  const label = citation.type === "qco" ? `QCO: ${truncate(citation.ref, 48)}` : citation.ref;
  return (
    <a
      href={citation.source_url ?? "https://services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/Indian_standards"}
      target="_blank"
      rel="noreferrer"
      title={`Source: ${citation.ref} — click to verify at the official source`}
      className={`inline-flex max-w-full items-center gap-1 border border-navy bg-navy px-2.5 py-0.5 text-xs font-medium text-white hover:bg-navy-deep ${
        animate ? "stamp-in" : ""
      }`}
    >
      <span aria-hidden className="text-brass">
        §
      </span>
      <span className="truncate">{label}</span>
    </a>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
