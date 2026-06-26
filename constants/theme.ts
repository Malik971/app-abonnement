/**
 * Thème visuel global de l'application.
 * Couleurs, espacements, rayons et tailles de police.
 * Langue de l'interface : français. Textes courts et directs.
 */

export const theme = {
  colors: {
    primary: '#E8420A', // Orange Guadeloupe, chaud et fort
    primaryLight: '#FFF0EB', // Fond orange très léger
    primaryDark: '#C23500', // Orange foncé pour les états pressed
    success: '#16A34A', // Validation, points gagnés
    warning: '#D97706', // Alertes clients inactifs
    danger: '#DC2626', // Mur atteint, erreurs critiques
    locked: '#9CA3AF', // Fonctionnalités verrouillées
    background: '#F7F7F7', // Fond général
    surface: '#FFFFFF', // Cards, modals
    text: '#1A1A1A', // Texte principal
    textSecondary: '#6B7280', // Texte secondaire, labels
    border: '#E8E8E8', // Bordures légères
    cardText: '#FFFFFF', // Texte sur les cartes colorées
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
