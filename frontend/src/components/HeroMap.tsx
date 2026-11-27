import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// Exemple d'illustration : commerces fictifs reliés par un itinéraire de démarchage
const STOPS: { name: string; kind: string; at: [number, number] }[] = [
  { name: 'Boulangerie des Lilas', kind: 'Sans site web', at: [48.8589, 2.3585] },
  { name: 'Salon Marcel', kind: 'Sans site web', at: [48.8569, 2.3631] },
  { name: 'Garage du Canal', kind: 'Sans site web', at: [48.8545, 2.3601] },
  { name: 'Café Petit Jour', kind: 'Sans site web', at: [48.8548, 2.3664] }
];

/** Carte décorative du héros : grise, non interactive, avec un itinéraire et des commerces à démarcher. */
export function HeroMap() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false
    }).setView([48.8568, 2.3622], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.polyline(
      STOPS.map((s) => s.at),
      { color: '#2345bb', weight: 3, dashArray: '2 7', lineCap: 'round', opacity: 0.9 }
    ).addTo(map);
    STOPS.forEach((s) => {
      L.marker(s.at, { icon: L.divIcon({ className: '', html: '<div class="dot-pin"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }), interactive: false })
        .bindTooltip(`${s.name}<small>${s.kind}</small>`, { permanent: true, direction: 'top', offset: [0, -8], className: 'hero-tip' })
        .addTo(map);
    });
    // La carte se dimensionne avec sa grille : on recalcule si la taille change après le premier rendu
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      map.remove();
    };
  }, []);

  return (
    <div className="hero-map" role="img" aria-label="Carte d'exemple : quatre commerces sans site web reliés par un itinéraire">
      <div ref={el} />
    </div>
  );
}
