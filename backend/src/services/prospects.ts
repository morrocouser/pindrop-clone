/** Prospection : commerces OpenStreetMap qui n'ont pas de site web renseigné. */
export interface Prospect {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  address: string;
  phone: string;
}

export interface GeoResult {
  label: string;
  lat: number;
  lon: number;
}

// Les serveurs Overpass publics sont partagés : ils répondent parfois 502 ou lentement, d'où les reprises
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const ATTEMPTS = 4;
const UA = 'pindrop-clone-dev/1.0';
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: Prospect[] }>();

const NO_SITE = '[!"website"][!"contact:website"][!"url"][!"contact:url"]';

function buildQuery(lat: number, lon: number, radius: number): string {
  // Une boîte englobante est nettement plus rapide à interroger qu'un cercle
  const dLat = radius / 111320;
  const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  const a = `(${(lat - dLat).toFixed(5)},${(lon - dLon).toFixed(5)},${(lat + dLat).toFixed(5)},${(lon + dLon).toFixed(5)})`;
  return `[out:json][timeout:40];(
nwr["name"]["shop"]${NO_SITE}${a};
nwr["name"]["amenity"~"^(restaurant|cafe|fast_food|bar|pub|hairdresser|dentist|clinic|doctors|pharmacy|car_wash)$"]${NO_SITE}${a};
nwr["name"]["craft"]${NO_SITE}${a};
nwr["name"]["office"]${NO_SITE}${a};
);out center 80;`;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function toProspect(el: OverpassElement): Prospect | null {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!t.name || lat === undefined || lon === undefined) return null;
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  const city = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ');
  return {
    id: `${el.type}/${el.id}`,
    name: t.name,
    kind: t.shop || t.amenity || t.craft || t.office || 'shop',
    lat,
    lon,
    address: [street, city].filter(Boolean).join(', '),
    phone: t.phone || t['contact:phone'] || ''
  };
}

export async function findProspects(lat: number, lon: number, radius: number): Promise<Prospect[]> {
  const key = `${lat.toFixed(3)}:${lon.toFixed(3)}:${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  let lastError: unknown;
  for (let i = 0; i < ATTEMPTS; i++) {
    const url = OVERPASS_URLS[i % OVERPASS_URLS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, Accept: 'application/json' },
        body: `data=${encodeURIComponent(buildQuery(lat, lon, radius))}`,
        signal: AbortSignal.timeout(50000)
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassElement[] };
      const data = (json.elements ?? []).map(toProspect).filter((p): p is Prospect => p !== null);
      cache.set(key, { at: Date.now(), data });
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Overpass indisponible');
}

export async function geocode(q: string): Promise<GeoResult[]> {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'fr,en' },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({ label: r.display_name, lat: Number(r.lat), lon: Number(r.lon) }));
}
