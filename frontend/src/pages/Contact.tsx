import { useEffect, useState } from "react";
import { getOffices, type Office } from "../lib/api";

const CPGRAMS = "https://pgportal.gov.in";

export default function Contact() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getOffices().then((r) => setOffices(r.items)).catch(() => {});
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 8000 },
      );
    }
  }, []);

  const nearestRoses = offices
    .filter((o) => o.office_type === "regional_office" && o.latitude !== null)
    .map((o) => ({ ...o, km: userLoc ? Math.round(hav(userLoc, o.latitude!, o.longitude!)) : null }))
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-ink">Help &amp; Contacts</h1>
      <div className="mt-2 border-t border-paper-edge pt-2 text-sm leading-relaxed text-ink-soft">
        <p>
          The always-reachable directory: national helpline, complaint channels, and the regional office
          nearest to you. Every number below is published by BIS — links point at the official pages.
        </p>
      </div>

      <section className="mt-8 border-2 border-navy bg-white/70">
        <div className="border-b border-paper-edge bg-navy px-5 py-3 text-white">
          <h2 className="font-serif text-lg font-semibold">National helpline</h2>
        </div>
        <div className="p-5">
          <a href="tel:1800111206" className="font-serif text-3xl font-bold text-navy underline underline-offset-4">
            1800 11 1206
          </a>
          <p className="mt-1 text-sm text-ink-soft">Toll-free, BIS Headquarters, Manak Bhawan, New Delhi.</p>
        </div>
      </section>

      <section className="mt-6 border border-paper-edge bg-white/60 p-5">
        <h2 className="smallcaps text-sm font-semibold text-ink-soft">Complaints &amp; grievances</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          <li>
            Email:{" "}
            <a href="mailto:complaints@bis.gov.in" className="font-semibold text-navy underline underline-offset-2">
              complaints@bis.gov.in
            </a>
          </li>
          <li>
            Head of Complaints Management:{" "}
            <a href="tel:01123235069" className="font-semibold text-navy underline underline-offset-2">
              011-23235069
            </a>
          </li>
          <li>
            Formal government grievance:{" "}
            <a
              href={CPGRAMS}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-navy underline underline-offset-2"
            >
              CPGRAMS — pgportal.gov.in
            </a>{" "}
            — the Complaint Copilot's draft is formatted to paste here.
          </li>
          <li>
            In the BIS Care app (official):{" "}
            <a
              href="https://play.google.com/store/apps/details?id=com.bis.bisapp"
              target="_blank"
              rel="noreferrer"
              className="text-navy underline underline-offset-2"
            >
              Play Store listing
            </a>
          </li>
        </ul>
      </section>

      <section className="mt-6 border border-paper-edge bg-white/60 p-5">
        <h2 className="smallcaps text-sm font-semibold text-ink-soft">Regional offices</h2>
        {nearestRoses.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Loading the five regional offices…</p>
        ) : (
          <>
            <p className="mt-1 text-xs text-ink-faint">
              {userLoc ? "Sorted by distance from your location (nothing was stored)." : "Allow location on the Offices page for distance sorting."}
            </p>
            <ul className="mt-3 divide-y divide-paper-edge">
              {nearestRoses.map((o) => (
                <li key={o.name} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium text-ink">{o.name}</span>
                  <span className="text-ink-soft">
                    {o.phone && (
                      <a href={`tel:${o.phone.split(",")[0].replace(/[^0-9+]/g, "")}`} className="text-navy underline underline-offset-2">
                        ☎ {o.phone.split(",")[0]}
                      </a>
                    )}
                    {o.km !== null && <span className="ml-3 text-xs text-ink-faint">{o.km} km</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-3 text-xs">
          <a href="/offices" className="text-navy underline underline-offset-2">
            All offices and laboratories →
          </a>
        </p>
      </section>
    </div>
  );
}

function hav(a: { lat: number; lng: number }, lat: number, lng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.lat);
  const dLng = toRad(lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
