import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, LayoutTemplate, MapPin, Sparkles } from 'lucide-react';
import { api, money, Template } from '../api';
import { Brand } from '../components/Brand';
import { HeroMap } from '../components/HeroMap';
import { TemplatePreview } from '../components/TemplatePreview';

const FAQ = [
  {
    q: "C'est quoi Pindrop ?",
    a: "Un outil pour créer des sites web pour les commerces de quartier et les leur faire payer. Il repère sur la carte les commerces qui n'ont pas de site, en génère un à partir d'un modèle, puis crée un lien de paiement à envoyer au commerçant."
  },
  {
    q: 'Puis-je montrer le site avant de demander quoi que ce soit ?',
    a: "Oui. Un aperçu de 7 jours est publié à sa propre adresse, caché des moteurs de recherche. Si le commerçant accepte, le même site passe en ligne dès son paiement ; sinon l'aperçu expire."
  },
  {
    q: 'Combien ça coûte ?',
    a: "Chaque compte reçoit 3 000 crédits. Créer un site en consomme 100, une modification par IA 10. Publier un aperçu, modifier à la main et rouvrir un site ne coûtent rien."
  },
  {
    q: "Les paiements sont-ils réels ?",
    a: "Pas encore : l'application tourne en mode test. Le lien de paiement, la commission de 10 % et le calcul de vos gains fonctionnent, mais aucun argent n'est débité. Le branchement de Stripe reste à faire."
  },
  {
    q: "D'où viennent les commerces affichés ?",
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
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-right">
          <Link to="/login" className="signin">
            Se connecter
          </Link>
          <Link to="/register" className="btn">
            Commencer <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <div>
          <p className="lp-badge">
            <span className="dot" aria-hidden /> 3 000 crédits offerts pour essayer
          </p>
          <h1>
            Offrez aux commerces de quartier <span className="serif">des sites</span> en quelques minutes
          </h1>
          <p className="lp-lead">
            Repérez sur la carte les commerces qui n'ont pas de site, créez le leur à partir d'un modèle, puis faites-vous payer par lien. Vous gardez 90 %.
          </p>
          <div className="lp-cta">
            <Link to="/register" className="btn lg">
              <MapPin size={16} aria-hidden /> Commencer
            </Link>
            <a href="#how" className="btn dark lg">
              Voir comment ça marche
            </a>
          </div>
          <p className="lp-stats">
            <span>
              <strong>10</strong> modèles
            </span>
            <i>·</i>
            <span>
              <strong>2</strong> langues
            </span>
            <i>·</i>
            <span>
              <strong>7 jours</strong> d'aperçu gratuit
            </span>
          </p>
        </div>
        <HeroMap />
      </section>
      <a href="#how" className="scroll-cue" aria-label="Faire défiler">
        <span aria-hidden />
        Faites défiler pour explorer
      </a>

      <section className="lp-sec center">
        <h2 className="lp-title">
          <span>Trouvez. </span>
          <span>Créez. </span>
          <span className="dim">Vendez. </span>
          <span className="dim">Gérez.</span>
        </h2>
        <div className="flow" aria-label="Le parcours d'un commerce, de la carte au paiement">
          <div className="node">
            <small>Trouvez</small>
            <strong>Commerce repéré</strong>
            <span>point sur la carte · sans site web</span>
          </div>
          <div className="link" />
          <div className="node">
            <small>Créez</small>
            <strong>Site généré</strong>
            <span>modèle · textes et photos modifiables</span>
          </div>
          <div className="link" />
          <div className="node">
            <small>Vendez</small>
            <strong>Lien de paiement</strong>
            <span>300 $ de création · 49 $ par mois</span>
          </div>
          <div className="link" />
          <div className="flow-split">
            <div className="node">
              <small>Gérez</small>
              <strong>Mensualité</strong>
              <span>revenu récurrent</span>
            </div>
            <div className="node">
              <small>Gérez</small>
              <strong>Modifications</strong>
              <span>à la main ou par IA</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-sec center" id="models">
        <span className="label">Modèles</span>
        <h2 className="lp-title">Un vrai design pour chaque commerce</h2>
        <p className="lp-sub">Restaurant, coiffeur, garage, cabinet… chaque modèle a sa palette et sa typographie, puis s'adapte au commerce choisi.</p>
        {templates.length > 0 && (
          <div className="marquee">
            <div className="marquee-track">
              {[...templates, ...templates].map((t, i) => (
                <article className="tpl" key={`${t.key}-${i}`} aria-hidden={i >= templates.length}>
                  <TemplatePreview k={t.key} name={t.name} />
                  <strong>{t.name}</strong>
                  <small>{t.industry}</small>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="lp-sec center" id="how">
        <span className="label">Comment ça marche</span>
        <h2 className="lp-title">Trouvez-les, créez le site, faites-vous payer.</h2>
        <div className="steps">
          <div className="step">
            <span className="ico">
              <MapPin size={20} aria-hidden />
            </span>
            <h3>Repérez les commerces sans site</h3>
            <p>Déplacez la carte sur un quartier : chaque épingle est un commerce qui n'a pas de site web renseigné.</p>
          </div>
          <div className="step">
            <span className="ico">
              <LayoutTemplate size={20} aria-hidden />
            </span>
            <h3>Créez son site en un clic</h3>
            <p>Choisissez un modèle : le titre, la présentation et les coordonnées sont remplis à partir du commerce.</p>
          </div>
          <div className="step">
            <span className="ico">
              <Sparkles size={20} aria-hidden />
            </span>
            <h3>Modifiez ce que vous voulez</h3>
            <p>Changez les textes, les photos et les couleurs vous-même, ou dites à l'IA ce que vous voulez obtenir.</p>
          </div>
          <div className="step">
            <span className="ico">
              <CreditCard size={20} aria-hidden />
            </span>
            <h3>Fixez votre prix, gardez 90 %</h3>
            <p>Envoyez un lien de paiement : le site passe en ligne dès que le commerçant a payé.</p>
          </div>
        </div>
      </section>

      <section className="lp-sec center" id="earn">
        <span className="label">Gains</span>
        <h2 className="lp-title">Vous fixez le prix, vous gardez 90 %.</h2>
        <div className="calc">
          <div className="form">
            <label>
              Prix de création : {money(setup * 100)}
              <input type="range" min={0} max={1500} step={50} value={setup} onChange={(e) => setSetup(Number(e.target.value))} />
            </label>
            <label>
              Abonnement mensuel : {money(monthly * 100)}
              <input type="range" min={0} max={200} step={5} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
            </label>
          </div>
          <div>
            <p className="muted small">Vous recevez au premier paiement</p>
            <p className="big">{money(Math.round(first * 90))}</p>
            <p className="muted small">
              puis {money(Math.round(monthly * 90))} par mois, soit {money(Math.round(monthly * 90 * 12))} par an pour un seul commerce.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-sec center" id="faq">
        <span className="label">FAQ</span>
        <h2 className="lp-title">Tout ce qu'il faut savoir</h2>
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
          <h2>Le prochain commerce sans site est peut-être au coin de la rue.</h2>
          <Link to="/register" className="btn lg">
            Créer mon compte <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="lp-foot">
        <span>© {new Date().getFullYear()} Pindrop (projet de démonstration)</span>
        <nav aria-label="Liens">
          <a href="#how">Comment ça marche</a>
          <a href="#faq">FAQ</a>
          <Link to="/login">Se connecter</Link>
        </nav>
      </footer>
    </div>
  );
}
