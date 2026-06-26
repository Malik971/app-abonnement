/**
 * Tests de la logique des 3 murs tarifaires.
 */
import {
  canSeeDetailedStats,
  canSendPush,
  hasReachedClientLimit,
  nextPlan,
  PLANS,
} from '@/constants/plans';

describe('MUR 1 — limite de clients', () => {
  it('bloque le plan starter à 50 clients', () => {
    expect(hasReachedClientLimit('starter', 49)).toBe(false);
    expect(hasReachedClientLimit('starter', 50)).toBe(true);
    expect(hasReachedClientLimit('starter', 73)).toBe(true);
  });

  it('ne bloque jamais les plans pro et premium', () => {
    expect(hasReachedClientLimit('pro', 10_000)).toBe(false);
    expect(hasReachedClientLimit('premium', 10_000)).toBe(false);
  });
});

describe('MUR 2 — notifications push', () => {
  it('verrouille les push en starter', () => {
    expect(canSendPush('starter')).toBe(false);
  });
  it('autorise les push en pro et premium', () => {
    expect(canSendPush('pro')).toBe(true);
    expect(canSendPush('premium')).toBe(true);
  });
});

describe('MUR 3 — stats détaillées', () => {
  it('verrouille les stats détaillées en starter', () => {
    expect(canSeeDetailedStats('starter')).toBe(false);
  });
  it('débloque les stats en pro et premium', () => {
    expect(canSeeDetailedStats('pro')).toBe(true);
    expect(canSeeDetailedStats('premium')).toBe(true);
  });
});

describe('nextPlan', () => {
  it('propose la montée en gamme', () => {
    expect(nextPlan('starter')).toBe('pro');
    expect(nextPlan('pro')).toBe('premium');
    expect(nextPlan('premium')).toBeNull();
  });
});

describe('PLANS — cohérence des prix', () => {
  it('respecte la grille tarifaire', () => {
    expect(PLANS.starter.price_eur).toBe(0);
    expect(PLANS.pro.price_eur).toBe(29);
    expect(PLANS.premium.price_eur).toBe(69);
  });
});
