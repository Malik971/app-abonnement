import { StyleSheet, Text } from 'react-native';

import { LegalBullet, LegalScreen, LegalSection, LegalText } from '@/components/ui/LegalScreen';
import { theme } from '@/constants/theme';

export default function PrivacyScreen() {
  return (
    <LegalScreen title="Confidentialité">
      <LegalSection title="1. Responsable du traitement">
        <LegalText>
          Fidéli, application mobile de fidélité exploitée en micro-entreprise par Malik Ibo,
          Guadeloupe (971), France. Contact : support@fideli.app
        </LegalText>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <LegalBullet>Données d’inscription : prénom, adresse email.</LegalBullet>
        <LegalBullet>
          Données de fidélité : historique des passages, récompenses obtenues, commerces rejoints.
        </LegalBullet>
        <LegalBullet>
          Données techniques : token de notification push (si activé), logs de connexion.
        </LegalBullet>
        <LegalBullet>Aucune donnée de paiement (les paiements ne transitent pas par Fidéli).</LegalBullet>
        <LegalBullet>Aucune donnée de localisation.</LegalBullet>
      </LegalSection>

      <LegalSection title="3. Finalités et base légale">
        <LegalBullet>Gestion du programme de fidélité (base : exécution du contrat).</LegalBullet>
        <LegalBullet>Envoi de notifications push si consentement donné (base : consentement).</LegalBullet>
        <LegalBullet>Sécurité et prévention des fraudes (base : intérêt légitime).</LegalBullet>
      </LegalSection>

      <LegalSection title="4. Conservation">
        <LegalText>
          Les données sont conservées pendant la durée d’activité du compte, puis supprimées dans
          un délai de 30 jours suivant la demande de suppression.
        </LegalText>
      </LegalSection>

      <LegalSection title="5. Partage des données">
        <LegalText>Les données sont partagées uniquement :</LegalText>
        <LegalBullet>
          Avec les commerçants partenaires (nom du client + historique de passages chez eux
          uniquement).
        </LegalBullet>
        <LegalBullet>
          Avec nos sous-traitants techniques : Supabase (hébergement, serveurs Union Européenne),
          Expo (build mobile), Stripe (abonnements commerçants uniquement).
        </LegalBullet>
        <LegalBullet>Jamais vendues à des tiers.</LegalBullet>
      </LegalSection>

      <LegalSection title="6. Sécurité">
        <LegalText>
          Données chiffrées en transit (HTTPS/TLS) et au repos (chiffrement AES-256 Supabase).
          Accès restreint aux données personnelles. Aucune clé privée stockée côté client.
        </LegalText>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <LegalText>Conformément au RGPD (Règlement UE 2016/679) :</LegalText>
        <LegalBullet>Droit d’accès à vos données.</LegalBullet>
        <LegalBullet>Droit de rectification.</LegalBullet>
        <LegalBullet>
          Droit à l’effacement (« droit à l’oubli »), accessible directement dans l’app : Profil
          &gt; Supprimer mon compte.
        </LegalBullet>
        <LegalBullet>Droit à la portabilité (demande par email).</LegalBullet>
        <LegalBullet>Droit d’opposition au traitement.</LegalBullet>
        <LegalBullet>
          Pour exercer ces droits : support@fideli.app. Réponse sous 30 jours.
        </LegalBullet>
      </LegalSection>

      <LegalSection title="8. Cookies et traceurs">
        <LegalText>
          L’application n’utilise pas de cookies. Un identifiant local (AsyncStorage) est utilisé
          pour mémoriser tes préférences, sans traçage publicitaire.
        </LegalText>
      </LegalSection>

      <LegalSection title="9. Modifications">
        <LegalText>
          Cette politique peut être mise à jour. La date de dernière modification est indiquée
          ci-dessous.
        </LegalText>
      </LegalSection>

      <Text style={styles.updated}>Date de dernière mise à jour : Juin 2026</Text>
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  updated: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: theme.spacing.sm },
});
