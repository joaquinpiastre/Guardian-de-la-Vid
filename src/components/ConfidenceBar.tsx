import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../constants/theme';

interface ConfidenceBarProps {
  /** Valor en [0, 1] */
  confidence: number;
}

/**
 * Barra visual de confianza: traduce el número del modelo a una escala intuitiva.
 */
export function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(confidence * 100)));
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={[typography.caption, styles.label]}>{pct}% de confianza</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  track: {
    height: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
  },
  label: {
    color: colors.textMuted,
  },
});
