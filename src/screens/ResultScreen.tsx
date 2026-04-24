import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosisCard } from '../components/DiagnosisCard';
import { ImagePreview } from '../components/ImagePreview';
import { colors, radii, spacing, typography } from '../constants/theme';
import type { ResultScreenProps } from '../navigation/types';
import { runDiagnosisFromImageUri, type DiagnosisPipelineResult } from '../services/diagnosisService';
import { saveDiagnosis } from '../services/databaseService';

/**
 * Muestra la imagen original, ejecuta el pipeline de IA local y permite persistir el diagnóstico.
 */
export function ResultScreen({ navigation, route }: ResultScreenProps) {
  const { imageUri } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DiagnosisPipelineResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const result = await runDiagnosisFromImageUri(imageUri);
      setAnalysis(result);
    } catch (e) {
      setError('No se pudo completar el análisis. Verifique que la imagen sea válida e intente otra vez.');
    } finally {
      setLoading(false);
    }
  }, [imageUri]);

  useEffect(() => {
    void run();
  }, [run]);

  const onSave = async () => {
    if (!analysis) {
      return;
    }
    setSaving(true);
    try {
      await saveDiagnosis({
        imageUri,
        label: analysis.label,
        confidence: analysis.confidence,
        riskLevel: analysis.riskLevel,
        recommendation: analysis.recommendation,
      });
      setSaved(true);
      Alert.alert('Guardado', 'El diagnóstico se almacenó en el historial local.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el diagnóstico.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[typography.subtitle, styles.section]}>Imagen analizada</Text>
        <ImagePreview uri={imageUri} maxHeight={240} />

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primaryDark} />
            <Text style={[typography.body, styles.loaderText]}>Procesando imagen en el dispositivo…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={[typography.body, styles.errorText]}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={() => void run()}>
              <Text style={[typography.button, styles.retryLabel]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && analysis ? <DiagnosisCard analysis={analysis} /> : null}

        {!loading && !error && analysis ? (
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.bigBtn, styles.primary, (saved || saving) && styles.disabled]}
              onPress={() => void onSave()}
              disabled={saved || saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={[typography.button, styles.primaryTxt]}>
                  {saved ? 'Diagnóstico guardado' : 'Guardar diagnóstico'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bigBtn, styles.secondary]}
              onPress={() => navigation.navigate('Camera')}
            >
              <Text style={[typography.button, styles.secondaryTxt]}>Nuevo análisis</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  section: {
    color: colors.primaryDark,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loaderText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
  retry: {
    alignSelf: 'center',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryLabel: {
    color: colors.white,
  },
  buttons: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  bigBtn: {
    minHeight: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primary: {
    backgroundColor: colors.primaryDark,
  },
  primaryTxt: {
    color: colors.white,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  secondaryTxt: {
    color: colors.primaryDark,
  },
  disabled: {
    opacity: 0.65,
  },
});
