export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export type QcoStatus = "in-force" | "upcoming";

export function qcoStatus(effectiveDate: string | null | undefined): QcoStatus {
  const days = daysUntil(effectiveDate);
  if (days === null) return "in-force";
  return days > 0 ? "upcoming" : "in-force";
}

export function qcoStatusLabel(effectiveDate: string | null | undefined): string {
  const days = daysUntil(effectiveDate);
  if (days === null) return "Unknown date";
  if (days > 1) return `Takes effect in ${days} days`;
  if (days === 1) return "Takes effect tomorrow";
  if (days === 0) return "Takes effect today";
  return `In force since ${formatDate(effectiveDate)}`;
}

/** Categories (lowercased, de-duplicated) mentioned across a QCO feed page. */
export function feedCategories(items: { product_categories: string[] }[]): string[] {
  const set = new Set<string>();
  for (const item of items) for (const c of item.product_categories) set.add(c.toLowerCase());
  return [...set].sort();
}

/** True when any of the item's categories matches one of the user's watched categories (case-insensitive). */
export function affectsWatched(item: { product_categories: string[] }, watched: string[]): boolean {
  const watchedLower = watched.map((w) => w.toLowerCase());
  return item.product_categories.some((c) => watchedLower.some((w) => c.toLowerCase().includes(w) || w.includes(c.toLowerCase())));
}

export function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "suspended":
      return "bg-amber-100 text-amber-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "expired":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
