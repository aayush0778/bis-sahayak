import { useState } from "react";

type Scheme = "isi" | "hallmark" | "crs";

function Label({ n, x, y }: { n: number; x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9" fill="#B8860B" />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#FAF8F3">
        {n}
      </text>
    </g>
  );
}

function IsiDiagram() {
  return (
    <svg viewBox="0 0 420 200" className="w-full max-w-lg" role="img" aria-label="Schematic of the ISI mark on a certified product">
      <rect x="10" y="10" width="400" height="180" fill="#FAF8F3" stroke="#E7E1D3" />
      {/* product surface */}
      <text x="30" y="42" fontSize="11" fill="#8A8478">
        On a genuine product you should find all three:
      </text>
      {/* IS number above */}
      <text x="210" y="78" textAnchor="middle" fontSize="17" fontWeight="600" fill="#1C1B19" fontFamily="Georgia, serif">
        IS 2347 : 2017
      </text>
      <Label n={1} x={330} y={73} />
      {/* ISI word-mark device (schematic) */}
      <path d="M150 95 L270 95 L262 150 L158 150 Z" fill="none" stroke="#1E3A5F" strokeWidth="3" />
      <text x="210" y="133" textAnchor="middle" fontSize="34" fontWeight="800" fill="#1E3A5F" fontFamily="Georgia, serif" fontStyle="italic">
        ISI
      </text>
      <Label n={2} x={285} y={120} />
      {/* licence number below */}
      <text x="210" y="176" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1C1B19" fontFamily="monospace">
        CM/L-8200123456
      </text>
      <Label n={3} x={330} y={171} />
    </svg>
  );
}

function HallmarkDiagram() {
  return (
    <svg viewBox="0 0 420 210" className="w-full max-w-lg" role="img" aria-label="Schematic of the BIS hallmark on gold jewellery">
      <rect x="10" y="10" width="400" height="190" fill="#FAF8F3" stroke="#E7E1D3" />
      <text x="30" y="40" fontSize="11" fill="#8A8478">
        All four parts are required together on hallmarked gold jewellery:
      </text>
      {/* 1. BIS triangle logo (schematic) */}
      <path d="M70 120 L110 60 L150 120 Z" fill="none" stroke="#1E3A5F" strokeWidth="3" />
      <text x="110" y="102" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1E3A5F" fontFamily="Georgia, serif">
        BIS
      </text>
      <Label n={1} x={110} y={140} />
      {/* 2. purity grade */}
      <text x="185" y="105" fontSize="22" fontWeight="700" fill="#1C1B19" fontFamily="Georgia, serif">
        916
      </text>
      <text x="185" y="122" fontSize="10" fill="#8A8478">
        (22K)
      </text>
      <Label n={2} x={230} y={100} />
      {/* 3. HUID */}
      <rect x="255" y="82" width="70" height="30" fill="none" stroke="#1E3A5F" strokeWidth="1.5" strokeDasharray="4 2" />
      <text x="290" y="102" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1C1B19" fontFamily="monospace">
        AN0267
      </text>
      <Label n={3} x={340} y={97} />
      {/* 4. jeweller's ID */}
      <text x="365" y="102" textAnchor="middle" fontSize="16" fontWeight="600" fill="#1C1B19" fontFamily="Georgia, serif" fontStyle="italic">
        SJ
      </text>
      <Label n={4} x={365} y={130} />
      {/* legend row for grades */}
      <text x="30" y="180" fontSize="11" fill="#57534E">
        Purity grades: 999 = 24K · 916 = 22K · 750 = 18K · 585 = 14K
      </text>
    </svg>
  );
}

function CrsDiagram() {
  return (
    <svg viewBox="0 0 420 200" className="w-full max-w-lg" role="img" aria-label="Schematic of the CRS registration mark on electronics">
      <rect x="10" y="10" width="400" height="180" fill="#FAF8F3" stroke="#E7E1D3" />
      <text x="30" y="42" fontSize="11" fill="#8A8478">
        On CRS-registered electronics (chargers, phones, LED TVs…):
      </text>
      {/* mark */}
      <rect x="60" y="65" width="120" height="80" fill="none" stroke="#1E3A5F" strokeWidth="3" />
      <path d="M85 90 L155 90 L148 135 L92 135 Z" fill="none" stroke="#1E3A5F" strokeWidth="2" />
      <text x="120" y="120" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1E3A5F" fontFamily="Georgia, serif">
        CRS
      </text>
      <Label n={1} x={190} y={105} />
      {/* registration number */}
      <text x="245" y="100" fontSize="16" fontWeight="700" fill="#1C1B19" fontFamily="monospace">
        R-61001234
      </text>
      <Label n={2} x={345} y={95} />
      <text x="245" y="125" fontSize="11" fill="#8A8478">
        (registration number of the
      </text>
      <text x="245" y="140" fontSize="11" fill="#8A8478">
        manufacturer, not the product)
      </text>
    </svg>
  );
}

const TABS: { id: Scheme; label: string; blurb: string }[] = [
  {
    id: "isi",
    label: "ISI Mark",
    blurb:
      "Carried by products certified under BIS licence (Scheme I) — pressure cookers, cement, helmets, electrical appliances and ~other mandatory products. Verify the CM/L number on the Verify a Mark page.",
  },
  {
    id: "hallmark",
    label: "BIS Hallmark (Gold)",
    blurb:
      "Mandatory for gold jewellery sold in India. The hallmark components are struck together; since the HUID system, all four parts below must be present — a mark missing any part is not a valid hallmark.",
  },
  {
    id: "crs",
    label: "CRS Registration",
    blurb:
      "Electronics and IT goods under the Compulsory Registration Scheme — mobile chargers, power banks, LED lamps, TVs, batteries. Self-declaration tested at BIS-recognised labs, so it is a different regime from ISI licensing.",
  },
];

export default function Marks() {
  const [tab, setTab] = useState<Scheme>("isi");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-ink">Know Your Mark</h1>
      <div className="mt-2 max-w-3xl border-t border-paper-edge pt-2 text-sm leading-relaxed text-ink-soft">
        <p>
          What the marks on Indian products actually mean, part by part. Schematics for identification
          education — this is not official artwork; compare with bis.gov.in or the BIS Care app when in doubt.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Certification marks">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`smallcaps border px-3 py-1.5 text-xs font-semibold ${
              tab === t.id ? "border-navy bg-navy text-white" : "border-paper-edge bg-white text-ink-soft hover:border-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <article className="mt-4 border border-paper-edge bg-white/60">
        <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr]">
          <div className="border border-paper-edge bg-paper p-3">
            {tab === "isi" && <IsiDiagram />}
            {tab === "hallmark" && <HallmarkDiagram />}
            {tab === "crs" && <CrsDiagram />}
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">{active.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{active.blurb}</p>
            {tab === "isi" && (
              <ol className="mt-3 space-y-1.5 text-sm text-ink">
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    1
                  </span>
                  The <strong>IS standard number</strong> the product conforms to (with its edition year).
                </li>
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    2
                  </span>
                  The <strong>ISI mark</strong> itself — the certification device.
                </li>
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    3
                  </span>
                  The <strong>7-digit CM/L licence number</strong> identifying the certified manufacturer —
                  verify it on the Verify a Mark page.
                </li>
              </ol>
            )}
            {tab === "hallmark" && (
              <ol className="mt-3 space-y-1.5 text-sm text-ink">
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    1
                  </span>
                  The <strong>BIS triangular logo</strong>.
                </li>
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    2
                  </span>
                  The <strong>purity / fineness grade</strong> — 999 for 24K, 916 for 22K, 750 for 18K.
                </li>
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    3
                  </span>
                  The <strong>6-character HUID</strong> — unique to that ornament; verify it on the Verify a
                  Mark page.
                </li>
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    4
                  </span>
                  The <strong>jeweller's identification mark</strong>.
                </li>
              </ol>
            )}
            {tab === "crs" && (
              <ol className="mt-3 space-y-1.5 text-sm text-ink">
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    1
                  </span>
                  The <strong>CRS registration mark</strong>.
                </li>
                <li>
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center bg-brass text-[10px] font-bold text-white">
                    2
                  </span>
                  The <strong>registration number</strong> (format R-XXXXXXXX) of the manufacturer — verify it
                  on the Verify a Mark page.
                </li>
              </ol>
            )}
            <div className="mt-4 border-t border-paper-edge pt-3 text-xs">
              <a href="/verify" className="font-semibold text-navy underline underline-offset-2">
                Verify a number you found →
              </a>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
