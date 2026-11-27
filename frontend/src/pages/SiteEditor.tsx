import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, ExternalLink, Monitor, Smartphone } from 'lucide-react';
import { api, CURRENCIES, Currency, errorText, Lang, LANGS, money, Site, SiteContent, Template } from '../api';
import { useAuth } from '../auth';
import { StatusBadge } from '../components/StatusBadge';

interface Draft {
  name: string;
  template_key: string;
  lang: Lang;
  whatsapp: string;
  headline: string;
  tagline: string;
  about: string;
  cta: string;
  services: string;
  hours: string;
  photos: string;
  phone: string;
  email: string;
  address: string;
  primary: string;
  accent: string;
}

const lines = (s: string): string[] => s.split('\n').map((l) => l.trim()).filter(Boolean);

function toDraft(s: Site): Draft {
  const c = s.content;
  return {
    name: s.name, template_key: s.template_key, lang: s.lang, whatsapp: c.whatsapp ?? '',
    headline: c.headline, tagline: c.tagline, about: c.about, cta: c.cta,
    services: c.services.join('\n'), hours: c.hours.join('\n'), photos: c.photos.join('\n'),
    phone: c.phone, email: c.email, address: c.address, primary: c.colors.primary, accent: c.colors.accent
  };
}

function withContent(d: Draft, c: SiteContent): Draft {
  return {
    ...d,
    whatsapp: c.whatsapp ?? '',
    headline: c.headline, tagline: c.tagline, about: c.about, cta: c.cta,
    services: c.services.join('\n'), hours: c.hours.join('\n'), photos: c.photos.join('\n'),
    phone: c.phone, email: c.email, address: c.address, primary: c.colors.primary, accent: c.colors.accent
  };
}

function toContent(d: Draft): SiteContent {
  return {
    headline: d.headline.trim(), tagline: d.tagline.trim(), about: d.about.trim(), cta: d.cta.trim(),
    services: lines(d.services), hours: lines(d.hours), photos: lines(d.photos),
    phone: d.phone.trim(), email: d.email.trim(), address: d.address.trim(), whatsapp: d.whatsapp.replace(/\D/g, ''),
    colors: { primary: d.primary, accent: d.accent }
  };
}

function CopyField({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* presse-papiers indisponible : le champ reste sélectionnable */
    }
  }
  return (
    <div className="copyfield">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label="Lien" />
      <button type="button" className="icon-btn" onClick={copy} aria-label="Copier le lien" title="Copier le lien">
        {done ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
      </button>
    </div>
  );
}

export default function SiteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const siteId = Number(id);

  const [site, setSite] = useState<Site | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [amounts, setAmounts] = useState({ setup: '300', monthly: '49' });
  const [currency, setCurrency] = useState<Currency>('USD');
  const { setCredits } = useAuth();
  const [ai, setAi] = useState<{ configured: boolean; cost: number } | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.aiStatus().then(setAi).catch(() => setAi(null));
  }, []);

  const apply = useCallback((s: Site) => {
    setSite(s);
    const d = toDraft(s);
    setSaved(d);
    setDraft(d);
  }, []);

  useEffect(() => {
    if (!Number.isInteger(siteId)) return setError('Site introuvable');
    api.site(siteId).then(apply).catch((e: unknown) => setError(errorText(e)));
    api.templates().then(setTemplates).catch(() => setTemplates([]));
  }, [siteId, apply]);

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  // Aperçu en direct : rendu côté serveur, avec un délai pour ne pas appeler l'API à chaque frappe
  const seq = useRef(0);
  useEffect(() => {
    if (!draft) return;
    const mine = ++seq.current;
    const t = setTimeout(() => {
      api
        .renderPreview({ name: draft.name || 'Site', template_key: draft.template_key, lang: draft.lang, content: toContent(draft) })
        .then((r) => {
          if (mine !== seq.current) return;
          setPreviewSrc(`${r.url}?v=${Date.now()}`);
          setPreviewError('');
        })
        .catch((e: unknown) => mine === seq.current && setPreviewError(errorText(e)));
    }, 450);
    return () => clearTimeout(t);
  }, [draft]);

  const set = (key: keyof Draft) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((d) => (d ? { ...d, [key]: e.target.value } : d));

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      apply(await api.updateSite(siteId, { name: draft.name.trim(), template_key: draft.template_key, lang: draft.lang, content: toContent(draft) }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  async function askAi() {
    if (aiText.trim().length < 3) return;
    setAiBusy(true);
    setAiMsg(null);
    try {
      const r = await api.aiEdit(siteId, aiText.trim());
      setDraft((d) => (d ? withContent(d, r.content) : d));
      setCredits(r.credits_left);
      setAiText('');
      setAiMsg({ ok: true, text: 'Proposition appliquée à l\'aperçu. Relisez-la, puis enregistrez.' });
    } catch (e) {
      setAiMsg({ ok: false, text: errorText(e) });
    } finally {
      setAiBusy(false);
    }
  }

  async function run(label: string, fn: () => Promise<Site>) {
    setBusy(label);
    setError('');
    try {
      const s = await fn();
      setSite(s);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  }

  async function remove() {
    if (!site || !window.confirm(`Supprimer définitivement « ${site.name} » ? Cette action est irréversible.`)) return;
    try {
      await api.deleteSite(siteId);
      navigate('/sites', { replace: true });
    } catch (e) {
      setError(errorText(e));
    }
  }

  if (error && !site) return <p className="page-pad error" role="alert">{error}</p>;
  if (!site || !draft) return <p className="page-pad muted">Chargement…</p>;

  const link = site.payment_links.find((p) => p.status === 'pending');
  const paid = site.payment_links.find((p) => p.status === 'paid');
  const setupCents = Math.round(Number(amounts.setup || 0) * 100);
  const monthlyCents = Math.round(Number(amounts.monthly || 0) * 100);
  const firstCharge = setupCents + monthlyCents;
  const cur: Currency = link?.currency ?? currency;
  const previewLive = site.status === 'preview' && !site.preview_expired;

  return (
    <div className="editor">
      <div className="editor-form">
        <div className="page-head">
          <div>
            <h1>{site.name}</h1>
            <StatusBadge site={site} />
          </div>
          <div className="actions">
            <button className="btn" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Enregistrement…' : dirty ? 'Enregistrer' : 'Enregistré'}
            </button>
          </div>
        </div>
        {error && <p className="error" role="alert">{error}</p>}

        <section className="panel">
          <h2>Diffusion</h2>
          {dirty && <p className="notice">Enregistrez vos modifications avant de publier : la publication utilise la version enregistrée.</p>}

          {paid ? (
            <p>Payé : {money(paid.setup_cents + paid.monthly_cents, paid.currency)}, dont {money(paid.payout_cents, paid.currency)} pour vous. Le site est en ligne.</p>
          ) : (
            <>
              <p className="muted">Montrez le site au commerçant avant de lui demander quoi que ce soit.</p>
              {previewLive && site.public_url && <CopyField value={site.public_url} />}
              <div className="actions">
                {!previewLive && (
                  <button className="btn secondary" disabled={dirty || !!busy} onClick={() => run('preview', () => api.publishSite(siteId, 'preview'))}>
                    {busy === 'preview' ? 'Publication…' : 'Publier un aperçu de 7 jours'}
                  </button>
                )}
                {previewLive && (
                  <>
                    <a className="btn secondary" href={site.public_url ?? '#'} target="_blank" rel="noopener noreferrer">
                      Ouvrir <ExternalLink size={16} aria-hidden />
                    </a>
                    <button className="btn ghost" disabled={!!busy} onClick={() => run('unpublish', () => api.unpublishSite(siteId))}>
                      Retirer l'aperçu
                    </button>
                  </>
                )}
              </div>
              {site.preview_expired && <p className="muted small">L'aperçu précédent a expiré. Publiez-en un nouveau.</p>}
            </>
          )}

          {paid && site.public_url && <CopyField value={site.public_url} />}

          {!paid && (
            <>
              <h3>Faire payer le commerçant</h3>
              <label>
                Devise
                <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="row">
                <label>
                  Création ({currency})
                  <input type="number" min="0" step="1" value={amounts.setup} onChange={(e) => setAmounts({ ...amounts, setup: e.target.value })} />
                </label>
                <label>
                  Par mois ({currency})
                  <input type="number" min="0" step="1" value={amounts.monthly} onChange={(e) => setAmounts({ ...amounts, monthly: e.target.value })} />
                </label>
              </div>
              <p className="muted small">
                {firstCharge > 0
                  ? `Premier paiement : ${money(firstCharge, currency)}. Vous gardez 90 % : ${money(Math.round(firstCharge * 0.9), currency)}.`
                  : 'Indiquez au moins un montant.'}
              </p>
              <button
                className="btn secondary"
                disabled={firstCharge <= 0 || !!busy}
                onClick={() => run('link', () => api.paymentLink(siteId, { setup_amount: setupCents / 100, monthly_amount: monthlyCents / 100, currency }))}
              >
                {busy === 'link' ? 'Création…' : link ? 'Remplacer le lien de paiement' : 'Créer le lien de paiement'}
              </button>
              {link && (
                <>
                  <CopyField value={`${window.location.origin}/pay/${link.token}`} />
                  <p className="muted small">
                    Le site passe en ligne dès que le commerçant a payé ({money(link.setup_cents, cur)} + {money(link.monthly_cents, cur)} / mois).
                  </p>
                </>
              )}
            </>
          )}
        </section>

        <section className="panel form">
          <h2>Demander à l'IA</h2>
          <p className="muted small">Décrivez ce que vous voulez : « ton plus chaleureux », « ajoute que nous sommes fermés le lundi », « traduis le texte »…</p>
          <label>
            Votre demande
            <textarea rows={3} value={aiText} onChange={(e) => setAiText(e.target.value)} maxLength={500} disabled={aiBusy} />
          </label>
          <div className="actions">
            <button className="btn secondary" onClick={askAi} disabled={aiBusy || aiText.trim().length < 3}>
              {aiBusy ? "L'IA rédige…" : `Appliquer · ${ai?.cost ?? 10} crédits`}
            </button>
            {ai && !ai.configured && <span className="muted small">IA non configurée : voir OMNIROUTE_API_KEY dans backend/.env</span>}
          </div>
          {aiMsg && (
            <p className={aiMsg.ok ? 'muted small' : 'error'} role={aiMsg.ok ? 'status' : 'alert'}>
              {aiMsg.text}
            </p>
          )}
        </section>

        <section className="panel form">
          <h2>Contenu</h2>
          <p className="notice">Les textes de départ sont génériques : relisez-les et ajoutez les vraies informations (horaires, photos) avant de publier.</p>
          <label>
            Nom du commerce
            <input value={draft.name} onChange={set('name')} maxLength={255} />
          </label>
          <label>
            Titre principal
            <input value={draft.headline} onChange={set('headline')} maxLength={120} />
          </label>
          <label>
            Sous-titre
            <input value={draft.tagline} onChange={set('tagline')} maxLength={200} />
          </label>
          <label>
            Texte de présentation
            <textarea rows={4} value={draft.about} onChange={set('about')} maxLength={1500} />
          </label>
          <label>
            Bouton d'action
            <input value={draft.cta} onChange={set('cta')} maxLength={40} />
          </label>
          <label>
            Services (un par ligne)
            <textarea rows={3} value={draft.services} onChange={set('services')} />
          </label>
          <label>
            Horaires (un par ligne)
            <textarea rows={3} value={draft.hours} onChange={set('hours')} placeholder="Lun – Ven : 9h – 18h" />
          </label>
          <label>
            Photos (adresses https, une par ligne)
            <textarea rows={3} value={draft.photos} onChange={set('photos')} placeholder="https://…" />
          </label>
        </section>

        <section className="panel form">
          <h2>Coordonnées</h2>
          <div className="row">
            <label>
              Téléphone
              <input value={draft.phone} onChange={set('phone')} maxLength={50} />
            </label>
            <label>
              E-mail
              <input type="email" value={draft.email} onChange={set('email')} maxLength={255} />
            </label>
          </div>
          <label>
            WhatsApp (avec l'indicatif du pays, chiffres seulement, ex. 212661984321)
            <input inputMode="numeric" value={draft.whatsapp} onChange={set('whatsapp')} maxLength={15} placeholder="212661984321" />
          </label>
          <label>
            Adresse
            <input value={draft.address} onChange={set('address')} maxLength={300} />
          </label>
        </section>

        <section className="panel form">
          <h2>Apparence</h2>
          <div className="row">
            <label>
              Modèle
              <select value={draft.template_key} onChange={set('template_key')}>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Langue
              <select value={draft.lang} onChange={set('lang')}>
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Couleur principale
              <input type="color" value={draft.primary} onChange={set('primary')} />
            </label>
            <label>
              Couleur d'accent
              <input type="color" value={draft.accent} onChange={set('accent')} />
            </label>
          </div>
        </section>

        <button className="btn danger" onClick={remove}>
          Supprimer ce site
        </button>
      </div>

      <div className="editor-preview">
        <div className="preview-bar">
          <span className="muted small">Aperçu</span>
          <div className="radius" role="group" aria-label="Taille de l'aperçu">
            <button type="button" className={device === 'desktop' ? 'seg on' : 'seg'} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
              <Monitor size={16} aria-hidden /> Ordinateur
            </button>
            <button type="button" className={device === 'mobile' ? 'seg on' : 'seg'} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
              <Smartphone size={16} aria-hidden /> Mobile
            </button>
          </div>
        </div>
        {previewError && <p className="error small" role="alert">{previewError}</p>}
        <div className={`frame ${device}`}>
          {/* Aperçu servi par l'API (autre origine que l'application) : ses scripts n'ont aucun accès à la session */}
          <iframe title="Aperçu du site" src={previewSrc} />
        </div>
      </div>
    </div>
  );
}
