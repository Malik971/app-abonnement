import { Linking, StyleSheet } from 'react-native';

import { Accordion, type AccordionEntry } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { LegalScreen } from '@/components/ui/LegalScreen';

const SUPPORT_EMAIL = 'support@fideli.app'; // TODO: remplacer par l'adresse réelle

const FAQ: AccordionEntry[] = [
  {
    question: 'Comment mes clients cumulent-ils des passages ?',
    answer:
      'Affiche ton QR code en caisse (depuis le tableau de bord ou les réglages). Le client le scanne dans Fidéli à chaque visite : son passage est compté automatiquement.',
  },
  {
    question: 'Comment personnaliser ma carte ?',
    answer:
      'Depuis le tableau de bord, touche « Ma carte ». Tu choisis la couleur, le nombre de tampons et la récompense, avec un aperçu en temps réel.',
  },
  {
    question: 'Comment valider une récompense ?',
    answer:
      'Quand un client a rempli sa carte, il te présente son code de récompense. Tu confirmes, et sa carte repart pour un tour.',
  },
  {
    question: "Qu'est-ce que l'essai gratuit ?",
    answer:
      "Tu profites de toutes les fonctions Pro pendant 60 jours. Sans abonnement à la fin, tu repasses en Starter. On te prévient avant.",
  },
  {
    question: 'Comment envoyer une notification à mes clients ?',
    answer:
      "Dans l'onglet Notifs (réservé Pro et Premium) : écris ton message et choisis d'envoyer à tous ou seulement aux clients inactifs.",
  },
  {
    question: 'Mon compte est en attente de validation, pourquoi ?',
    answer:
      "Nous vérifions chaque commerce avant activation (en général sous 24 à 48h), pour garantir la confiance. Tu reçois un email dès que c'est bon.",
  },
];

export default function MerchantHelpScreen() {
  return (
    <LegalScreen title="Aide">
      <Accordion items={FAQ} />
      <Button
        label="Contacter le support"
        variant="secondary"
        style={styles.support}
        onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
      />
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  support: { marginTop: 0 },
});
