import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DISCLAIMER_ORIENTATIVE } from '../constants/strings';
import { colors, radii, spacing, typography } from '../constants/theme';
import type { DiagnosisPipelineResult } from '../services/diagnosisService';
import type { TreatmentGuide } from '../utils/recommendations';
import { getTreatmentGuide } from '../utils/recommendations';
import { ConfidenceBar } from './ConfidenceBar';
import { DiseaseBadge } from './DiseaseBadge';

interface DiagnosisCardProps {
  analysis: DiagnosisPipelineResult;
}

// ─── Colores de urgencia ──────────────────────────────────────────────────────

const URGENCY_STYLE: Record<string, { bg: string; fg: string; border: string }> = {
  Inmediata: { bg: '#FEE2E2', fg: colors.danger, border: '#FECACA' },
  Urgente: { bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' },
  Preventiva: { bg: colors.primaryMuted, fg: colors.primaryDark, border: '#BBF7D0' },
};

// ─── Componente de guía de tratamiento ───────────────────────────────────────

function TreatmentCard({ guide }: { guide: TreatmentGuide }) {
  const urgencyStyle = URGENCY_STYLE[guide.urgency] ?? URGENCY_STYLE.Preventiva!;

  return (
    <View style={treatStyles.container}>
      {/* Encabezado con patógeno y urgencia */}
      <View style={treatStyles.header}>
        <View style={treatStyles.headerLeft}>
          <MaterialCommunityIcons name="flask-outline" size={16} color={colors.primaryDark} />
          <Text style={treatStyles.pathogen}>{guide.pathogen}</Text>
        </View>
        <View style={[treatStyles.urgencyBadge, { backgroundColor: urgencyStyle.bg, borderColor: urgencyStyle.border }]}>
          <Text style={[treatStyles.urgencyText, { color: urgencyStyle.fg }]}>
            Acción {guide.urgency}
          </Text>
        </View>
      </View>

      {/* Descripción del riesgo */}
      <Text style={treatStyles.riskDesc}>{guide.riskDescription}</Text>

      {/* Pasos de acción */}
      <View style={treatStyles.section}>
        <View style={treatStyles.sectionHeader}>
          <MaterialCommunityIcons name="clipboard-list-outline" size={15} color={colors.primaryDark} />
          <Text style={treatStyles.sectionTitle}>Pasos de acción inmediata</Text>
        </View>
        {guide.immediateActions.map((item) => (
          <View key={item.step} style={treatStyles.stepRow}>
            <View style={treatStyles.stepBullet}>
              <Text style={treatStyles.stepNum}>{item.step}</Text>
            </View>
            <Text style={treatStyles.stepText}>{item.action}</Text>
          </View>
        ))}
      </View>

      {/* Productos recomendados */}
      <View style={treatStyles.section}>
        <View style={treatStyles.sectionHeader}>
          <MaterialCommunityIcons name="bottle-tonic-outline" size={15} color={colors.primaryDark} />
          <Text style={treatStyles.sectionTitle}>Productos y tratamientos</Text>
        </View>
        <Text style={treatStyles.bodyText}>{guide.recommendedProducts}</Text>
      </View>

      {/* Prevención */}
      <View style={treatStyles.section}>
        <View style={treatStyles.sectionHeader}>
          <MaterialCommunityIcons name="shield-check-outline" size={15} color={colors.success} />
          <Text style={treatStyles.sectionTitle}>Prevención</Text>
        </View>
        <Text style={treatStyles.bodyText}>{guide.prevention}</Text>
      </View>
    </View>
  );
}

const treatStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  pathogen: {
    ...typography.caption,
    color: colors.primaryDark,
    fontStyle: 'italic',
    fontWeight: '600',
    fontSize: 12,
    flex: 1,
  },
  urgencyBadge: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  riskDesc: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 19,
    fontSize: 12,
  },
  section: {
    gap: 6,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNum: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    ...typography.body,
    flex: 1,
    lineHeight: 21,
    color: colors.text,
    fontSize: 13,
  },
  bodyText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 19,
    fontSize: 13,
  },
});

// ─── Tarjeta principal de diagnóstico ─────────────────────────────────────────

/**
 * Tarjeta principal de resultado: agrupa enfermedad, riesgo, confianza,
 * recomendación corta y guía de tratamiento detallada (solo para enfermedades).
 */
export function DiagnosisCard({ analysis }: DiagnosisCardProps) {
  const treatmentGuide = getTreatmentGuide(analysis.label);
  const isDisease =
    analysis.label !== 'Hoja sana' && analysis.label !== 'No es hoja de vid';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="leaf-maple" size={22} color={colors.primary} />
        <Text style={[typography.subtitle, styles.sectionTitle]}>Resultado del análisis</Text>
      </View>

      {/* Etiqueta de enfermedad */}
      <DiseaseBadge label={analysis.label} />

      {/* Confianza */}
      <View style={styles.block}>
        <Text style={styles.metaLabel}>Confianza del modelo</Text>
        <ConfidenceBar confidence={analysis.confidence} />
        <Text style={[typography.body, styles.category]}>{analysis.confidenceCategory}</Text>
        {analysis.lowConfidenceHint ? (
          <Text style={[typography.caption, styles.hint]}>{analysis.lowConfidenceHint}</Text>
        ) : null}
      </View>

      {/* Nivel de riesgo */}
      <View style={styles.block}>
        <Text style={styles.metaLabel}>Nivel de riesgo</Text>
        <View style={styles.riskRow}>
          <MaterialCommunityIcons
            name={isDisease ? 'alert-circle' : 'check-circle-outline'}
            size={20}
            color={isDisease ? colors.warning : colors.success}
          />
          <Text style={[typography.body, styles.riskText]}>{analysis.riskLevel}</Text>
        </View>
      </View>

      {/* Recomendación corta */}
      <View style={styles.block}>
        <Text style={styles.metaLabel}>Diagnóstico y acción sugerida</Text>
        <Text style={[typography.body, styles.reco]}>{analysis.recommendation}</Text>
      </View>

      {/* Guía de tratamiento detallada (solo para enfermedades) */}
      {treatmentGuide ? <TreatmentCard guide={treatmentGuide} /> : null}

      {/* Aviso legal */}
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
