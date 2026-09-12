import { useMemo, useState, type FormEvent } from "react";
import { api, type ApplicabilityResult } from "../lib/api";
import { ApiError } from "../lib/api";
import { MandatoryBadge, SchemeBadge } from "../components/Badges";
import CitationChip from "../components/CitationChip";
import { complianceNote } from "../lib/exports";

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

/** Deterministic receipt-style reference derived from the query — labelled as generated, never a BIS number. */
function referenceNo(description: string): string {
  let h = 2166136261;
  for (const ch of description.toLowerCase().trim()) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `NOA/${ymd}/${(h >>> 0).toString(36).toUpperCase().slice(0, 6)}`;
}

export default function Applicability() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<ApplicabilityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchMsg, setWatchMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refNo = useMemo(() => (result ? referenceNo(description) : ""), [result, description]);

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
      setWatchMsg((err as ApiError).status === 409 ? "You already watch this category." : (err as Error).message);
    }
  }

  async function copyNote() {
    if (!result) return;
    const text = complianceNote(description, refNo, result);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const topQco = result?.qcoRefs?.[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-ink">Applicability Wizard</h1>
      <div className="mt-2 border-t border-paper-edge pt-2 text-sm leading-relaxed text-ink-soft">
        Describe what you make or plan to import. Sahayak maps it to IS standards and derives the
        mandatory/voluntary flag from actual QCO coverage in the database — never from a language model's
        guess.
      </div>

      <form onSubmit={onSubmit} className="mt-6 border border-paper-edge bg-white/60 p-5" noValidate>
        <div>
          <label htmlFor="desc" className="block text-sm font-medium text-ink">
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
            className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor="cat" className="block text-sm font-medium text-ink">
              Category (optional hint)
            </label>
            <select
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
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
            className="border border-navy bg-navy px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-60"
          >
            {busy ? "Checking…" : "Check applicability"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-4 border-l-2 border-signal bg-signal-wash px-3 py-2 text-sm text-signal">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-8" aria-live="polite">
          {result.standards.length === 0 ? (
            <div className="border-l-2 border-signal bg-signal-wash p-4 text-sm text-ink">
              <p className="smallcaps font-bold text-signal">No match on file</p>
              <p className="mt-1">
                No standard in the seeded corpus matches this description. Try naming the product differently,
                or search the full catalogue at{" "}
                <a
                  href="https://services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/Indian_standards"
                  target="_blank"
                  rel="noreferrer"
                  className="text-navy underline"
                >
                  services.bis.gov.in
                </a>
                .
              </p>
            </div>
          ) : (
            <article className="border-2 border-navy bg-white/70">
              <div className="border-b border-paper-edge bg-navy px-5 py-3 text-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-lg font-semibold">Notice of Applicability</h2>
                  <p className="font-mono text-xs text-white/80">
                    Ref. {refNo} <span className="text-white/50">(generated receipt reference)</span>
                  </p>
                </div>
              </div>

              <div className="border-b-4 border-navy p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <MandatoryBadge mandatory={result.mandatory} />
                  <SchemeBadge scheme={result.scheme} />
                </div>
                {result.why && <p className="mt-3 text-sm leading-relaxed text-ink">{result.why}</p>}
                {topQco && (
                  <p className="mt-2 text-xs text-ink-soft">
                    Mandatory because: <strong>{topQco.ref}</strong>
                    {topQco.effective_date && <> · effective {topQco.effective_date}</>}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <CitationChip
                    citation={{
                      type: "qco",
                      ref: topQco?.ref ?? result.standards[0].is_number,
                      source_url: topQco?.source_url ?? result.standards[0].source_url,
                    }}
                    animate
                  />
                </div>
              </div>

              <div className="border-b border-paper-edge p-5">
                <h3 className="smallcaps text-sm font-semibold text-ink-soft">Findings — applicable standards</h3>
                <ol className="mt-2 divide-y divide-paper-edge">
                  {result.standards.map((s, i) => (
                    <li key={s.is_number} className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-navy">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="bg-navy-wash px-2 py-0.5 font-mono text-xs font-semibold text-navy">
                          {s.is_number}
                        </span>
                        {s.certification_scheme && <SchemeBadge scheme={s.certification_scheme} />}
                        <span className="text-xs text-ink-faint">match score {s.score}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-ink">{s.title}</p>
                      {s.matched_on.length > 0 && (
                        <p className="mt-0.5 text-xs text-ink-faint">Matched on: {s.matched_on.join(", ")}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                        {s.source_url && (
                          <a
                            href={s.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-navy underline underline-offset-2"
                          >
                            Official record ↗
                          </a>
                        )}
                        <button
                          onClick={() => void watchCategory(s.title.split("—")[0].trim())}
                          className="border border-navy/40 px-2 py-0.5 font-medium text-navy hover:bg-navy-wash"
                        >
                          Watch this category
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {result.concessionRoutes.length > 0 && (
                <div className="border-b border-paper-edge bg-brass-wash/50 p-5 text-sm text-ink">
                  <p className="smallcaps font-bold text-brass-deep">Possible concession route</p>
                  {result.concessionRoutes.map((c) => (
                    <p key={c.ref} className="mt-1">
                      {c.ref} — an alternative Scheme II pathway for eligible manufacturers (see source for
                      eligibility conditions).
                    </p>
                  ))}
                </div>
              )}

              <div className="p-5">
                <h3 className="smallcaps text-sm font-semibold text-ink-soft">Certification journey — next steps</h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
                  <li>
                    Confirm the standard and scheme above against the official record (citations in this
                    notice).
                  </li>
                  <li>
                    Arrange product testing at a BIS laboratory or recognised lab — see{" "}
                    <a href="/offices" className="text-navy underline underline-offset-2">
                      Offices &amp; Labs
                    </a>
                    .
                  </li>
                  <li>
                    Apply online on{" "}
                    <a href="https://www.manakonline.in/" target="_blank" rel="noreferrer" className="text-navy underline underline-offset-2">
                      Manakonline
                    </a>{" "}
                    (ISI licensing) or the CRS registration portal, as applicable.
                  </li>
                  <li>
                    Micro and small units: check concession routes such as the Transition Facilitation QCO
                    where cited.
                  </li>
                </ol>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-navy bg-paper-deep px-5 py-3">
                <p className="text-xs text-ink-faint">
                  Verified against BIS Sahayak's seeded corpus on {new Date().toLocaleDateString("en-IN")}. Not a
                  legal opinion.
                </p>
                <button
                  onClick={() => void copyNote()}
                  className="border border-navy px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy-wash"
                >
                  {copied ? "Copied ✓" : "Copy as compliance note"}
                </button>
              </div>
            </article>
          )}
          {watchMsg && (
            <p className="mt-3 border-l-2 border-moss bg-moss-wash px-3 py-2 text-sm text-moss">{watchMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}
