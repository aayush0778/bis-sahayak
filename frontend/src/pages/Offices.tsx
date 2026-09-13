import { useEffect, useMemo, useRef, useState } from "react";
import { getOffices, type Office } from "../lib/api";
import { haversineKm } from "../lib/exports";

const TYPE_LABEL: Record<Office["office_type"], string> = {
  hq: "Headquarters",
  regional_office: "Regional office",
  branch_office: "Branch office",
  laboratory: "Laboratory",
};

/** Leaflet is loaded imperatively — no React wrapper, no version-compat risk. */
async function mountMap(el: HTMLDivElement, offices: Office[]) {
  const L = (await import("leaflet")).default;
  const map = L.map(el, { scrollWheelZoom: false }).setView([21.5, 79], 4.4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 17,
  }).addTo(map);

  const icon = L.divIcon({
    className: "",
    html: `<svg viewBox="0 0 36 40" width="22" height="24" aria-hidden="true"><path d="M18 1 L34.5 10.5 L34.5 29.5 L18 39 L1.5 29.5 L1.5 10.5 Z" fill="#1E3A5F" stroke="#FAF8F3" stroke-width="2"/></svg>`,
    iconSize: [22, 24],
    iconAnchor: [11, 24],
  });

  const withCoords = offices.filter((o) => o.latitude !== null && o.longitude !== null);
  const markers = new Map<string, import("leaflet").Marker>();
  for (const o of withCoords) {
    const marker = L.marker([o.latitude as number, o.longitude as number], { icon })
      .addTo(map)
      .bindPopup(
        `<strong>${o.name}</strong><br/>${o.address}<br/>${o.phone ? `☎ ${o.phone}` : ""}`,
      );
    markers.set(o.name, marker);
  }
  return { map, markers };
}

export default function Offices() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Office["office_type"]>("all");
  const [query, setQuery] = useState("");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<"idle" | "locating" | "denied" | "ok">("idle");
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  // clicked before the tiles finished mounting — replay once the map exists
  const pendingFocusRef = useRef<string | null>(null);

  useEffect(() => {
    getOffices()
      .then((res) => {
        setOffices(res.items);
        setNote(res.note);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    if (!offices.length || !mapDivRef.current || mapRef.current) return;
    let cancelled = false;
    mountMap(mapDivRef.current, offices).then(({ map, markers }) => {
      if (cancelled) {
        map.remove();
        return;
      }
      mapRef.current = map;
      markersRef.current = markers;
      // container may have been laid out after init — recompute size
      setTimeout(() => map.invalidateSize(), 150);
      if (pendingFocusRef.current) {
        focusMarker(pendingFocusRef.current);
        pendingFocusRef.current = null;
      }
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = new Map();
    };
  }, [offices]);

  const visible = useMemo(() => {
    let items = offices;
    if (filter !== "all") items = items.filter((o) => o.office_type === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q) ||
          (o.region ?? "").toLowerCase().includes(q),
      );
    }
    if (userLoc) {
      items = [...items].sort((a, b) => distance(a) - distance(b));
    }
    return items;
  }, [offices, filter, query, userLoc]);

  function distance(o: Office): number {
    if (o.latitude === null || o.longitude === null || !userLoc) return Number.MAX_VALUE;
    return haversineKm(userLoc.lat, userLoc.lng, o.latitude, o.longitude);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocState("denied");
      return;
    }
    setLocState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState("ok");
      },
      () => setLocState("denied"),
      { timeout: 8000 },
    );
  }

  function focusMarker(name: string) {
    const marker = markersRef.current.get(name);
    if (!marker || !mapRef.current) return;
    mapDivRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    mapRef.current.setView(marker.getLatLng(), 12, { animate: true });
    marker.openPopup();
  }

  function focusOffice(o: Office) {
    if (o.latitude === null || o.longitude === null) return;
    if (!mapRef.current) {
      pendingFocusRef.current = o.name;
      mapDivRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    focusMarker(o.name);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-ink">Offices &amp; Labs</h1>
      <div className="mt-2 max-w-3xl border-t border-paper-edge pt-2 text-sm leading-relaxed text-ink-soft">
        <p>
          BIS's physical network — headquarters, regional offices, {offices.filter((o) => o.office_type === "branch_office").length || 33} branch
          offices and laboratories — transcribed from the official bis.gov.in directory. Every entry links its
          source row.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 border-l-2 border-signal bg-signal-wash px-3 py-2 text-sm text-signal">
          {error}
        </p>
      )}

      <div className="mt-6 border border-paper-edge bg-white/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={useMyLocation}
            className="border border-navy bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep"
          >
            {locState === "locating" ? "Locating…" : "Find my nearest office"}
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by city, office or region…"
            aria-label="Search offices"
            className="min-w-52 flex-1 border border-paper-edge bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {(["all", "branch_office", "regional_office", "laboratory", "hq"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                aria-pressed={filter === t}
                className={`smallcaps border px-2.5 py-1 text-xs font-semibold ${
                  filter === t ? "border-navy bg-navy text-white" : "border-paper-edge bg-white text-ink-soft hover:border-navy"
                }`}
              >
                {t === "all" ? "All" : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        {locState === "denied" && (
          <p className="mt-2 text-xs text-ink-soft">
            Location unavailable or denied — use the search box instead. Nothing was stored.
          </p>
        )}
      </div>

      <div className="mt-4 h-96 border border-paper-edge" ref={mapDivRef} data-testid="office-map" />

      <ol className="mt-6 divide-y divide-paper-edge border-y border-paper-edge">
        {visible.map((o) => (
          <li key={o.name} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="smallcaps border border-navy/40 px-1.5 py-0.5 text-xs font-semibold text-navy">
                  {TYPE_LABEL[o.office_type]}
                </span>
                <h3 className="mt-1 font-serif font-semibold text-ink">{o.name}</h3>
              </div>
              {userLoc && distance(o) !== Number.MAX_VALUE && (
                <span className="text-xs font-semibold text-navy">{Math.round(distance(o))} km away</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-soft">{o.address}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {o.phone && (
                <a href={`tel:${o.phone.split(",")[0].replace(/[^0-9+]/g, "")}`} className="text-navy underline underline-offset-2">
                  ☎ {o.phone}
                </a>
              )}
              {o.email && (
                <a href={`mailto:${o.email}`} className="text-navy underline underline-offset-2">
                  ✉ {o.email}
                </a>
              )}
              <a href={o.source_url} target="_blank" rel="noreferrer" className="text-ink-faint underline underline-offset-2">
                Source ↗
              </a>
              {o.latitude !== null && (
                <button onClick={() => focusOffice(o)} className="text-navy underline underline-offset-2">
                  Show on map
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {note && <p className="mt-4 text-xs leading-relaxed text-ink-faint">{note}</p>}
    </div>
  );
}
