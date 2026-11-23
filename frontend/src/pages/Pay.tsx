import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, errorText, money, PayInfo } from '../api';
import { Brand } from '../components/Brand';

/** Page de paiement vue par le propriétaire du commerce : aucun compte requis. */
export default function Pay() {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.payInfo(token).then(setInfo).catch((e: unknown) => setError(errorText(e)));
  }, [token]);

  async function pay() {
    setBusy(true);
    setError('');
    try {
      await api.payConfirm(token);
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const total = info ? info.setup_cents + info.monthly_cents : 0;
  const paid = done || info?.status === 'paid';

  return (
    <div className="auth-page">
      <div className="auth-card form">
        <Brand />
        {!info && !error && <p className="muted">Chargement…</p>}
        {error && !info && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {info && paid && (
          <>
            <h1>Paiement reçu</h1>
            <p>Merci. Le site de {info.business_name} est en ligne.</p>
          </>
        )}
        {info && !paid && info.status === 'canceled' && (
          <>
            <h1>Lien expiré</h1>
            <p>Ce lien de paiement a été remplacé. Demandez-en un nouveau à la personne qui a créé votre site.</p>
          </>
        )}
        {info && !paid && info.status === 'pending' && (
          <>
            <h1>Site web de {info.business_name}</h1>
            <dl className="bill">
              {info.setup_cents > 0 && (
                <div>
                  <dt>Création du site</dt>
                  <dd>{money(info.setup_cents, info.currency)}</dd>
                </div>
              )}
              {info.monthly_cents > 0 && (
                <div>
                  <dt>Abonnement mensuel</dt>
                  <dd>{money(info.monthly_cents, info.currency)} / mois</dd>
                </div>
              )}
              <div className="total">
                <dt>À payer aujourd'hui</dt>
                <dd>{money(total, info.currency)}</dd>
              </div>
            </dl>
            {info.mode === 'test' && <p className="notice">Mode test : le paiement est simulé, aucune carte n'est débitée.</p>}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="btn" onClick={pay} disabled={busy}>
              {busy ? 'Paiement…' : `Payer ${money(total, info.currency)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
