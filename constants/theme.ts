/**
 * Thème visuel global de l'application : identité de marque FIDÉLI.
 * Slogan : « Chaque passage compte. »
 * Langue de l'interface : français. Textes courts et directs.
 */

export const theme = {
  colors: {
    primary: '#D62828', // Rouge Fidéli (couleur principale)
    primaryDark: '#C1121F', // Rouge foncé (états pressed, dégradés)
    accent: '#F2A900', // Orange/or des ailes (accents, highlights)
    gradientStart: '#F2A900', // Début du dégradé de marque (orange)
    gradientMid: '#E23B2E', // Milieu du dégradé
    gradientEnd: '#C1121F', // Fin du dégradé (rouge foncé)
    primaryLight: '#FDECDF', // Rouge très clair (fonds de badges, avatars)
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    locked: '#9CA3AF',
    background: '#F6F7FB', // Fond général des écrans
    surface: '#FFFFFF',
    text: '#1D2230', // Texte principal (bleu nuit, pas noir pur)
    textSecondary: '#6B7488',
    border: '#E8E8EE',
    cardText: '#FFFFFF',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 14, lg: 24, xl: 46, full: 999 },
  fontSize: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, display: 34 },
  fonts: {
    title: 'Fredoka_600SemiBold',
    titleBold: 'Fredoka_700Bold',
    body: 'Fredoka_400Regular',
    mono: 'ChakraPetch_500Medium',
    monoBold: 'ChakraPetch_600SemiBold',
  },
} as const;

export type Theme = typeof theme;
export type ThemeColor = keyof typeof theme.colors;
