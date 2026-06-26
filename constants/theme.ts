/**
 * Thème visuel global de l'application.
 * Couleurs, espacements, rayons et tailles de police.
 * Langue de l'interface : français. Textes courts et directs.
 */

export const theme = {
  colors: {
    primary: '#1A56FF', // Bleu principal, actions, CTA
    primaryLight: '#E8EEFF', // Fond bleu léger, backgrounds secondaires
    success: '#16A34A', // Validation, points gagnés
    warning: '#D97706', // Alertes clients inactifs
    danger: '#DC2626', // Mur atteint, erreurs critiques
    locked: '#9CA3AF', // Fonctionnalités verrouillées
    background: '#F9FAFB', // Fond général
    surface: '#FFFFFF', // Cards, modals
    text: '#111827', // Texte principal
    textSecondary: '#6B7280', // Texte secondaire, labels
    border: '#E5E7EB', // Bordures légères
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 20,
    full: 999,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    display: 34,
  },
} as const;

export type Theme = typeof theme;
export type ThemeColor = keyof typeof theme.colors;
