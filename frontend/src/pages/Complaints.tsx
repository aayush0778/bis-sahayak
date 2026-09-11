import { useEffect, useState, type FormEvent } from "react";
import { api, type Complaint } from "../lib/api";
import { ApiError } from "../lib/api";
import { formatDate } from "../lib/format";

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
      setNotice("Complaint marked as submitted. In production this would be forwarded to BIS's official complaint channel.");
      void loadHistory();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">Complaint Copilot</h1>
      <p className="mt-1 text-sm text-slate-600">
        Describe the problem in plain words; get a properly structured complaint draft you can edit before
        submitting.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="product" className="block text-sm font-medium">
              Product
            </label>
            <textarea
              id="product"
              required
              rows={2}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Prestige-style 5L pressure cooker bought last month, ISI mark CM/L-8200123456"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-ink-700 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="defect" className="block text-sm font-medium">
              What went wrong?
            </label>
            <textarea
              id="defect"
              required
              rows={4}
              value={defect}
              onChange={(e) => setDefect(e.target.value)}
              placeholder="Describe the defect and what happened"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-ink-700 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="rec" className="block text-sm font-medium">
              Mark/licence number (optional)
            </label>
            <input
              id="rec"
              value={recordNumber}
              onChange={(e) => setRecordNumber(e.target.value)}
              placeholder="e.g. CM/L-8200123456"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-sm focus:border-ink-700 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-ink-800 py-2.5 font-semibold text-white hover:bg-ink-900 disabled:opacity-60"
          >
            {busy ? "Drafting…" : "Draft my complaint"}
          </button>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </form>

        <div className="space-y-4">
          {draft ? (
            <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Editable draft</h2>
                {draft.category && (
                  <span className="rounded bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700">
                    {draft.category}
                  </span>
                )}
              </div>
              <textarea
                rows={12}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                className="mt-3 w-full rounded-lg border border-ink-200 p-3 font-mono text-xs leading-relaxed focus:border-ink-700 focus:outline-none"
              />
              <button
                onClick={() => void submitComplaint()}
                className="mt-3 w-full rounded-lg bg-saffron-500 py-2 font-semibold text-ink-900 hover:bg-saffron-400"
              >
                Submit complaint
              </button>
              {notice && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-sm text-slate-500">
              Your drafted complaint will appear here for review and editing.
            </div>
          )}

          <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Past complaints</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nothing yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {history.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2">
                    <span className="truncate">{c.product_description}</span>
                    <span className="flex items-center gap-2 whitespace-nowrap text-xs">
                      {formatDate(c.created_at)}
                      <span
                        className={`rounded px-1.5 py-0.5 font-semibold ${
                          c.status === "submitted" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
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
