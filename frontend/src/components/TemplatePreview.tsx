import { TEMPLATE_LOOKS } from '../templateStyles';

/** Vignette : palette et typographie du modèle, avec le nom du commerce en titre. */
export function TemplatePreview({ k, name }: { k: string; name: string }) {
  const look = TEMPLATE_LOOKS[k];
  if (!look) return null;
  return (
    <div className="tpl-thumb" style={{ background: look.bg, color: look.ink, fontFamily: `'${look.font}', serif` }} aria-hidden>
      <span className="tpl-bar" style={{ background: look.primary }} />
      <span className="tpl-title">{name.slice(0, 28)}</span>
      <span className="tpl-btn" style={{ background: look.accent }} />
    </div>
  );
}
