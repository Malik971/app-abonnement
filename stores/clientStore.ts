/**
 * Store client final (Zustand) : profil, cartes de fidélité, points.
 * Les données sont chargées via TanStack Query puis miroir dans ce store
 * pour un accès synchrone simple depuis n'importe quel écran.
 */
import { create } from 'zustand';

import type { Client, LoyaltyCardWithDetails } from '@/types';

interface ClientState {
  client: Client | null;
  cards: LoyaltyCardWithDetails[];

  setClient: (client: Client | null) => void;
  setCards: (cards: LoyaltyCardWithDetails[]) => void;
  /** Met à jour les points d'une carte localement (après un scan). */
  applyScan: (cardId: string, newTotal: number) => void;
  clear: () => void;
}

export const useClientStore = create<ClientState>((set) => ({
  client: null,
  cards: [],

  setClient: (client) => set({ client }),

  setCards: (cards) => set({ cards }),

  applyScan: (cardId, newTotal) =>
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              points: newTotal,
              total_visits: card.total_visits + 1,
              last_visit_at: new Date().toISOString(),
            }
          : card,
      ),
    })),

  clear: () => set({ client: null, cards: [] }),
}));
