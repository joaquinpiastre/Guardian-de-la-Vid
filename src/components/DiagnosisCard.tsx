import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DISCLAIMER_ORIENTATIVE } from '../constants/strings';
import { colors, radii, spacing, typography } from '../constants/theme';
import type { DiagnosisPipelineResult } from '../services/diagnosisService';
import { ConfidenceBar } from './ConfidenceBar';
import { DiseaseBadge } from './DiseaseBadge';

interface DiagnosisCardProps {
  analysis: DiagnosisPipelineResult;
}

/**
 * Tarjeta principal de resultado: agrupa enfermedad, riesgo, confianza y avisos.
 */
export function DiagnosisCard({ analysis }: DiagnosisCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="leaf-maple" size={22} color={colors.primary} />
        <Text style={[typography.subtitle, styles.sectionTitle]}>Resultado del análisis</Text>
      </View>

      <DiseaseBadge label={analysis.label} />

      <View style={styles.block}>
        <Text style={styles.metaLabel}>Confianza del modelo</Text>
        <ConfidenceBar confidence={analysis.confidence} />
        <Text style={[typography.body, styles.category]}>{analysis.confidenceCategory}</Text>
        {analysis.lowConfidenceHint ? (
          <Text style={[typography.caption, styles.hint]}>{analysis.lowConfidenceHint}</Text>
        ) : null}
      </View>

      <View style={styles.block}>
        <Text style={styles.metaLabel}>Nivel de riesgo</Text>
        <View style={styles.riskRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.warning} />
          <Text style={[typography.body, styles.riskText]}>{analysis.riskLevel}</Text>
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.metaLabel}>Recomendación</Text>
        <Text style={[typography.body, styles.reco]}>{analysis.recommendation}</Text>
      </View>

      <View style={styles.disclaimer}>
        <MaterialCommunityIcons name="information-outline" size={18} color={colors.textMuted} />
        <Text style={[typography.caption, styles.disclaimerText]}>{DISCLAIMER_ORIENTATIVE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: colors.primaryDark,
  },
  block: {
    gap: 6,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  category: {
    color: colors.text,
    marginTop: 4,
  },
  hint: {
    color: colors.warning,
    marginTop: 4,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskText: {
    color: colors.text,
    fontWeight: '600',
  },
  reco: {
    color: colors.text,
    lineHeight: 22,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disclaimerText: {
    flex: 1,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
