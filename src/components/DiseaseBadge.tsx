import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../constants/theme';
import type { DiseaseLabel } from '../types/diagnosis';

interface DiseaseBadgeProps {
  label: DiseaseLabel;
}

const BADGE_COLORS: Record<DiseaseLabel, { bg: string; fg: string }> = {
  'Hoja sana': { bg: colors.primaryMuted, fg: colors.primaryDark },
  Mildiu: { bg: '#EDE9FE', fg: '#5B21B6' },
  Oídio: { bg: '#FEF3C7', fg: '#92400E' },
  'Podredumbre bacteriana': { bg: '#FEE2E2', fg: colors.danger },
};

/**
 * Chip de enfermedad detectada con color distintivo por clase.
 */
export function DiseaseBadge({ label }: DiseaseBadgeProps) {
  const palette = BADGE_COLORS[label];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[typography.subtitle, styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.lg,
  },
  text: {
    fontSize: 16,
  },
});
