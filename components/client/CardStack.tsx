import { Pressable, StyleSheet, View } from 'react-native';

import { LoyaltyCardView } from '@/components/client/LoyaltyCardView';
import type { CardViewModel } from '@/lib/cardView';

interface CardStackProps {
  cards: CardViewModel[];
  onPressCard: (id: string) => void;
}

// Chevauchement vertical : les cartes s'empilent comme dans un portefeuille
// (style Stocard / Apple Wallet), chacune laissant dépasser son en-tête.
const OVERLAP = 120;

/**
 * Portefeuille de cartes empilées. La dernière est entièrement visible ;
 * les précédentes laissent dépasser leur en-tête (nom du commerce), tap →
 * ouverture du détail.
 */
export function CardStack({ cards, onPressCard }: CardStackProps) {
  return (
    <View style={styles.stack}>
      {cards.map((c, i) => (
        <Pressable
          key={c.id}
          onPress={() => onPressCard(c.id)}
          style={i > 0 ? styles.overlapped : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Carte ${c.merchantName}`}
        >
          <LoyaltyCardView
            merchantName={c.merchantName}
            businessType={c.businessType}
            stampsFilled={c.stampsFilled}
            stampsTotal={c.stampsTotal}
            rewardLabel={c.rewardLabel}
            totalVisits={c.totalVisits}
            isDemo={c.isDemo}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { paddingBottom: 0 },
  overlapped: { marginTop: -OVERLAP },
});
