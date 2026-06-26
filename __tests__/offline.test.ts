/**
 * Tests de la queue offline (AsyncStorage) et de la synchronisation.
 * AsyncStorage est mocké en mémoire (jest.setup.js). Le client Supabase est
 * mocké pour contrôler le retour de sync_offline_scans.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import {
  bumpAttempts,
  clearPendingScans,
  enqueueScan,
  getPendingScans,
  removePendingByTokens,
  syncPendingScans,
} from '@/lib/offline';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockRpc.mockReset();
});

describe('queue locale', () => {
  it('ajoute un scan et le relit', async () => {
    await enqueueScan('token-A');
    const pending = await getPendingScans();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.program_qr_token).toBe('token-A');
    expect(pending[0]!.attempts).toBe(0);
    expect(pending[0]!.localId).toBeTruthy();
  });

  it('conserve l\'ordre et accumule plusieurs scans', async () => {
    await enqueueScan('a');
    await enqueueScan('b');
    await enqueueScan('a');
    const pending = await getPendingScans();
    expect(pending.map((p) => p.program_qr_token)).toEqual(['a', 'b', 'a']);
  });

  it('retire une occurrence par token traité (gère les doublons)', async () => {
    await enqueueScan('a');
    await enqueueScan('b');
    await enqueueScan('a');
    await removePendingByTokens(['a']);
    const pending = await getPendingScans();
    // Une seule occurrence de "a" retirée.
    expect(pending.map((p) => p.program_qr_token)).toEqual(['b', 'a']);
  });

  it('incrémente le compteur de tentatives', async () => {
    const entry = await enqueueScan('a');
    await bumpAttempts([entry.localId]);
    const pending = await getPendingScans();
    expect(pending[0]!.attempts).toBe(1);
  });

  it('vide la queue', async () => {
    await enqueueScan('a');
    await clearPendingScans();
    expect(await getPendingScans()).toHaveLength(0);
  });
});

describe('syncPendingScans', () => {
  it('ne fait rien si la queue est vide', async () => {
    const outcome = await syncPendingScans('client-1');
    expect(outcome).toEqual({ appliedCount: 0, errorCount: 0, fullMerchantTokens: [] });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('retire les scans appliqués et les erreurs terminales, garde le reste', async () => {
    await enqueueScan('ok');
    await enqueueScan('full');
    await enqueueScan('invalid');

    mockRpc.mockResolvedValue({
      data: {
        applied: [{ token: 'ok' }],
        errors: [
          { token: 'full', error: 'merchant_full' },
          { token: 'invalid', error: 'invalid_qr' },
        ],
      },
      error: null,
    });

    const outcome = await syncPendingScans('client-1');

    expect(mockRpc).toHaveBeenCalledWith('sync_offline_scans', expect.objectContaining({
      p_client_id: 'client-1',
    }));
    expect(outcome.appliedCount).toBe(1);
    expect(outcome.fullMerchantTokens).toEqual(['full']);
    // Tout a été traité (appliqué ou erreur terminale) → queue vide.
    expect(await getPendingScans()).toHaveLength(0);
  });

  it('conserve la queue et lève en cas d\'erreur réseau', async () => {
    await enqueueScan('a');
    mockRpc.mockResolvedValue({ data: null, error: { message: 'network down' } });

    await expect(syncPendingScans('client-1')).rejects.toBeDefined();

    const pending = await getPendingScans();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.attempts).toBe(1); // tentative incrémentée
  });
});
