/**
 * Store commerçant (Zustand) : profil commerce, programme, dashboard, clients.
 */
import { create } from 'zustand';

import type {
  LoyaltyProgram,
  Merchant,
  MerchantClientRow,
  MerchantDashboardStats,
} from '@/types';

interface MerchantState {
  merchant: Merchant | null;
  program: LoyaltyProgram | null;
  stats: MerchantDashboardStats | null;
  clients: MerchantClientRow[];

  setMerchant: (merchant: Merchant | null) => void;
  setProgram: (program: LoyaltyProgram | null) => void;
  setStats: (stats: MerchantDashboardStats | null) => void;
  setClients: (clients: MerchantClientRow[]) => void;
  clear: () => void;
}

export const useMerchantStore = create<MerchantState>((set) => ({
  merchant: null,
  program: null,
  stats: null,
  clients: [],

  setMerchant: (merchant) => set({ merchant }),
  setProgram: (program) => set({ program }),
  setStats: (stats) => set({ stats }),
  setClients: (clients) => set({ clients }),

  clear: () => set({ merchant: null, program: null, stats: null, clients: [] }),
}));
