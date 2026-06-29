import { Linking, StyleSheet } from 'react-native';

import { Accordion, type AccordionEntry } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { LegalScreen } from '@/components/ui/LegalScreen';

const SUPPORT_EMAIL = 'support@fideli.app'; // TODO: remplacer par l'adresse réelle

const FAQ: AccordionEntry[] = [
  {
    question: 'Comment enregistrer une carte de fidélité ?',
    answer:
      'Rends-toi dans le commerce partenaire, demande au commerçant de scanner ton QR code depuis l’application Fidéli. Ta carte s’enregistre automatiquement.',
  },
  {
    question: 'Où trouver mon QR code ?',
    answer:
      'Dans l’onglet « Scanner » de l’application. Montre-le au commerçant à chaque passage.',
  },
  {
    question: 'Mes tampons ont disparu, que faire ?',
    answer:
      'Tes tampons sont sauvegardés sur nos serveurs. Si tu as changé de téléphone, reconnecte-toi avec le même email et ils réapparaîtront.',
  },
  {
    question: 'Comment réclamer ma récompense ?',
    answer:
      'Quand ta carte est complète, un bouton « Réclamer ma récompense » apparaît. Montre-le au commerçant qui validera directement depuis son application.',
  },
  {
    question: 'Comment supprimer mon compte ?',
    answer:
      'Dans l’onglet Profil > Mon compte > Supprimer mon compte. Toutes tes données sont effacées définitivement.',
  },
  {
    question: 'Je n’ai pas reçu mon code de connexion.',
    answer:
      'Vérifie tes spams. Si le problème persiste, attends 60 secondes et demande un nouveau code. Contacte-nous si ça continue.',
  },
];

export default function HelpScreen() {
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
