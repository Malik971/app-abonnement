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

/** Palette proposée au commerçant (couleurs saturées, lisibles avec du texte blanc). */
export const CARD_COLORS = [
  '#D62828', // rouge Fidéli (défaut)
  '#C1121F', // rouge foncé
  '#E76F51', // terracotta
  '#F2A900', // or
  '#16A34A', // vert
  '#0D9488', // teal
  '#2563EB', // bleu
  '#7C3AED', // violet
  '#DB2777', // rose
  '#1D2230', // bleu nuit
] as const;
