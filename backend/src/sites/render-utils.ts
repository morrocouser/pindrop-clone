const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Échappe une valeur pour l'insérer dans du HTML (texte ou attribut entre guillemets). */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
