import { useState, type FormEvent } from "react";
import { api, type VerificationRecord } from "../lib/api";
import { ApiError } from "../lib/api";
import { statusColor, formatDate } from "../lib/format";

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

export default function Verify() {
  const [type, setType] = useState("cml");
  const [number, setNumber] = useState("");
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Verify a Mark</h1>
      <p className="mt-1 text-sm text-slate-600">
        The BIS-Care-equivalent lookup, framed as one tool inside the assistant — not the whole product.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="type" className="block text-sm font-medium">
            Record type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:border-ink-700 focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="number" className="block text-sm font-medium">
            Number
          </label>
          <input
            id="number"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={SAMPLES[type][0]}
            className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-sm focus:border-ink-700 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-400">Try a sample:</span>
            {SAMPLES[type].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNumber(s)}
                className="rounded bg-ink-50 px-2 py-0.5 font-mono text-xs text-ink-700 hover:bg-ink-100"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-ink-800 py-2.5 font-semibold text-white hover:bg-ink-900 disabled:opacity-60"
        >
          {busy ? "Looking up…" : "Verify"}
        </button>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {record && (
        <div className="mt-6 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className={`rounded px-2.5 py-1 text-xs font-bold uppercase ${statusColor(record.status)}`}>
              {record.status}
            </span>
            <span className="font-mono text-sm font-semibold">{record.number}</span>
            <span className="rounded bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700">{record.type}</span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Licence holder</dt>
              <dd className="font-medium">{record.holderName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Product scope</dt>
              <dd>{record.productScope}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Valid until</dt>
              <dd>{formatDate(record.validUntil)}</dd>
            </div>
          </dl>
          {note && <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-xs text-slate-500">{note}</p>}
        </div>
      )}
    </div>
  );
}
