import { useState, type FormEvent } from "react";
import { api, type ApplicabilityResult } from "../lib/api";
import { ApiError } from "../lib/api";
import { MandatoryBadge, SchemeBadge } from "../components/Badges";
import CitationChip from "../components/CitationChip";

const CATEGORIES = [
  "",
  "Household Electrical Appliances",
  "Kitchen Appliances / Cookware",
  "Lighting",
  "Air Conditioning",
  "Electronics & IT (CRS)",
  "Batteries",
  "Solar Photovoltaics",
  "Cement",
  "Steel Products",
  "Aluminium Products",
  "Pipes & Fittings",
  "Plywood / Wood Products",
  "Toys",
  "Safety Products (helmets, fire)",
  "Automotive Components",
];

export default function Applicability() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<ApplicabilityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchMsg, setWatchMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    setWatchMsg(null);
    try {
      const res = await api<ApplicabilityResult>("/applicability/check", {
        method: "POST",
        body: { productDescription: description, category: category || undefined },
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  async function watchCategory(name: string) {
    setWatchMsg(null);
    try {
      await api("/watches", { method: "POST", body: { productCategory: name } });
      setWatchMsg(`Watching "${name}" — future QCOs touching it will surface on your dashboard.`);
    } catch (err) {
      setWatchMsg(
        (err as ApiError).status === 409 ? "You already watch this category." : (err as Error).message,
      );
    }
  }

  const topQco = result?.qcoRefs?.[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">Applicability Wizard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Describe what you make or plan to import. Sahayak maps it to IS standards, derives the
        mandatory/voluntary flag from actual QCO coverage in the database — never from a language model's guess.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="desc" className="block text-sm font-medium">
            Product description
          </label>
          <textarea
            id="desc"
            required
            minLength={3}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. We manufacture 1.5-litre electric kettles rated 230V for household use"
            className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-ink-700 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor="cat" className="block text-sm font-medium">
              Category (optional hint)
            </label>
            <select
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:border-ink-700 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c || "— no category hint —"}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-ink-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-900 disabled:opacity-60"
          >
            {busy ? "Checking…" : "Check applicability"}
          </button>
        </div>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {result && (
        <div className="mt-6 space-y-4">
          {result.standards.length === 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              No standard in the seeded corpus matches this description. Try naming the product differently, or
              search the full catalogue at services.bis.gov.in.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
                <MandatoryBadge mandatory={result.mandatory} />
                <SchemeBadge scheme={result.scheme} />
                {topQco && (
                  <span className="text-xs text-slate-500">
                    Mandatory because: <strong>{topQco.ref}</strong>
                    {topQco.effective_date && <> · effective {topQco.effective_date}</>}
                  </span>
                )}
              </div>

              {result.why && (
                <div className="rounded-xl bg-ink-800 p-4 text-sm leading-relaxed text-ink-100">{result.why}</div>
              )}

              {result.concessionRoutes.length > 0 && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                  <p className="font-semibold">Possible concession route</p>
                  {result.concessionRoutes.map((c) => (
                    <p key={c.ref} className="mt-1">
                      {c.ref} — an alternative Scheme II pathway for eligible manufacturers (see source for
                      eligibility conditions).
                    </p>
                  ))}
                </div>
              )}

              {result.standards.map((s) => (
                <div key={s.is_number} className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-ink-100 px-2 py-0.5 font-mono text-xs font-semibold">{s.is_number}</span>
                    {s.certification_scheme && <SchemeBadge scheme={s.certification_scheme} />}
                    <span className="text-xs text-slate-400">match score {s.score}</span>
                  </div>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  {s.matched_on.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">Matched on: {s.matched_on.join(", ")}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {s.source_url && (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-ink-700 hover:underline"
                      >
                        Official record ↗
                      </a>
                    )}
                    <button
                      onClick={() => void watchCategory(s.title.split("—")[0].trim())}
                      className="rounded border border-ink-200 px-2.5 py-1 text-xs font-medium hover:bg-ink-50"
                    >
                      Watch this category
                    </button>
                  </div>
                </div>
              ))}

              {topQco?.source_url && (
                <div className="flex flex-wrap gap-1.5">
                  <CitationChip citation={{ type: "qco", ref: topQco.ref, source_url: topQco.source_url }} />
                </div>
              )}
            </>
          )}
          {watchMsg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{watchMsg}</p>}
        </div>
      )}
    </div>
  );
}
