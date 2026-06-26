/**
 * Tests du calcul de la prochaine récompense (logique de points côté client).
 * On mocke le client Supabase : computeNextReward est une fonction pure.
 */
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

import { computeNextReward } from '@/lib/queries';
import type { Reward } from '@/types';

const rewards: Reward[] = [
  { points_required: 5, label: 'Boisson offerte' },
  { points_required: 10, label: 'Café offert' },
  { points_required: 20, label: 'Menu offert' },
];

describe('computeNextReward', () => {
  it('cible la première récompense non atteinte', () => {
    const res = computeNextReward(3, rewards);
    expect(res.next_reward?.label).toBe('Boisson offerte');
    expect(res.points_to_next).toBe(2);
  });

  it('saute les récompenses déjà atteignables', () => {
    const res = computeNextReward(7, rewards);
    expect(res.next_reward?.label).toBe('Café offert');
    expect(res.points_to_next).toBe(3);
  });

  it('trie les récompenses même si non ordonnées', () => {
    const shuffled: Reward[] = [
      { points_required: 20, label: 'Menu' },
      { points_required: 5, label: 'Boisson' },
      { points_required: 10, label: 'Café' },
    ];
    const res = computeNextReward(6, shuffled);
    expect(res.next_reward?.label).toBe('Café');
    expect(res.points_to_next).toBe(4);
  });

  it('renvoie null quand tout est débloqué', () => {
    const res = computeNextReward(25, rewards);
    expect(res.next_reward).toBeNull();
    expect(res.points_to_next).toBe(0);
  });

  it('gère une liste de récompenses vide', () => {
    const res = computeNextReward(0, []);
    expect(res.next_reward).toBeNull();
    expect(res.points_to_next).toBe(0);
  });
});
