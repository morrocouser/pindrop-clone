import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, LayoutTemplate, MapPin, Sparkles } from 'lucide-react';
import { api, money, Template } from '../api';
import { Brand } from '../components/Brand';
import { HeroMap } from '../components/HeroMap';
import { TemplatePreview } from '../components/TemplatePreview';

const FAQ = [
  {
    q: "C'est quoi Pindrop",
    a: "Un outil pour créer des sites web pour les commerces de quartier et les leur faire payer. Il repère sur la carte les commerces qui n'ont pas de site, en génère un à partir d'un modèle, puis crée un lien de paiement à envoyer au commerçant."
  },
  {
    q: 'Puis-je montrer le site avant de demander quoi que ce soit',
    a: "Oui. Un aperçu de 7 jours est publié à sa propre adresse, caché des moteurs de recherche. Si le commerçant accepte, le même site passe en ligne dès son paiement. Sinon l'aperçu expire."
  },
  {
    q: 'Combien ça coûte',
    a: 'Chaque compte reçoit 3 000 crédits. Créer un site en consomme 100, une modification par IA 10. Publier un aperçu, modifier à la main et rouvrir un site ne coûtent rien.'
  },
  {
    q: 'Les paiements sont-ils réels',
    a: "Pas encore : l'application tourne en mode test. Le lien de paiement, la commission de 10 % et le calcul de vos gains fonctionnent, mais aucun argent n'est débité. Le branchement de Stripe reste à faire."
  },
  {
    q: "D'où viennent les commerces affichés",
    a: "D'OpenStreetMap. « Sans site » signifie « sans site renseigné dans OpenStreetMap » : vérifiez toujours avec le commerçant avant de le démarcher."
  }
];

export default function Landing() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [setup, setSetup] = useState(300);
  const [monthly, setMonthly] = useState(49);

  useEffect(() => {
    api.templates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const first = setup + monthly;

  return (
    <div className="lp">
      <header className="nav">
        <Brand />
        <nav className="nav-links" aria-label="Sections">
          <a href="#how">Comment ça marche</a>
          <a href="#models">Modèles</a>
          <a href="#earn">Gains</a>
          <a href="#faq">Questions</a>
        </nav>
        <div className="nav-right">
          <Link to="/login" className="signin">
            Se connecter
          </Link>
          <Link to="/register" className="btn">
            Commencer
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <div>
          <h1>Offrez aux commerces de quartier un site en quelques minutes</h1>
          <p className="lp-lead">
            Repérez sur la carte les commerces qui n'ont pas de site, créez le leur à partir d'un modèle, puis faites-vous payer par lien. Vous gardez 90 % de chaque paiement.
          </p>
          <div className="lp-cta">
            <Link to="/register" className="btn lg">
              Créer un compte
            </Link>
            <a href="#how" className="btn secondary lg">
              Voir comment ça marche
            </a>
          </div>
          <p className="lp-meta">3 000 crédits offerts · 10 modèles · aperçu de 7 jours</p>
        </div>
        <HeroMap />
      </section>

      <section className="lp-sec" id="how">
        <div className="lp-head">
          <h2 className="lp-title">De la carte au paiement, en quatre étapes</h2>
          <p className="lp-sub">Chaque étape part de ce que vous avez déjà : un point sur la carte, un modèle, un lien.</p>
        </div>
        <ol className="route">
          <li>
            <h3>
              <MapPin size={18} strokeWidth={1.5} aria-hidden /> Repérer
            </h3>
            <p>Déplacez la carte sur un quartier : chaque épingle est un commerce qui n'a pas de site web renseigné.</p>
          </li>
          <li>
            <h3>
              <LayoutTemplate size={18} strokeWidth={1.5} aria-hidden /> Créer
            </h3>
            <p>Choisissez un modèle : le titre, la présentation et les coordonnées sont remplis à partir du commerce.</p>
          </li>
          <li>
            <h3>
              <Sparkles size={18} strokeWidth={1.5} aria-hidden /> Modifier
            </h3>
            <p>Changez les textes, les photos et les couleurs vous-même, ou dites à l'IA ce que vous voulez obtenir.</p>
          </li>
          <li>
            <h3>
              <CreditCard size={18} strokeWidth={1.5} aria-hidden /> Encaisser
            </h3>
            <p>Envoyez un lien de paiement : le site passe en ligne dès que le commerçant a payé.</p>
          </li>
        </ol>
      </section>

      <section className="lp-sec" id="models">
        <div className="lp-head">
          <h2 className="lp-title">Un modèle pour chaque métier</h2>
          <p className="lp-sub">Restaurant, coiffeur, garage, cabinet : chaque modèle a sa palette et sa typographie, puis s'adapte au commerce choisi.</p>
        </div>
        <div className="models">
          {templates.map((t) => (
            <article className="tpl" key={t.key}>
              <TemplatePreview k={t.key} name={t.name} />
              <strong>{t.name}</strong>
              <small>{t.industry}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-sec" id="earn">
        <div className="lp-head">
          <h2 className="lp-title">Vous fixez le prix, vous gardez 90 %</h2>
          <p className="lp-sub">Déplacez les curseurs pour voir ce que vous recevez pour un commerce.</p>
        </div>
        <div className="calc">
          <label>
            Prix de création : {money(setup * 100)}
            <input type="range" min={0} max={1500} step={50} value={setup} onChange={(e) => setSetup(Number(e.target.value))} />
          </label>
          <label>
            Abonnement mensuel : {money(monthly * 100)}
            <input type="range" min={0} max={200} step={5} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
          </label>
          <div>
            <p className="muted small">Vous recevez au premier paiement</p>
            <p className="big">{money(Math.round(first * 90))}</p>
            <p className="muted small">
              puis {money(Math.round(monthly * 90))} par mois, soit {money(Math.round(monthly * 90 * 12))} par an pour un seul commerce
            </p>
          </div>
        </div>
      </section>

      <section className="lp-sec" id="faq">
        <div className="lp-head">
          <h2 className="lp-title">Questions fréquentes</h2>
        </div>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <div className="box">
          <h2>Commencez avec 3 000 crédits offerts</h2>
          <Link to="/register" className="btn lg">
            Créer un compte
          </Link>
        </div>
      </section>

      <footer className="lp-foot">
        <span>© {new Date().getFullYear()} Pindrop, projet de démonstration</span>
        <nav aria-label="Liens">
          <a href="#how">Comment ça marche</a>
          <a href="#faq">Questions</a>
          <Link to="/login">Se connecter</Link>
        </nav>
      </footer>
    </div>
  );
}
