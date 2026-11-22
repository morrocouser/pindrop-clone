import { API_ORIGIN } from '../api';
import { TEMPLATE_LOOKS } from '../templateStyles';

/** Vignette : photo du gabarit réel s'il en a une, sinon palette et typographie avec le nom du commerce. */
export function TemplatePreview({ k, name }: { k: string; name: string }) {
  const look = TEMPLATE_LOOKS[k];
  if (!look) return null;
  const font = `'${look.font}', serif`;
  if (look.thumb) {
    return (
      <div className="tpl-thumb photo" style={{ fontFamily: font }} aria-hidden>
        <img src={`${API_ORIGIN}${look.thumb}`} alt="" loading="lazy" />
        <span className="tpl-title">{name.slice(0, 28)}</span>
      </div>
    );
  }
  return (
    <div className="tpl-thumb" style={{ background: look.bg, color: look.ink, fontFamily: font }} aria-hidden>
      <span className="tpl-bar" style={{ background: look.primary }} />
      <span className="tpl-title">{name.slice(0, 28)}</span>
      <span className="tpl-btn" style={{ background: look.accent }} />
    </div>
  );
}
