import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { api, Earnings, errorText, money, Site } from '../api';
import { StatusBadge } from '../components/StatusBadge';

export default function Sites() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.sites().then(setSites).catch((e: unknown) => setError(errorText(e)));
    api.earnings().then(setEarnings).catch(() => setEarnings(null));
  }, []);

  return (
    <div className="page-pad">
      <div className="page-head">
        <h1>Mes sites</h1>
        <Link className="btn" to="/sites/new">
          Nouveau site
        </Link>
      </div>

      {earnings && (
        <dl className="earn">
          {(earnings.by_currency.length ? earnings.by_currency : [{ currency: 'USD' as const, total_paid_out_cents: 0, monthly_recurring_cents: 0 }]).map((c) => (
            <div key={c.currency} className="earn-group">
              <div>
                <dt>Déjà reçu (90 %), {c.currency}</dt>
                <dd>{money(c.total_paid_out_cents, c.currency)}</dd>
              </div>
              <div>
                <dt>Revenu mensuel récurrent, {c.currency}</dt>
                <dd>{money(c.monthly_recurring_cents, c.currency)}</dd>
              </div>
            </div>
          ))}
          {earnings.mode === 'test' && <p className="muted small test-note">Mode test : les paiements sont simulés, aucun argent réel n'est échangé.</p>}
        </dl>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!error && sites === null && <p className="muted">Chargement…</p>}
      {sites?.length === 0 && (
        <p className="empty">
          Aucun site pour l'instant. <Link to="/">Trouvez un commerce sur la carte</Link> et créez son site en quelques minutes.
        </p>
      )}

      <ul className="rows">
        {sites?.map((s) => {
          const paid = s.payment_links.find((p) => p.status === 'paid');
          return (
            <li key={s.id} className="srow">
              <div className="srow-main">
                <Link to={`/sites/${s.id}`} className="srow-name">
                  {s.name}
                </Link>
                <span className="muted small">
                  Modifié le {new Date(s.updated_at ?? s.published_at ?? Date.now()).toLocaleDateString('fr-FR')}
                  {paid ? ` · ${money(paid.setup_cents + paid.monthly_cents, paid.currency)} encaissés` : ''}
                </span>
              </div>
              <StatusBadge site={s} />
              {s.public_url && !s.preview_expired ? (
                <a className="icon-btn" href={s.public_url} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir le site ${s.name}`} title="Ouvrir le site">
                  <ExternalLink size={18} aria-hidden />
                </a>
              ) : (
                <span className="icon-btn ghost" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
