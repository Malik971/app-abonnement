/**
 * Cartes de DÉMONSTRATION affichées au visiteur (mode invité).
 *
 * ⚠️ Commerces FICTIFS à saveur locale (Guadeloupe), marqués `isDemo: true`.
 * Ne représentent aucun commerce réel — à remplacer par de vrais commerçants
 * pilotes plus tard. Chaque carte montre une progression de tampons déjà
 * entamée pour faire comprendre le concept en un coup d'œil.
 *
 * Modèle : carte à TAMPONS (pas de points). 1 passage = 1 tampon.
 * `stampsTotal` = passages nécessaires pour 1 récompense.
 */
export interface DemoCard {
  id: string;
  business_name: string;
  business_type: string;
  city: string;
  /** Adresse affichée sur la carte / le détail. */
  address: string;
  /** Courte description du commerce. */
  description: string;
  /** Couleur de marque de la carte (hex). */
  color: string;
  /** Nombre de passages pour obtenir la récompense. */
  stampsTotal: number;
  /** Passages déjà obtenus (progression de démo). */
  stampsFilled: number;
  reward_label: string;
  isDemo: true;
}

export const DEMO_CARDS: DemoCard[] = [
  {
    id: 'demo-snack-ti-punch',
    business_name: 'Snack Ti Punch',
    business_type: 'Snack',
    city: 'Pointe-à-Pitre',
    address: '12 rue Frébault, Pointe-à-Pitre',
    description: 'Bokit, agoulou et jus frais le midi.',
    color: '#E76F51',
    stampsTotal: 8,
    stampsFilled: 5,
    reward_label: '1 menu offert',
    isDemo: true,
  },
  {
    id: 'demo-barber-king-971',
    business_name: 'Barber King 971',
    business_type: 'Barbier',
    city: 'Les Abymes',
    address: 'Centre commercial Milénis, Les Abymes',
    description: 'Coupe, dégradé et taille de barbe.',
    color: '#1D2230',
    stampsTotal: 10,
    stampsFilled: 7,
    reward_label: '1 coupe offerte',
    isDemo: true,
  },
  {
    id: 'demo-le-bon-lambi',
    business_name: 'Lé Bon Lambi',
    business_type: 'Restaurant créole',
    city: 'Le Gosier',
    address: 'Bord de mer, Le Gosier',
    description: 'Cuisine créole maison, midi en semaine.',
    color: '#0D9488',
    stampsTotal: 10,
    stampsFilled: 3,
    reward_label: '1 plat offert',
    isDemo: true,
  },
  {
    id: 'demo-jus-peyi',
    business_name: 'Jus Péyi',
    business_type: 'Bar à jus',
    city: 'Baie-Mahault',
    address: 'Zone Jarry, Baie-Mahault',
    description: 'Jus de fruits péyi pressés minute.',
    color: '#F2A900',
    stampsTotal: 6,
    stampsFilled: 4,
    reward_label: '1 jus offert',
    isDemo: true,
  },
  {
    id: 'demo-coiff-karukera',
    business_name: "Coiff'Karukera",
    business_type: 'Salon de coiffure',
    city: 'Le Gosier',
    address: 'Résidence Karukera, Le Gosier',
    description: 'Coiffure femme & homme, brushing.',
    color: '#7C3AED',
    stampsTotal: 8,
    stampsFilled: 2,
    reward_label: '1 brushing offert',
    isDemo: true,
  },
];

export function getDemoCard(id: string): DemoCard | undefined {
  return DEMO_CARDS.find((c) => c.id === id);
}
