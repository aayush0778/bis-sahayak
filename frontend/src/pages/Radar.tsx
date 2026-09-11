import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api, type QcoFeed, type QcoItem, type Watch } from "../lib/api";
import { affectsWatched, feedCategories, formatDate, qcoStatus, qcoStatusLabel } from "../lib/format";
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
    return feed.items.filter((i) => i.product_categories.some((c) => c.toLowerCase().includes(category.toLowerCase())));
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
      <h1 className="text-2xl font-bold">Regulatory Change Radar</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        QCO notifications with effective dates, newest first. Sign in and watch a category to see at a glance
        which orders affect you.
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {feed && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory("")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${category === "" ? "bg-ink-800 text-white" : "bg-white text-slate-600 ring-1 ring-ink-100"}`}
              >
                All categories
              </button>
              {categories.slice(0, 24).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${category === c ? "bg-ink-800 text-white" : "bg-white text-slate-600 ring-1 ring-ink-100"}`}
                >
                  {c}
                </button>
              ))}
            </div>

            {filtered.map((item) => (
              <QcoCard
                key={item.id}
                item={item}
                watched={watchedNames}
                affects={affectsWatched(item, watchedNames)}
                onToggleWatch={toggleWatch}
              />
            ))}
            {filtered.length === 0 && (
              <p className="rounded-xl border border-ink-100 bg-white p-6 text-center text-sm text-slate-500">
                No QCOs on file for this category yet.
              </p>
            )}
            {watchMsg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{watchMsg}</p>}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Orders by effective year</h2>
              <div className="mt-3 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perYear}>
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={24} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ff9933" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-ink-100 bg-white p-4 text-xs text-slate-600 shadow-sm">
              <h2 className="text-sm font-semibold text-ink-900">Your watches</h2>
              {watchedNames.length === 0 ? (
                <p className="mt-2">Sign in and click “watch” on any category to track it here.</p>
              ) : (
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {watchedNames.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl bg-ink-800 p-4 text-xs text-ink-200">
              <p className="font-semibold text-white">Where this data comes from</p>
              <p className="mt-2">
                Every entry carries its gazette or documented source. The radar is seeded for the demo; in
                production it would poll DPIIT/BIS notifications and email watched categories.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function QcoCard({
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
  const watchedHere = watched.some((w) => item.product_categories.some((c) => c.toLowerCase().includes(w.toLowerCase())));
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${affects ? "border-saffron-500 ring-1 ring-saffron-500/40" : "border-ink-100"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        {affects && (
          <span className="rounded bg-saffron-500 px-2 py-0.5 text-xs font-bold text-ink-900">Affects your watches</span>
        )}
        <span className="text-xs text-slate-400">
          {item.scheme ?? "—"} · {item.issuing_authority}
        </span>
      </div>
      <h3 className="mt-2 font-semibold leading-snug">{item.title}</h3>
      <p className="mt-1 text-xs text-slate-500">{qcoStatusLabel(item.effective_date)}</p>
      <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
      {item.applicable_is_numbers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.applicable_is_numbers.map((n) => (
            <span key={n} className="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-700">
              {n}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400">Effective {formatDate(item.effective_date)}</span>
        <a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-ink-700 hover:underline">
          Source ↗
        </a>
        <button
          onClick={() => onToggleWatch(item.product_categories[0] ?? item.title)}
          className="ml-auto rounded border border-ink-200 px-2.5 py-1 font-medium hover:bg-ink-50"
        >
          {watchedHere ? "Unwatch" : "Watch category"}
        </button>
      </div>
    </article>
  );
}
