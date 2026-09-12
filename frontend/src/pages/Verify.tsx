import { useRef, useState, type FormEvent } from "react";
import { api, type VerificationRecord } from "../lib/api";
import { ApiError } from "../lib/api";
import { formatDate } from "../lib/format";

const TYPES = [
  { value: "cml", label: "CM/L (ISI licence)" },
  { value: "huid", label: "HUID (jewellery hallmark)" },
  { value: "crs", label: "CRS (electronics registration)" },
];

const SAMPLES: Record<string, string[]> = {
  cml: ["CM/L-8200123456", "CM/L-8200567890", "CM/L-8200678901"],
  huid: ["AN0267", "CH5509", "HY3388"],
  crs: ["R-61001234", "R-61006234", "R-61008234"],
};

const STATUS_STYLE: Record<string, string> = {
  active: "border-moss bg-moss-wash text-moss",
  suspended: "border-brass-deep bg-brass-wash text-brass-deep",
  cancelled: "border-signal bg-signal-wash text-signal",
  expired: "border-paper-edge bg-paper-deep text-ink-soft",
};

export default function Verify() {
  const [type, setType] = useState("cml");
  const [number, setNumber] = useState("");
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRecord(null);
    setNote(null);
    try {
      const res = await api<{ record: VerificationRecord; note: string }>(
        `/verify/${type}/${encodeURIComponent(number.trim())}`,
      );
      setRecord(res.record);
      setNote(res.note);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  const refNo = record ? `VR/${new Date().toISOString().slice(0, 10).replace(/-/g, "/")}/${record.number.replace(/[^A-Z0-9]/gi, "")}` : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="print:hidden">
        <h1 className="font-serif text-2xl font-bold text-ink">Verify a Mark</h1>
        <div className="mt-2 border-t border-paper-edge pt-2 text-sm text-ink-soft">
          <p>The BIS-Care-equivalent lookup, framed as one tool inside the assistant — not the whole product.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 border border-paper-edge bg-white/60 p-5" noValidate>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-ink">
              Record type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label htmlFor="number" className="block text-sm font-medium text-ink">
              Number
            </label>
            <input
              id="number"
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={SAMPLES[type][0]}
              className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-navy focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-ink-faint">Try a sample:</span>
              {SAMPLES[type].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNumber(s)}
                  className="bg-navy-wash px-2 py-0.5 font-mono text-xs text-navy hover:bg-navy hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full border border-navy bg-navy py-2.5 font-medium text-white hover:bg-navy-deep disabled:opacity-60"
          >
            {busy ? "Looking up…" : "Verify"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 border-l-2 border-signal bg-signal-wash px-3 py-2 text-sm text-signal">
            {error}
          </p>
        )}
        <p className="mt-4 text-xs text-ink-faint">
          Sample records only — the live BIS licence database is access-gated (stated openly, per project
          scope).
        </p>
      </div>

      {record && (
        <div ref={receiptRef} className="mt-8" aria-live="polite">
          <article className="border-2 border-navy bg-white/70">
            <div className="border-b border-paper-edge bg-navy px-5 py-3 text-white">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold">Verification Notice</h2>
                <p className="font-mono text-xs text-white/80">
                  Ref. {refNo} <span className="text-white/50">(generated receipt reference)</span>
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`smallcaps border px-2.5 py-1 text-xs font-bold uppercase ${STATUS_STYLE[record.status]}`}>
                  {record.status}
                </span>
                <span className="font-mono text-sm font-semibold text-ink">{record.number}</span>
                <span className="smallcaps border border-navy/40 px-2 py-0.5 text-xs font-semibold text-navy">
                  {record.type}
                </span>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="smallcaps text-xs text-ink-faint">Licence holder</dt>
                  <dd className="font-medium text-ink">{record.holderName}</dd>
                </div>
                <div>
                  <dt className="smallcaps text-xs text-ink-faint">Product scope</dt>
                  <dd className="text-ink">{record.productScope}</dd>
                </div>
                <div>
                  <dt className="smallcaps text-xs text-ink-faint">Valid until</dt>
                  <dd className="text-ink">{formatDate(record.validUntil)}</dd>
                </div>
              </dl>
              {note && (
                <p className="mt-4 border-t border-paper-edge pt-3 text-xs leading-relaxed text-ink-faint">{note}</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t-2 border-navy bg-paper-deep px-5 py-3 print:hidden">
              <p className="text-xs text-ink-faint">
                Checked on {new Date().toLocaleString("en-IN")} · BIS Sahayak sample dataset
              </p>
              <button
                onClick={() => window.print()}
                className="border border-navy px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy-wash"
              >
                Print / save as PDF receipt
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
