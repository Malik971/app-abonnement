import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { theme } from '@/constants/theme';

export interface AccordionEntry {
  question: string;
  answer: string;
}

/** Liste de questions/réponses repliables, chevron animé (reanimated). */
export function Accordion({ items }: { items: AccordionEntry[] }) {
  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <View key={item.question}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <AccordionItem {...item} />
        </View>
      ))}
    </View>
  );
}

function AccordionItem({ question, answer }: AccordionEntry) {
  const [open, setOpen] = useState(false);
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withTiming(open ? 1 : 0, { duration: 200 });
  }, [open, rot]);

  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 90}deg` }] }));

  return (
    <View>
      <Pressable
        style={styles.header}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.question}>{question}</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.Text entering={FadeIn.duration(160)} style={styles.answer}>
          {answer}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  question: { flex: 1, fontFamily: theme.fonts.title, fontSize: theme.fontSize.md, color: theme.colors.text },
  answer: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    paddingBottom: theme.spacing.md,
  },
});
