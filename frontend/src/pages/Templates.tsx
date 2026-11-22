import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText, Template } from '../api';
import { TemplatePreview } from '../components/TemplatePreview';

export default function Templates() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.templates().then(setTemplates).catch((e: unknown) => setError(errorText(e)));
  }, []);

  return (
    <div className="page-pad">
      <div className="page-head">
        <h1>Modèles</h1>
        <Link className="btn" to="/sites/new">
          Créer un site
        </Link>
      </div>
      <p className="muted">Chaque modèle a sa palette et sa typographie. Les textes et les couleurs restent modifiables après la création.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!error && templates === null && <p className="muted">Chargement…</p>}
      <div className="tpl-grid wide">
        {templates?.map((t) => (
          <article key={t.key} className="tpl static">
            <TemplatePreview k={t.key} name={t.name} />
            <strong>{t.name}</strong>
            <small>
              {t.category} · {t.industry}
            </small>
            {t.description && <p>{t.description}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
