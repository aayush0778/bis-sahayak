import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api, type QcoFeed, type QcoItem, type Watch } from "../lib/api";
import { affectsWatched, feedCategories, formatDate, qcoStatus, qcoStatusLabel } from "../lib/format";
import { downloadText, icsForQcos } from "../lib/exports";
import { StatusPill } from "../components/Badges";

export default function Radar() {
  const [feed, setFeed] = useState<QcoFeed | null>(null);
  const [category, setCategory] = useState("");
  const [watches, setWatches] = useState<Watch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watchMsg, setWatchMsg] = useState<string | null>(null);

  useEffect(() => {
    api<QcoFeed>("/qco/feed?pageSize=50")
      .then(setFeed)
      .catch((e) => setError(e.message));
    api<{ items: Watch[] }>("/watches")
      .then((res) => setWatches(res.items))
      .catch(() => setWatches([])); // public page — watches are best-effort
  }, []);

  const watchedNames = watches.map((w) => w.product_category);

  const filtered = useMemo(() => {
    if (!feed) return [];
    if (!category) return feed.items;
    return feed.items.filter((i) =>
      i.product_categories.some((c) => c.toLowerCase().includes(category.toLowerCase())),
    );
  }, [feed, category]);

  const categories = useMemo(() => (feed ? feedCategories(feed.items) : []), [feed]);

  const perYear = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of filtered) {
      const year = new Date(item.effective_date).getFullYear();
      counts.set(year, (counts.get(year) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }));
  }, [filtered]);

  function downloadIcs() {
    if (!filtered.length) return;
    downloadText("bis-qco-deadlines.ics", icsForQcos(filtered), "text/calendar");
  }

  async function toggleWatch(name: string) {
    setWatchMsg(null);
    const existing = watches.find((w) => w.product_category.toLowerCase() === name.toLowerCase());
    try {
      if (existing) {
        await api(`/watches/${existing.id}`, { method: "DELETE" });
        setWatches((prev) => prev.filter((w) => w.id !== existing.id));
        setWatchMsg(`Stopped watching "${name}".`);
      } else {
        const created = await api<Watch>("/watches", { method: "POST", body: { productCategory: name } });
        setWatches((prev) => [created, ...prev]);
        setWatchMsg(`Watching "${name}" — dashboard will flag new QCOs.`);
      }
    } catch (e) {
      setWatchMsg((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Regulatory Change Radar</h1>
          <div className="mt-2 max-w-3xl border-t border-paper-edge pt-2 text-sm leading-relaxed text-ink-soft">
            <p>
              Quality Control Orders in gazette style — newest effective dates first. Sign in and watch a
              category to see at a glance which orders affect you.
            </p>
          </div>
        </div>
        <button
          onClick={downloadIcs}
          disabled={!filtered.length}
          className="border border-navy px-4 py-2 text-sm font-medium text-navy hover:bg-navy-wash disabled:opacity-40"
          title="Export upcoming effective dates as a calendar file"
        >
          Download calendar (.ics)
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 border-l-2 border-signal bg-signal-wash px-3 py-2 text-sm text-signal">
          {error}
        </p>
      )}

      {feed && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory("")}
                className={`smallcaps border px-3 py-1 text-xs font-semibold ${
                  category === "" ? "border-navy bg-navy text-white" : "border-paper-edge bg-white text-ink-soft hover:border-navy"
                }`}
              >
                All categories
              </button>
              {categories.slice(0, 24).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`smallcaps border px-3 py-1 text-xs font-semibold ${
                    category === c ? "border-navy bg-navy text-white" : "border-paper-edge bg-white text-ink-soft hover:border-navy"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <ol className="mt-8 space-y-0 border-l-2 border-paper-edge pl-6">
              {filtered.map((item) => (
                <GazetteEntry
                  key={item.id}
                  item={item}
                  watched={watchedNames}
                  affects={affectsWatched(item, watchedNames)}
                  onToggleWatch={toggleWatch}
                />
              ))}
            </ol>
            {filtered.length === 0 && (
              <p className="mt-6 border border-paper-edge bg-white/60 p-6 text-center text-sm text-ink-soft">
                No QCOs on file for this category yet.
              </p>
            )}
            {watchMsg && (
              <p className="mt-4 border-l-2 border-moss bg-moss-wash px-3 py-2 text-sm text-moss">{watchMsg}</p>
            )}
          </div>

          <aside className="space-y-6">
            <div className="border border-paper-edge bg-white/60 p-4">
              <h2 className="smallcaps text-sm font-semibold text-ink-soft">Orders by effective year</h2>
              <div className="mt-3 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perYear}>
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={24} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1E3A5F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="border border-paper-edge bg-white/60 p-4 text-xs text-ink-soft">
              <h2 className="smallcaps text-sm font-semibold text-ink-soft">Your watches</h2>
              {watchedNames.length === 0 ? (
                <p className="mt-2">Sign in and click "watch" on any category to track it here.</p>
              ) : (
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {watchedNames.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border border-navy bg-navy-wash p-4 text-xs leading-relaxed text-ink-soft">
              <p className="smallcaps font-bold text-navy">Where this data comes from</p>
              <p className="mt-2">
                Every entry carries its gazette or documented source. The radar is seeded for the demo; in
                production it would poll DPIIT/BIS notifications and alert watched categories.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function GazetteEntry({
  item,
  watched,
  affects,
  onToggleWatch,
}: {
  item: QcoItem;
  watched: string[];
  affects: boolean;
  onToggleWatch: (name: string) => void;
}) {
  const status = qcoStatus(item.effective_date);
  const watchedHere = watched.some((w) =>
    item.product_categories.some((c) => c.toLowerCase().includes(w.toLowerCase())),
  );
  return (
    <li className="relative pb-8">
      <span
        aria-hidden
        className={`absolute -left-[31px] top-1 h-3 w-3 border-2 border-paper ${
          affects ? "bg-brass" : status === "upcoming" ? "bg-signal" : "bg-navy"
        }`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        {affects && (
          <span className="smallcaps border border-brass-deep bg-brass-wash px-2 py-0.5 text-xs font-bold text-brass-deep">
            Affects your watches
          </span>
        )}
        <span className="text-xs text-ink-faint">
          {item.scheme ?? "—"} · {item.issuing_authority}
        </span>
      </div>
      <h3 className="mt-2 font-serif text-base font-semibold leading-snug text-ink">{item.title}</h3>
      <p className="mt-0.5 text-xs font-medium text-signal">{qcoStatusLabel(item.effective_date)}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.summary}</p>
      {item.applicable_is_numbers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.applicable_is_numbers.map((n) => (
            <span key={n} className="bg-navy-wash px-1.5 py-0.5 font-mono text-[11px] text-navy">
              {n}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-ink-faint">Effective {formatDate(item.effective_date)}</span>
        <a
          href={item.source_url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-navy underline underline-offset-2"
        >
          Source ↗
        </a>
        {watchedHere && <span className="text-moss">watched</span>}
        <button
          onClick={() => onToggleWatch(item.product_categories[0] ?? item.title)}
          className="ml-auto border border-navy/40 px-2.5 py-1 font-medium text-navy hover:bg-navy-wash"
        >
          {watchedHere ? "Unwatch" : "Watch category"}
        </button>
      </div>
    </li>
  );
}
