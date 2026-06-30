/**
 * Utilitaires couleur pour les cartes personnalisables par les commerçants.
 */

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function toHex(c: number): string {
  return c.toString(16).padStart(2, '0');
}

/**
 * Éclaircit (amount > 0) ou assombrit (amount < 0) une couleur hex.
 * `amount` dans [-1, 1].
 */
export function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const adj = (c: number) =>
    amount >= 0 ? clamp(Math.round(c + (255 - c) * amount)) : clamp(Math.round(c * (1 + amount)));
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
}

/** Dégradé de carte (3 arrêts) dérivé d'une couleur de base. */
export function cardGradient(base: string): [string, string, string] {
  return [shade(base, 0.12), base, shade(base, -0.22)];
}

/** Couleur de carte par défaut (rouge Fidéli). */
export const DEFAULT_CARD_COLOR = '#D62828';

/**
 * Palette proposée au commerçant pour personnaliser sa carte (36 teintes :
 * chaudes, froides, neutres et couleurs de marque). Toutes restent lisibles
 * avec du texte blanc.
 */
export const CARD_PALETTE = [
  // Chaudes
  '#D62828', '#C1121F', '#E63946', '#E76F51', '#F4A261', '#F2A900',
  '#FF6B6B', '#FF8FAB', '#DB2777', '#B5179E', '#9D174D', '#A0522D',
  // Froides
  '#7C3AED', '#6D28D9', '#4338CA', '#2563EB', '#1D4ED8', '#0EA5E9',
  '#06B6D4', '#0D9488', '#0F766E', '#16A34A', '#15803D', '#4D7C0F',
  // Neutres et profondes
  '#1D2230', '#0F172A', '#111827', '#334155', '#475569', '#64748B',
  '#3F3F46', '#52525B', '#2F4F4F', '#654321', '#8D5524', '#5B21B6',
] as const;
