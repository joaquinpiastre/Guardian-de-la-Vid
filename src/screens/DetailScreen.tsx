import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImagePreview } from '../components/ImagePreview';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { DiseaseBadge } from '../components/DiseaseBadge';
import { DISCLAIMER_ORIENTATIVE } from '../constants/strings';
import { colors, radii, spacing, typography } from '../constants/theme';
import type { DetailScreenProps } from '../navigation/types';
import { getDiagnosisById } from '../services/databaseService';
import type { Diagnosis } from '../types/diagnosis';
import { getConfidenceCategory } from '../utils/confidenceRules';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Detalle de un registro persistido: imagen, métricas y recomendación almacenada.
 */
export function DetailScreen({ route }: DetailScreenProps) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Diagnosis | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const d = await getDiagnosisById(id);
      if (!cancelled) {
        setRow(d);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
      </View>
    );
  }

  if (row === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="file-question-outline" size={48} color={colors.textMuted} />
          <Text style={[typography.body, styles.missing]}>No se encontró el diagnóstico.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const category = getConfidenceCategory(row.confidence);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Text style={[typography.caption, styles.date]}>{formatDate(row.createdAt)}</Text>
        <ImagePreview uri={row.imageUri} maxHeight={280} />
        <DiseaseBadge label={row.label} />
        <View style={styles.block}>
          <Text style={styles.meta}>Confianza</Text>
          <ConfidenceBar confidence={row.confidence} />
          <Text style={[typography.body, styles.category]}>{category}</Text>
        </View>
        <View style={styles.block}>
          <Text style={styles.meta}>Nivel de riesgo</Text>
          <Text style={[typography.subtitle, styles.risk]}>{row.riskLevel}</Text>
        </View>
        <View style={styles.block}>
          <Text style={styles.meta}>Recomendación</Text>
          <Text style={[typography.body, styles.reco]}>{row.recommendation}</Text>
        </View>
        <View style={styles.disclaimer}>
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color={colors.textMuted} />
          <Text style={[typography.caption, styles.disclaimerTxt]}>{DISCLAIMER_ORIENTATIVE}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  missing: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  date: {
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  block: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  category: {
    color: colors.text,
    marginTop: 4,
  },
  risk: {
    color: colors.primaryDark,
  },
  reco: {
    color: colors.text,
    lineHeight: 22,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerTxt: {
    flex: 1,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
