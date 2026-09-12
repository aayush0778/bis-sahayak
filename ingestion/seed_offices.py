"""Seed the `bis_offices` table and geocode addresses at seed time.

Data: ingestion/data/bis_offices.json — transcribed from bis.gov.in directory
pages (per-row source_url). Geocoding uses Nominatim (OpenStreetMap) at one
request per second with a persistent cache; rows that fail to geocode keep
NULL coordinates rather than a guessed position.

Usage: python ingestion/seed_offices.py
"""
import json
import time
from pathlib import Path

import httpx

from common import DATA_DIR, as_text_list, connect, database_url

CACHE_PATH = DATA_DIR / "geocode-cache.json"
UA = "bis-sahayak-seed/1.0 (SIH26107 educational project; contact: repo issue tracker)"


def load_cache() -> dict:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict) -> None:
    CACHE_PATH.write_text(json.dumps(cache, indent=1), encoding="utf-8")


def _nominatim(params: dict) -> list:
    response = httpx.get(
        "https://nominatim.openstreetmap.org/search",
        params=params,
        headers={"User-Agent": UA},
        timeout=20.0,
    )
    response.raise_for_status()
    return response.json()


def _photon(q: str) -> list:
    response = httpx.get(
        "https://photon.komoot.io/api/",
        params={"q": q, "limit": 1},
        headers={"User-Agent": UA},
        timeout=20.0,
    )
    response.raise_for_status()
    return response.json().get("features", [])


def _variants(address: str, city: str) -> list[str]:
    """Query fallback chain: Indian street addresses with building names often
    fail on geocoders, so progressively drop leading segments (building, block),
    then fall back to a city-level pin (precision recorded per row)."""
    segments = [s.strip() for s in address.split(",") if s.strip()]
    out = [address + ", India"]
    for drop in range(1, min(3, len(segments))):
        out.append(", ".join(segments[drop:]) + ", India")
    out.append(f"{city}, India")
    return out


def _lookup(q: str) -> dict | None:
    """Photon first (lenient), Nominatim second — both OSM data."""
    try:
        features = _photon(q)
        if features:
            point = features[0]["geometry"]["coordinates"]
            props = features[0].get("properties", {})
            return {
                "lat": point[1],
                "lon": point[0],
                "precision": props.get("osm_value") or props.get("layer") or "unknown",
                "query": q,
                "source": "photon",
            }
    except Exception as exc:  # noqa: BLE001
        print(f"  [photon] error for {q[:50]}: {str(exc)[:90]}")
    try:
        rows = _nominatim({"q": q, "format": "json", "limit": 1})
        if rows:
            return {
                "lat": float(rows[0]["lat"]),
                "lon": float(rows[0]["lon"]),
                "precision": rows[0].get("type", "unknown"),
                "query": q,
                "source": "nominatim",
            }
    except Exception as exc:  # noqa: BLE001
        print(f"  [nominatim] error for {q[:50]}: {str(exc)[:90]}")
    return None


def geocode(address: str, city: str, cache: dict) -> dict | None:
    """Geocode with a query fallback chain and 1 req/s pacing.

    Returns {lat, lon, precision} or None — NULL coordinates on failure, never a guess.
    """
    key = f"{address} | city={city}"
    if key in cache and cache[key] is not None:
        return cache[key]
    result = None
    for q in _variants(address, city):
        result = _lookup(q)
        if result is not None:
            break
        time.sleep(1.1)
    if result is None:
        print(f"  [geocode] no hit for: {address[:60]}")
    cache[key] = result
    time.sleep(1.1)
    return result


def main() -> None:
    records = json.loads((DATA_DIR / "bis_offices.json").read_text(encoding="utf-8"))
    cache = load_cache()
    print(f"[seed_offices] seeding {len(records)} offices against {database_url().split('@')[-1]}")
    geocoded = 0
    with connect() as conn, conn.cursor() as cur:
        for r in records:
            point = geocode(r["address"], r["city"], cache) if r["address"] else None
            if point:
                geocoded += 1
            cur.execute(
                """
                INSERT INTO bis_offices (
                  office_type, name, region, address, phone, email, latitude, longitude, geocode_precision, source_url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                  office_type = EXCLUDED.office_type,
                  region = EXCLUDED.region,
                  address = EXCLUDED.address,
                  phone = EXCLUDED.phone,
                  email = EXCLUDED.email,
                  latitude = COALESCE(EXCLUDED.latitude, bis_offices.latitude),
                  longitude = COALESCE(EXCLUDED.longitude, bis_offices.longitude),
                  geocode_precision = EXCLUDED.geocode_precision,
                  source_url = EXCLUDED.source_url
                """,
                (
                    r["office_type"],
                    r["name"],
                    r.get("region"),
                    r["address"],
                    r.get("phone"),
                    r.get("email"),
                    point["lat"] if point else None,
                    point["lon"] if point else None,
                    point["precision"] if point else None,
                    r["source_url"],
                ),
            )
    save_cache(cache)
    print(f"[seed_offices] upserted {len(records)} rows; {geocoded} geocoded, {len(records) - geocoded} without coordinates")


if __name__ == "__main__":
    main()
