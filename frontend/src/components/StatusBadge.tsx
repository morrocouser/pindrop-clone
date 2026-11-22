import { Site } from '../api';

export function StatusBadge({ site }: { site: Pick<Site, 'status' | 'preview_expired' | 'preview_expires_at'> }) {
  if (site.status === 'live') return <span className="badge live">En ligne</span>;
  if (site.status === 'preview') {
    if (site.preview_expired) return <span className="badge expired">Aperçu expiré</span>;
    const days = site.preview_expires_at ? Math.max(1, Math.ceil((new Date(site.preview_expires_at).getTime() - Date.now()) / 86400000)) : 7;
    return <span className="badge preview">Aperçu · {days} j</span>;
  }
  return <span className="badge draft">Brouillon</span>;
}
