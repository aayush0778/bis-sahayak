import { useEffect, useState, type FormEvent } from "react";
import { api, type Complaint } from "../lib/api";
import { ApiError } from "../lib/api";
import { formatDate } from "../lib/format";

export const CPGRAMS_URL = "https://pgportal.gov.in";

export default function Complaints() {
  const [product, setProduct] = useState("");
  const [defect, setDefect] = useState("");
  const [recordNumber, setRecordNumber] = useState("");
  const [draft, setDraft] = useState<Complaint["draft"] | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [history, setHistory] = useState<Complaint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadHistory() {
    try {
      const res = await api<{ items: Complaint[] }>("/complaints");
      setHistory(res.items);
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api<{ complaint: Complaint }>(`/complaints`, {
        method: "POST",
        body: {
          productDescription: product,
          defectDescription: defect,
          relatedRecordNumber: recordNumber || undefined,
        },
      });
      setDraft(res.complaint.draft);
      setDraftId(res.complaint.id);
      void loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Drafting failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitComplaint() {
    if (!draftId) return;
    try {
      await api(`/complaints/${draftId}/submit`, { method: "PATCH" });
      setNotice(
        "Marked as submitted to your records. For formal government action, file it on CPGRAMS below — that is the official grievance channel this draft is formatted for.",
      );
      void loadHistory();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-ink">Complaint Copilot</h1>
      <div className="mt-2 border-t border-paper-edge pt-2 text-sm leading-relaxed text-ink-soft">
        <p>
          Describe the problem in plain words; get a properly structured complaint draft you can review, edit,
          and take to BIS's official channels.
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 border border-paper-edge bg-white/60 p-5" noValidate>
          <div>
            <label htmlFor="product" className="block text-sm font-medium text-ink">
              Product
            </label>
            <textarea
              id="product"
              required
              rows={2}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Prestige-style 5L pressure cooker bought last month, ISI mark CM/L-8200123456 on the box"
              className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="defect" className="block text-sm font-medium text-ink">
              What went wrong?
            </label>
            <textarea
              id="defect"
              required
              rows={4}
              value={defect}
              onChange={(e) => setDefect(e.target.value)}
              placeholder="Describe the defect and what happened"
              className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="rec" className="block text-sm font-medium text-ink">
              Mark/licence number (optional)
            </label>
            <input
              id="rec"
              value={recordNumber}
              onChange={(e) => setRecordNumber(e.target.value)}
              placeholder="e.g. CM/L-8200123456"
              className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-navy focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full border border-navy bg-navy py-2.5 font-medium text-white hover:bg-navy-deep disabled:opacity-60"
          >
            {busy ? "Drafting…" : "Draft my complaint"}
          </button>
          {error && (
            <p role="alert" className="border-l-2 border-signal bg-signal-wash px-3 py-2 text-sm text-signal">
              {error}
            </p>
          )}
        </form>

        <div className="space-y-4">
          {draft ? (
            <div className="border border-paper-edge bg-white/60 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif font-semibold text-ink">Editable draft</h2>
                {draft.category && (
                  <span className="smallcaps border border-navy/40 px-2 py-0.5 text-xs font-semibold text-navy">
                    {draft.category}
                  </span>
                )}
              </div>
              <textarea
                rows={12}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                aria-label="Editable complaint draft"
                className="mt-3 w-full border border-paper-edge bg-paper p-3 font-mono text-xs leading-relaxed text-ink focus:border-navy focus:outline-none"
              />
              <button
                onClick={() => void submitComplaint()}
                className="mt-3 w-full border border-brass-deep bg-brass py-2 font-semibold text-white hover:bg-brass-deep"
              >
                Mark as submitted
              </button>
              {notice && (
                <p className="mt-2 border-l-2 border-moss bg-moss-wash px-3 py-2 text-xs leading-relaxed text-moss">
                  {notice}
                </p>
              )}
              <div className="mt-3 border border-navy bg-navy-wash p-3 text-xs leading-relaxed text-ink-soft">
                <p className="smallcaps font-bold text-navy">Take it to the real channel</p>
                <p className="mt-1">
                  Formal grievances go through{" "}
                  <a
                    href={CPGRAMS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-navy underline underline-offset-2"
                  >
                    CPGRAMS (pgportal.gov.in)
                  </a>{" "}
                  — paste the draft there. You can also write to{" "}
                  <a href="mailto:complaints@bis.gov.in" className="text-navy underline underline-offset-2">
                    complaints@bis.gov.in
                  </a>{" "}
                  or call the helpline{" "}
                  <a href="tel:1800111206" className="font-semibold text-navy underline underline-offset-2">
                    1800 11 1206
                  </a>
                  .
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-paper-edge bg-white/40 p-6 text-sm text-ink-soft">
              Your drafted complaint will appear here for review and editing.
            </div>
          )}

          <div className="border border-paper-edge bg-white/60 p-5">
            <h2 className="font-serif font-semibold text-ink">Past complaints</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Nothing yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {history.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 border border-paper-edge bg-paper-deep/60 px-3 py-2"
                  >
                    <span className="truncate text-ink">{c.product_description}</span>
                    <span className="flex items-center gap-2 whitespace-nowrap text-xs">
                      {formatDate(c.created_at)}
                      <span
                        className={`smallcaps border px-1.5 py-0.5 font-semibold ${
                          c.status === "submitted"
                            ? "border-moss bg-moss-wash text-moss"
                            : "border-paper-edge bg-white text-ink-soft"
                        }`}
                      >
                        {c.status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
