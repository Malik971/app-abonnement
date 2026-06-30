/**
 * Références centralisées des images de marque Fidéli.
 *
 * Vrais visuels extraits de la charte « Fideli Identite » (logo couleur, logo
 * blanc, logo compact, ailes). Pour les remplacer un jour, dépose les nouveaux
 * fichiers aux MÊMES chemins.
 *
 * NB app_icon.png : actuellement = ailes blanches (257×68). Le fond rouge vient
 * de android.adaptiveIcon.backgroundColor. Pour un build store, fournir un vrai
 * carré 1024×1024 (Expo Go n'utilise pas cette icône, donc OK en démo).
 */
export const brand = {
  logoColor: require('../assets/brand/logo_couleur.png'), // 631×340 :fonds clairs
  logoWhite: require('../assets/brand/logo_blanc_splash.png'), // 631×340 :splash / fonds colorés
  logoHome: require('../assets/brand/logo_home.png'), // 623×242 :en-tête des écrans
  wingsA: require('../assets/brand/ailes_a.png'), // 257×68 :ailes blanches (filigrane carte)
  wingsB: require('../assets/brand/ailes_b.png'), // 257×68 :ailes (fond clair)
  wingsC: require('../assets/brand/ailes_c.png'), // 257×68 :ailes (fond foncé)
  appIcon: require('../assets/brand/app_icon.png'), // ailes (voir note ci-dessus)
} as const;
