import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ChatSession, type Complaint, type QcoFeed, type QcoItem, type Watch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { affectsWatched, daysUntil, formatDate } from "../lib/format";

export default function Dashboard() {
  const { user } = useAuth();
  const [watches, setWatches] = useState<Watch[]>([]);
  const [feed, setFeed] = useState<QcoFeed | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const isBusiness = user?.role === "business";

  useEffect(() => {
    api<{ items: Watch[] }>("/watches").then((r) => setWatches(r.items)).catch(() => {});
    api<QcoFeed>("/qco/feed?pageSize=50").then(setFeed).catch(() => {});
    api<{ items: ChatSession[] }>("/chat/sessions").then((r) => setSessions(r.items)).catch(() => {});
    api<{ items: Complaint[] }>("/complaints").then((r) => setComplaints(r.items)).catch(() => {});
  }, []);

  const watchedNames = watches.map((w) => w.product_category);

  const radarHits = useMemo(() => {
    if (!feed) return [];
    return feed.items
      .filter((i) => affectsWatched(i, watchedNames))
      .sort((a, b) => a.effective_date.localeCompare(b.effective_date))
      .slice(0, 5);
  }, [feed, watches]);

  const upcoming = useMemo(() => {
    if (!feed) return [];
    return feed.items
      .filter((i) => (daysUntil(i.effective_date) ?? -1) >= 0)
      .sort((a, b) => a.effective_date.localeCompare(b.effective_date))
      .slice(0, 5);
  }, [feed]);

  async function removeWatch(id: string) {
    try {
      await api(`/watches/${id}`, { method: "DELETE" });
      setWatches((prev) => prev.filter((w) => w.id !== id));
    } catch {
      /* leave as-is */
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {isBusiness ? "Business dashboard" : "Consumer dashboard"}
        </h1>
        <p className="text-sm text-slate-500">
          {user?.businessName ? `${user.businessName} · ` : ""}
          {user?.email}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {isBusiness && (
          <>
            <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Watched categories</h2>
                <Link to="/radar" className="text-xs font-semibold text-ink-700 hover:underline">
                  Add from radar →
                </Link>
              </div>
              {watches.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  You're not watching any category yet. Add one from the{" "}
                  <Link to="/radar" className="font-medium underline">
                    radar
                  </Link>{" "}
                  or the applicability wizard.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {watches.map((w) => (
                    <li key={w.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                      <span>{w.product_category}</span>
                      <button onClick={() => void removeWatch(w.id)} className="text-xs font-medium text-red-600 hover:underline">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Radar hits on your watches</h2>
              {radarHits.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  {watches.length === 0 ? "Watch a category to see QCOs land here." : "Nothing touching your watches right now."}
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {radarHits.map((q) => (
                    <QcoLine key={q.id} item={q} />
                  ))}
                </ul>
              )}
              <h2 className="mt-5 font-semibold">Next deadlines (all categories)</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {upcoming.map((q) => (
                  <QcoLine key={q.id} item={q} />
                ))}
                {upcoming.length === 0 && <li className="text-slate-500">No upcoming effective dates on file.</li>}
              </ul>
            </section>
          </>
        )}

        {!isBusiness && (
          <>
            <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Check a product's mark</h2>
              <p className="mt-2 text-sm text-slate-600">
                Bought something with an ISI mark, HUID or CRS number on it? Verify it in seconds.
              </p>
              <Link
                to="/verify"
                className="mt-3 inline-block rounded-lg bg-ink-800 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-900"
              >
                Verify a mark
              </Link>
            </section>
            <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Something defective?</h2>
              <p className="mt-2 text-sm text-slate-600">
                The complaint copilot turns a free-text description into a properly structured complaint for
                BIS's official channel.
              </p>
              <Link
                to="/complaints"
                className="mt-3 inline-block rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-saffron-400"
              >
                Draft a complaint
              </Link>
            </section>
          </>
        )}

        <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent chats</h2>
            <Link to="/chat" className="text-xs font-semibold text-ink-700 hover:underline">
              Open chat →
            </Link>
          </div>
          {sessions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No conversations yet —{" "}
              <Link to="/chat" className="underline">
                ask Sahayak
              </Link>{" "}
              something.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {sessions.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
                  <span className="truncate">{s.title || "Untitled chat"}</span>
                  <span className="whitespace-nowrap text-xs text-slate-400">{formatDate(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">My complaints</h2>
          {complaints.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No complaints drafted.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {complaints.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2">
                  <span className="truncate">{c.product_description}</span>
                  <span
                    className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ${
                      c.status === "submitted" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function QcoLine({ item }: { item: QcoItem }) {
  const days = daysUntil(item.effective_date);
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium">{item.title}</p>
        <p className="text-xs text-slate-500">
          {item.product_categories.slice(0, 3).join(", ")}
        </p>
      </div>
      <span className="whitespace-nowrap text-xs font-semibold text-ink-700">
        {days !== null && days >= 0 ? `in ${days} days` : formatDate(item.effective_date)}
      </span>
    </li>
  );
}
