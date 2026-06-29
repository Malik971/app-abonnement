/**
 * Tous les types TypeScript du projet.
 *
 * `Database` reflète le schéma Supabase (voir /supabase/migrations).
 * En production, régénère ce bloc avec :
 *   npx supabase gen types typescript --project-id <id> > types/database.types.ts
 * et importe-le ici. On garde une définition manuelle pour que le projet
 * compile sans connexion au projet Supabase distant.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Rôles & domaine
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'merchant';

export type PlanId = 'starter' | 'pro' | 'premium';

/**
 * Forme d'une récompense stockée dans loyalty_programs.rewards (jsonb).
 * NOTE : les types de lignes sont déclarés en `type` (et non `interface`) car
 * supabase-js exige qu'ils soient assignables à `Record<string, unknown>` —
 * ce que les interfaces ne sont pas (pas de signature d'index implicite).
 */
export type Reward = {
  points_required: number;
  label: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Lignes des tables (camelCase évité : on garde les noms SQL pour coller à l'API)
// ─────────────────────────────────────────────────────────────────────────────

export type MerchantApprovalStatus = 'pending' | 'approved' | 'rejected';

export type Merchant = {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string | null;
  plan: PlanId;
  plan_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  push_token: string | null;
  active_clients_count: number;
  /** Statut de validation manuelle (migration 005). */
  approval_status: MerchantApprovalStatus;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export type LoyaltyProgram = {
  id: string;
  merchant_id: string;
  points_per_visit: number;
  rewards: Reward[];
  qr_code_token: string;
  created_at: string;
}

export type Client = {
  id: string;
  user_id: string;
  first_name: string | null;
  phone: string | null;
  push_token: string | null;
  /** Préférence de notifications push (migration 006). */
  push_enabled: boolean;
  created_at: string;
}

export type LoyaltyCard = {
  id: string;
  client_id: string;
  program_id: string;
  merchant_id: string;
  points: number;
  total_visits: number;
  last_visit_at: string | null;
  created_at: string;
}

export type Scan = {
  id: string;
  card_id: string;
  client_id: string | null;
  merchant_id: string | null;
  points_earned: number;
  synced_at: string;
  offline: boolean;
}

export type RedeemedReward = {
  id: string;
  card_id: string;
  reward_label: string;
  points_spent: number;
  redeemed_at: string;
}

export type OfflineQueueRow = {
  id: string;
  client_id: string | null;
  program_qr_token: string;
  created_locally_at: string;
  synced: boolean;
  synced_at: string | null;
}

/** Profil unifié (colonne `role`) — voir migration 001. */
export type Profile = {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vues enrichies utilisées par l'UI (jointures côté app)
// ─────────────────────────────────────────────────────────────────────────────

/** Carte de fidélité enrichie pour l'accueil client. */
export interface LoyaltyCardWithDetails extends LoyaltyCard {
  business_name: string;
  business_type: string | null;
  rewards: Reward[];
  /** Prochaine récompense pas encore atteinte, ou null si tout est débloqué. */
  next_reward: Reward | null;
  /** Points manquants pour la prochaine récompense (0 si déjà atteignable). */
  points_to_next: number;
}

/** Résultat de recherche de commerce (fonction search_merchants). */
export interface MerchantSearchResult {
  merchant_id: string;
  business_name: string;
  business_type: string | null;
  plan: PlanId;
  active_clients_count: number;
  program_id: string;
}

/** Client vu côté commerçant (liste clients). */
export interface MerchantClientRow {
  card_id: string;
  client_id: string | null;
  first_name: string | null;
  points: number;
  total_visits: number;
  last_visit_at: string | null;
  /** Jours depuis la dernière visite (null si jamais venu). */
  days_since_last_visit: number | null;
  /** True si inactif depuis 21 jours ou plus (mur Pro). */
  is_inactive: boolean;
}

export interface MerchantDashboardStats {
  active_clients_count: number;
  visits_today: number;
  /** Disponible uniquement en Pro/Premium. */
  inactive_clients_count: number | null;
  top_clients: MerchantClientRow[] | null;
  busiest_day: string | null;
  /** True si aucun scan depuis 7 jours → alerte rouge dashboard. */
  no_scan_alert: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline (forme stockée localement dans AsyncStorage)
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingScan {
  /** Identifiant local unique (uuid v4 généré côté app). */
  localId: string;
  program_qr_token: string;
  created_locally_at: string;
  /** Tentatives de sync, pour backoff / diagnostic. */
  attempts: number;
}

/** Résultat d'un scan (online ou résolu à la sync). */
export interface ScanResult {
  ok: boolean;
  offline: boolean;
  points_earned?: number;
  new_total?: number;
  business_name?: string;
  /** Code d'erreur métier (ex : mur 50 clients atteint). */
  error?: 'merchant_full' | 'invalid_qr' | 'network' | 'unknown';
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Database pour le client Supabase (conforme à GenericSchema de supabase-js)
// ─────────────────────────────────────────────────────────────────────────────

type WithDefaults<T> = Partial<T>;

/** Une table au format attendu par supabase-js (Row/Insert/Update/Relationships). */
interface TableDef<Row, Insert, Update> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      merchants: TableDef<
        Merchant,
        WithDefaults<Merchant> & Pick<Merchant, 'user_id' | 'business_name'>,
        WithDefaults<Merchant>
      >;
      loyalty_programs: TableDef<
        LoyaltyProgram,
        WithDefaults<LoyaltyProgram> & Pick<LoyaltyProgram, 'merchant_id'>,
        WithDefaults<LoyaltyProgram>
      >;
      clients: TableDef<
        Client,
        WithDefaults<Client> & Pick<Client, 'user_id'>,
        WithDefaults<Client>
      >;
      loyalty_cards: TableDef<
        LoyaltyCard,
        WithDefaults<LoyaltyCard> & Pick<LoyaltyCard, 'client_id' | 'program_id' | 'merchant_id'>,
        WithDefaults<LoyaltyCard>
      >;
      scans: TableDef<Scan, WithDefaults<Scan> & Pick<Scan, 'card_id'>, WithDefaults<Scan>>;
      redeemed_rewards: TableDef<
        RedeemedReward,
        WithDefaults<RedeemedReward> & Pick<RedeemedReward, 'card_id' | 'reward_label' | 'points_spent'>,
        WithDefaults<RedeemedReward>
      >;
      offline_queue: TableDef<
        OfflineQueueRow,
        WithDefaults<OfflineQueueRow> & Pick<OfflineQueueRow, 'program_qr_token' | 'created_locally_at'>,
        WithDefaults<OfflineQueueRow>
      >;
      profiles: TableDef<
        Profile,
        WithDefaults<Profile> & Pick<Profile, 'user_id' | 'role'>,
        WithDefaults<Profile>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      increment_points: {
        Args: { p_card_id: string; p_points: number };
        Returns: number;
      };
      update_merchant_client_count: {
        Args: { p_merchant_id: string };
        Returns: number;
      };
      sync_offline_scans: {
        Args: { p_client_id: string; p_qr_tokens: string[]; p_timestamps: string[] };
        Returns: unknown;
      };
      delete_client_data: {
        Args: { p_client_id: string };
        Returns: undefined;
      };
      search_merchants: {
        Args: { p_term: string };
        Returns: MerchantSearchResult[];
      };
      join_loyalty_program: {
        Args: { p_merchant_id: string };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
