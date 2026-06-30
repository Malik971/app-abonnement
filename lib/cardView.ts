/**
 * Modèle de vue unifié pour une carte à tampons, consommé par LoyaltyCardView /
 * CardStack / l'écran détail. Convertit aussi bien une vraie carte
 * (LoyaltyCardWithDetails, où 1 point en base = 1 tampon) qu'une carte de démo.
 *
 * Aucune notion de « points » exposée : uniquement des tampons / passages.
 */
import type { DemoCard } from '@/constants/demoCards';
import type { LoyaltyCardWithDetails } from '@/types';

export interface CardViewModel {
  id: string;
  merchantName: string;
  businessType?: string;
  /** Tampons obtenus dans le cycle en cours. */
  stampsFilled: number;
  /** Tampons nécessaires pour la prochaine récompense (0 si aucune configurée). */
  stampsTotal: number;
  rewardLabel: string;
  /** Total de passages cumulés (affiché quand aucune récompense n'est configurée). */
  totalVisits: number;
  /** Personnalisation par le commerçant. */
  color?: string;
  address?: string;
  description?: string;
  isDemo: boolean;
}

/** Vraie carte → modèle de vue. 1 point = 1 tampon ; la récompense suivante donne le total. */
export function realCardToView(card: LoyaltyCardWithDetails): CardViewModel {
  const total = card.next_reward?.points_required ?? 0;
  return {
    id: card.id,
    merchantName: card.business_name,
    businessType: card.business_type ?? undefined,
    stampsFilled: total > 0 ? Math.min(card.points, total) : 0,
    stampsTotal: total,
    rewardLabel: card.next_reward?.label ?? '',
    totalVisits: card.total_visits,
    color: card.card_color ?? undefined,
    address: card.address ?? undefined,
    description: card.description ?? undefined,
    isDemo: false,
  };
}

/** Carte de démo → modèle de vue. */
export function demoCardToView(card: DemoCard): CardViewModel {
  return {
    id: card.id,
    merchantName: card.business_name,
    businessType: card.business_type,
    stampsFilled: card.stampsFilled,
    stampsTotal: card.stampsTotal,
    rewardLabel: card.reward_label,
    totalVisits: card.stampsFilled,
    color: card.color,
    address: card.address,
    description: card.description,
    isDemo: true,
  };
}
