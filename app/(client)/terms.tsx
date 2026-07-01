import { StyleSheet, Text } from 'react-native';

import { LegalScreen, LegalSection, LegalText } from '@/components/ui/LegalScreen';
import { theme } from '@/constants/theme';

export default function TermsScreen() {
  return (
    <LegalScreen title="Conditions d'utilisation">
      <LegalSection title="1. Objet du service">
        <LegalText>
          Fidéli est une application mobile de fidélité qui permet aux clients de cumuler des
          passages auprès de commerçants partenaires en Guadeloupe et de bénéficier de
          récompenses. Les présentes conditions régissent l’utilisation de l’application.
        </LegalText>
      </LegalSection>

      <LegalSection title="2. Accès et inscription">
        <LegalText>
          L’application est accessible gratuitement aux clients. La création d’un compte client
          nécessite un prénom et une adresse email valide, avec validation par un code envoyé par
          email. Tu es responsable de la confidentialité de l’accès à ton compte. Les commerçants
          disposent d’un espace dédié, soumis à validation préalable.
        </LegalText>
      </LegalSection>

      <LegalSection title="3. Utilisation de l'application">
        <LegalText>
          Tu t’engages à utiliser Fidéli de manière loyale, sans tenter de fausser le cumul de
          passages ni d’usurper l’identité d’un autre utilisateur ou commerce. Tout usage
          frauduleux peut entraîner la suspension du compte. Les passages et récompenses n’ont
          aucune valeur monétaire et ne sont ni échangeables ni remboursables.
        </LegalText>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <LegalText>
          La marque Fidéli, son logo, son identité visuelle et le code de l’application sont
          protégés. Toute reproduction ou réutilisation sans autorisation est interdite. Les noms
          et marques des commerces partenaires restent la propriété de leurs titulaires.
        </LegalText>
      </LegalSection>

      <LegalSection title="5. Limitation de responsabilité">
        <LegalText>
          Fidéli met tout en œuvre pour assurer le bon fonctionnement du service mais ne peut
          garantir une disponibilité sans interruption. La relation commerciale, la validité et la
          remise des récompenses relèvent de la responsabilité du commerçant partenaire. Fidéli ne
          saurait être tenue responsable d’un litige entre un client et un commerce.
        </LegalText>
      </LegalSection>

      <LegalSection title="6. Droit applicable">
        <LegalText>
          Les présentes conditions sont régies par le droit français. En cas de litige et à défaut
          de résolution amiable, compétence est attribuée au tribunal de Pointe-à-Pitre
          (Guadeloupe).
        </LegalText>
      </LegalSection>

      <Text style={styles.updated}>Dernière mise à jour : Juillet 2026</Text>
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  updated: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: theme.spacing.sm },
});
