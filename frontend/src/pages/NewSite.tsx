import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, errorText, Prospect, Template } from '../api';
import { useAuth } from '../auth';
import { TemplatePreview } from '../components/TemplatePreview';

const COST = 100;

export default function NewSite() {
  const navigate = useNavigate();
  const { user, setCredits } = useAuth();
  const prospect = (useLocation().state as { prospect?: Prospect } | null)?.prospect;

  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [templateKey, setTemplateKey] = useState('');
  const [name, setName] = useState(prospect?.name ?? '');
  const [address, setAddress] = useState(prospect?.address ?? '');
  const [phone, setPhone] = useState(prospect?.phone ?? '');
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .templates()
      .then((t) => {
        setTemplates(t);
        setTemplateKey((k) => k || t[0]?.key || '');
      })
      .catch((e: unknown) => setError(errorText(e)));
  }, []);

  const enough = (user?.credits ?? 0) >= COST;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const site = await api.createSite({
        name: name.trim(),
        template_key: templateKey,
        lang,
        kind: prospect?.kind,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        source: prospect ? { id: prospect.id, lat: prospect.lat, lon: prospect.lon } : undefined
      });
      if (site.credits_left !== undefined) setCredits(site.credits_left);
      navigate(`/sites/${site.id}`, { replace: true });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="page-pad">
      <h1>Créer un site</h1>
      <p className="muted">
        {prospect ? `Pour « ${prospect.name} », repéré sur la carte.` : 'Décrivez le commerce, choisissez un modèle : les textes de départ sont générés pour vous.'}
      </p>

      <form onSubmit={onSubmit} className="stack">
        <fieldset className="form">
          <legend>Le commerce</legend>
          <label>
            Nom
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
          </label>
          <div className="row">
            <label>
              Téléphone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={50} />
            </label>
            <label>
              Langue du site
              <select value={lang} onChange={(e) => setLang(e.target.value as 'fr' | 'en')}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <label>
            Adresse
            <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Le modèle</legend>
          {templates === null && !error && <p className="muted">Chargement des modèles…</p>}
          <div className="tpl-grid" role="radiogroup" aria-label="Modèle">
            {templates?.map((t) => (
              <label key={t.key} className={t.key === templateKey ? 'tpl on' : 'tpl'}>
                <input type="radio" name="tpl" value={t.key} checked={t.key === templateKey} onChange={() => setTemplateKey(t.key)} />
                <TemplatePreview k={t.key} name={name || t.name} />
                <strong>{t.name}</strong>
                <small>{t.industry}</small>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="btn" disabled={busy || !enough || !templateKey}>
            {busy ? 'Création…' : `Créer le site · ${COST} crédits`}
          </button>
          {!enough && <span className="error">Crédits insuffisants.</span>}
          <span className="muted">Modifier, publier un aperçu ou le rouvrir ne coûte rien.</span>
        </div>
      </form>
    </div>
  );
}
