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
        <h1 className="font-serif text-2xl font-bold text-ink">
          {isBusiness ? "Business dashboard" : "Consumer dashboard"}
        </h1>
        <p className="text-sm text-ink-faint">
          {user?.businessName ? `${user.businessName} · ` : ""}
          {user?.email}
        </p>
      </div>
      <div className="mt-2 border-t-2 border-navy" />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {isBusiness && (
          <>
            <section className="border border-paper-edge bg-white/60 p-5">
              <div className="flex items-center justify-between">
                <h2 className="smallcaps text-sm font-semibold text-ink-soft">Watched categories</h2>
                <Link to="/radar" className="text-xs font-semibold text-navy underline underline-offset-2">
                  Add from radar →
                </Link>
              </div>
              {watches.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">
                  You're not watching any category yet. Add one from the{" "}
                  <Link to="/radar" className="font-medium text-navy underline">
                    radar
                  </Link>{" "}
                  or the applicability wizard.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {watches.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between border border-paper-edge bg-paper-deep/60 px-3 py-2 text-sm"
                    >
                      <span className="text-ink">{w.product_category}</span>
                      <button
                        onClick={() => void removeWatch(w.id)}
                        className="text-xs font-medium text-signal underline underline-offset-2"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border border-paper-edge bg-white/60 p-5">
              <h2 className="smallcaps text-sm font-semibold text-ink-soft">Radar hits on your watches</h2>
              {radarHits.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">
                  {watches.length === 0 ? "Watch a category to see QCOs land here." : "Nothing touching your watches right now."}
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {radarHits.map((q) => (
                    <QcoLine key={q.id} item={q} />
                  ))}
                </ul>
              )}
              <h2 className="smallcaps mt-5 text-sm font-semibold text-ink-soft">Next deadlines (all categories)</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {upcoming.map((q) => (
                  <QcoLine key={q.id} item={q} />
                ))}
                {upcoming.length === 0 && <li className="text-ink-soft">No upcoming effective dates on file.</li>}
              </ul>
            </section>
          </>
        )}

        {!isBusiness && (
          <>
            <section className="border border-paper-edge bg-white/60 p-5">
              <h2 className="smallcaps text-sm font-semibold text-ink-soft">Check a product's mark</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Bought something with an ISI mark, HUID or CRS number on it? Verify it in seconds.
              </p>
              <Link
                to="/verify"
                className="mt-3 inline-block border border-navy bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep"
              >
                Verify a mark
              </Link>
            </section>
            <section className="border border-paper-edge bg-white/60 p-5">
              <h2 className="smallcaps text-sm font-semibold text-ink-soft">Something defective?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                The complaint copilot turns a free-text description into a properly structured complaint for
                BIS's official channels.
              </p>
              <Link
                to="/complaints"
                className="mt-3 inline-block border border-brass-deep bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-deep"
              >
                Draft a complaint
              </Link>
            </section>
          </>
        )}

        <section className="border border-paper-edge bg-white/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="smallcaps text-sm font-semibold text-ink-soft">Recent chats</h2>
            <Link to="/chat" className="text-xs font-semibold text-navy underline underline-offset-2">
              Open chat →
            </Link>
          </div>
          {sessions.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              No conversations yet —{" "}
              <Link to="/chat" className="text-navy underline">
                ask Sahayak
              </Link>{" "}
              something.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {sessions.slice(0, 5).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between border border-paper-edge bg-paper-deep/60 px-3 py-2"
                >
                  <span className="truncate text-ink">{s.title || "Untitled chat"}</span>
                  <span className="whitespace-nowrap text-xs text-ink-faint">{formatDate(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-paper-edge bg-white/60 p-5">
          <h2 className="smallcaps text-sm font-semibold text-ink-soft">My complaints</h2>
          {complaints.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">No complaints drafted.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {complaints.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 border border-paper-edge bg-paper-deep/60 px-3 py-2"
                >
                  <span className="truncate text-ink">{c.product_description}</span>
                  <span
                    className={`smallcaps whitespace-nowrap border px-1.5 py-0.5 text-xs font-semibold ${
                      c.status === "submitted"
                        ? "border-moss bg-moss-wash text-moss"
                        : "border-paper-edge bg-white text-ink-soft"
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
    <li className="flex items-start justify-between gap-3 border border-paper-edge bg-paper-deep/60 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{item.title}</p>
        <p className="text-xs text-ink-faint">{item.product_categories.slice(0, 3).join(", ")}</p>
      </div>
      <span className="whitespace-nowrap text-xs font-semibold text-navy">
        {days !== null && days >= 0 ? `in ${days} days` : formatDate(item.effective_date)}
      </span>
    </li>
  );
}
