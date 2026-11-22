import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed, Phone, Search, Store } from 'lucide-react';
import { api, errorText, Prospect } from '../api';

const KINDS: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Café', fast_food: 'Restauration rapide', bar: 'Bar', pub: 'Pub', bakery: 'Boulangerie',
  hairdresser: 'Coiffeur', beauty: 'Institut de beauté', barber: 'Barbier', dentist: 'Dentiste', clinic: 'Clinique',
  doctors: 'Médecin', pharmacy: 'Pharmacie', car_repair: 'Garage', car_wash: 'Lavage auto', clothes: 'Vêtements',
  convenience: 'Supérette', florist: 'Fleuriste', butcher: 'Boucherie', supermarket: 'Supermarché'
};
export const kindLabel = (k: string): string => KINDS[k] ?? k.replace(/_/g, ' ');

const RADII = [500, 1000, 2000];
const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522];

function pinIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'pin-icon',
    html: `<svg width="${selected ? 38 : 30}" height="${selected ? 38 : 30}" viewBox="0 0 32 32"><path d="M16 2a9 9 0 0 0-9 9c0 7 9 19 9 19s9-12 9-19a9 9 0 0 0-9-9z" fill="${selected ? '#0e2236' : '#ffc400'}" stroke="#0e2236" stroke-width="1.5"/><circle cx="16" cy="11" r="3.5" fill="${selected ? '#ffc400' : '#0e2236'}"/></svg>`,
    iconSize: [selected ? 38 : 30, selected ? 38 : 30],
    iconAnchor: [selected ? 19 : 15, selected ? 38 : 30]
  });
}

export default function Prospects() {
  const navigate = useNavigate();
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const area = useRef<L.Circle | null>(null);

  const [radius, setRadius] = useState(1000);
  const [place, setPlace] = useState('');
  const [results, setResults] = useState<Prospect[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Création unique de la carte
  useEffect(() => {
    if (!mapEl.current || map.current) return;
    const m = L.map(mapEl.current, { zoomControl: false }).setView(DEFAULT_CENTER, 15);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    // Tuiles OpenStreetMap (usage léger) : pour un déploiement réel, prendre un fournisseur de tuiles dédié.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Marqueurs : reconstruits quand les résultats ou la sélection changent
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    (results ?? []).forEach((p) => {
      L.marker([p.lat, p.lon], { icon: pinIcon(p.id === selectedId), title: p.name, zIndexOffset: p.id === selectedId ? 1000 : 0 })
        .on('click', () => setSelectedId(p.id))
        .addTo(g);
    });
  }, [results, selectedId]);

  function flyTo(lat: number, lon: number) {
    map.current?.flyTo([lat, lon], 16, { duration: 0.8 });
  }

  async function onPlace(e: FormEvent) {
    e.preventDefault();
    if (place.trim().length < 2) return;
    setError('');
    setNotice('');
    try {
      const found = await api.geocode(place.trim());
      if (found.length === 0) return setNotice('Aucun lieu trouvé. Essayez une ville ou une adresse.');
      flyTo(found[0].lat, found[0].lon);
      setNotice(found[0].label.split(',').slice(0, 3).join(','));
    } catch (err) {
      setError(errorText(err));
    }
  }

  function locateMe() {
    if (!navigator.geolocation) return setError("La géolocalisation n'est pas disponible sur cet appareil.");
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo(pos.coords.latitude, pos.coords.longitude),
      () => setError("Position refusée. Cherchez plutôt une ville ou une adresse."),
      { timeout: 8000 }
    );
  }

  async function search() {
    const m = map.current;
    if (!m) return;
    const c = m.getCenter();
    setLoading(true);
    setError('');
    setNotice('');
    setSelectedId(null);
    area.current?.remove();
    area.current = L.circle(c, { radius, color: '#0e2236', weight: 1.5, dashArray: '6 6', fillColor: '#ffc400', fillOpacity: 0.07, interactive: false }).addTo(m);
    m.fitBounds(area.current.getBounds(), { padding: [24, 24] });
    try {
      const found = await api.prospects(c.lat, c.lng, radius);
      setResults(found);
    } catch (err) {
      setResults(null);
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  const selected = results?.find((p) => p.id === selectedId) ?? null;

  function select(p: Prospect) {
    setSelectedId(p.id);
    flyTo(p.lat, p.lon);
  }

  function createSite(p: Prospect) {
    navigate('/sites/new', { state: { prospect: p } });
  }

  return (
    <div className="map-page">
      <section className="map-panel" aria-label="Recherche de prospects">
        <h1>Trouver des commerces sans site</h1>
        <form className="searchbar" onSubmit={onPlace} role="search">
          <Search size={18} aria-hidden />
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ville, quartier ou adresse" aria-label="Lieu à chercher" />
          <button type="button" className="icon-btn" onClick={locateMe} aria-label="Utiliser ma position" title="Utiliser ma position">
            <LocateFixed size={18} aria-hidden />
          </button>
        </form>
        {notice && <p className="muted small">{notice}</p>}

        <div className="radius" role="group" aria-label="Rayon de recherche">
          {RADII.map((r) => (
            <button key={r} type="button" className={r === radius ? 'seg on' : 'seg'} aria-pressed={r === radius} onClick={() => setRadius(r)}>
              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
            </button>
          ))}
        </div>
        <button className="btn block" onClick={search} disabled={loading}>
          {loading ? 'Recherche en cours…' : 'Chercher autour du centre de la carte'}
        </button>
        {loading && <p className="muted small">La base cartographique publique peut mettre jusqu'à une minute à répondre.</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {results && (
          <p className="count">
            <strong>{results.length}</strong> {results.length > 1 ? 'commerces semblent' : 'commerce semble'} sans site web
          </p>
        )}
        {results?.length === 0 && <p className="muted">Aucun résultat dans ce rayon. Agrandissez-le ou déplacez la carte.</p>}
        {results === null && !loading && !error && <p className="muted">Déplacez la carte sur un quartier, puis lancez la recherche. Chaque pin jaune est un commerce sans site web renseigné.</p>}

        <ul className="plist">
          {results?.map((p) => (
            <li key={p.id}>
              <button className={p.id === selectedId ? 'prow on' : 'prow'} onClick={() => select(p)}>
                <Store size={18} aria-hidden />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {kindLabel(p.kind)}
                    {p.address ? ` · ${p.address}` : ''}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {results && results.length > 0 && <p className="muted small">« Sans site » vient des données OpenStreetMap : vérifiez avec le commerçant.</p>}
      </section>

      <div className="map-wrap">
        <div ref={mapEl} className="map" role="application" aria-label="Carte des commerces" />
        {selected && (
          <aside className="pin-card" aria-live="polite">
            <h2>{selected.name}</h2>
            <p className="muted">
              {kindLabel(selected.kind)}
              {selected.address ? ` · ${selected.address}` : ''}
            </p>
            {selected.phone && (
              <p className="inline">
                <Phone size={16} aria-hidden /> {selected.phone}
              </p>
            )}
            <button className="btn" onClick={() => createSite(selected)}>
              Créer son site
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
