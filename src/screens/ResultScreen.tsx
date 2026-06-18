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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

import { DiagnosisCard } from '../components/DiagnosisCard';
import { HeatmapViewer } from '../components/HeatmapViewer';
import { ImagePreview } from '../components/ImagePreview';
import { colors, radii, spacing, typography } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import type { ResultScreenProps } from '../navigation/types';
import {
  runDiagnosisFromImageUri,
  runEnsembleDiagnosis,
  type DiagnosisPipelineResult,
} from '../services/diagnosisService';
import { saveDiagnosis, markDiagnosisSynced } from '../services/databaseService';
import { uploadDiagnosis } from '../services/cloudService';
import { composeGradCamOverlay, type HeatmapStats } from '../services/gradcamService';
import { getCurrentWeatherSnapshot } from '../services/weatherService';
import type { WeatherInfo } from '../types/diagnosis';

/**
 * Muestra la imagen original, ejecuta el pipeline de IA local y permite persistir el diagnóstico.
 * Soporta análisis de imagen única y modo ensemble (varias imágenes promediadas).
 */
export function ResultScreen({ navigation, route }: ResultScreenProps) {
  const { imageUri, additionalUris } = route.params;
  const isEnsemble = Array.isArray(additionalUris) && additionalUris.length > 0;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DiagnosisPipelineResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  const [explainOpen, setExplainOpen] = useState(false);
  const [heatmapUri, setHeatmapUri] = useState<string | null>(null);
  const [heatmapStats, setHeatmapStats] = useState<HeatmapStats | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    setExplainOpen(false);
    setHeatmapUri(null);
    setHeatmapStats(null);
    setHeatmapError(null);
    setWeather(null);
    void getCurrentWeatherSnapshot().then(setWeather);
    try {
      const allUris = [imageUri, ...(additionalUris ?? [])];
      const result = isEnsemble
        ? await runEnsembleDiagnosis(allUris)
        : await runDiagnosisFromImageUri(imageUri);
      setAnalysis(result);
    } catch {
      setError(
        'No se pudo completar el análisis. Verifique que la imagen sea válida e intente otra vez.',
      );
    } finally {
      setLoading(false);
    }
  }, [imageUri, additionalUris, isEnsemble]);

  useEffect(() => {
    void run();
  }, [run]);

  const ensureHeatmap = useCallback(async () => {
    if (!analysis || heatmapUri) return;
    setHeatmapLoading(true);
    setHeatmapError(null);
    try {
      const result = await composeGradCamOverlay(imageUri, {
        label: analysis.label,
        confidence: analysis.confidence,
        probabilities: analysis.probabilities,
      });
      setHeatmapUri(result.uri);
      setHeatmapStats(result.stats);
    } catch (err) {
      console.error('[Heatmap] Error al generar mapa de calor:', err);
      setHeatmapError('No se pudo generar el mapa de calor. Intente de nuevo.');
    } finally {
      setHeatmapLoading(false);
    }
  }, [analysis, heatmapUri, imageUri]);

  const toggleExplain = () => {
    const next = !explainOpen;
    setExplainOpen(next);
    if (next) void ensureHeatmap();
  };

  const onSave = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      const netState = await NetInfo.fetch();
      const isOnline = !!(netState.isConnected && netState.isInternetReachable);

      // Si hay usuario y conexión: guardar local + intentar subir a la nube
      // Si hay usuario pero sin conexión: guardar local con syncStatus='pending'
      // Sin usuario: guardar solo local
      const syncStatus = user ? (isOnline ? 'pending' : 'pending') : 'local';

      const diagnosis = await saveDiagnosis({
        imageUri,
        label: analysis.label,
        confidence: analysis.confidence,
        riskLevel: analysis.riskLevel,
        recommendation: analysis.recommendation,
        userId: user?.uid,
        syncStatus,
        weather: weather ?? undefined,
      });

      if (user && isOnline) {
        try {
          await uploadDiagnosis(user.uid, diagnosis);
          await markDiagnosisSynced(diagnosis.id);
          setSaved(true);
          Alert.alert('Guardado en la nube', 'El diagnóstico se sincronizó correctamente.');
        } catch {
          // Upload falló pero el registro local ya está guardado como 'pending'
          setSaved(true);
          Alert.alert(
            'Guardado localmente',
            'No se pudo subir a la nube ahora. Se sincronizará automáticamente cuando recuperes conexión.',
          );
        }
      } else if (user) {
        setSaved(true);
        Alert.alert(
          'Guardado sin conexión',
          'Sin conexión a internet. El diagnóstico se guardó en el dispositivo y se sincronizará automáticamente cuando recuperes conexión.',
        );
      } else {
        setSaved(true);
        Alert.alert('Guardado', 'El diagnóstico se almacenó en el historial local.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar el diagnóstico.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Cabecera: imagen analizada */}
        <Text style={[typography.subtitle, styles.section]}>Imagen analizada</Text>
        <ImagePreview uri={imageUri} maxHeight={240} />

        {/* Badge de modo ensemble */}
        {isEnsemble ? (
          <View style={styles.ensembleBadge}>
            <MaterialCommunityIcons name="layers-triple" size={16} color={colors.primaryDark} />
            <Text style={[typography.caption, styles.ensembleBadgeText]}>
              Análisis múltiple — {(additionalUris?.length ?? 0) + 1} fotos promediadas
            </Text>
          </View>
        ) : null}

        <Text style={[typography.caption, styles.explainIntro]}>
          Tras el diagnóstico podés activar el mapa de calor: muestra qué zonas de la hoja
          influyeron en la decisión del modelo.
        </Text>

        {/* Estado: cargando */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primaryDark} />
            <Text style={[typography.body, styles.loaderText]}>
              {isEnsemble
                ? `Procesando ${(additionalUris?.length ?? 0) + 1} imágenes en el dispositivo…`
                : 'Procesando imagen en el dispositivo…'}
            </Text>
          </View>
        ) : null}

        {/* Estado: error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={[typography.body, styles.errorText]}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={() => void run()}>
              <Text style={[typography.button, styles.retryLabel]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Aviso: resultado simulado (sin modelo TFLite real) */}
        {!loading && !error && analysis?.isSimulated ? (
          <View style={styles.simulatedWarning}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.white} />
            <Text style={[typography.caption, styles.simulatedWarningText]}>
              [SIMULADO] Este resultado es ALEATORIO: no hay modelo TFLite real cargado.
              Compilá la app con `npx expo run:android` (o iOS) para un diagnóstico real.
            </Text>
          </View>
        ) : null}

        {/* Advertencia de calidad de imagen */}
        {!loading && !error && analysis?.qualityInfo?.warning ? (
          <View style={styles.qualityWarning}>
            <MaterialCommunityIcons name="alert-outline" size={18} color={colors.warning} />
            <Text style={[typography.caption, styles.qualityWarningText]}>
              {analysis.qualityInfo.warning}
            </Text>
          </View>
        ) : null}

        {/* Resultado principal */}
        {!loading && !error && analysis ? <DiagnosisCard analysis={analysis} /> : null}

        {/* Clima/ubicación capturados para el registro */}
        {!loading && !error && analysis && weather ? (
          <View style={styles.weatherBadge}>
            <MaterialCommunityIcons name="thermometer" size={16} color={colors.primaryDark} />
            <Text style={[typography.caption, styles.weatherBadgeText]}>
              {weather.temperatureC.toFixed(0)}°C · {weather.humidityPercent.toFixed(0)}% humedad ·{' '}
              {weather.conditionText} (se guarda junto al diagnóstico)
            </Text>
          </View>
        ) : null}

        {/* Explicación Grad-CAM */}
        {!loading && !error && analysis ? (
          <>
            <TouchableOpacity
              style={[styles.bigBtn, styles.explainBtn]}
              onPress={toggleExplain}
              accessibilityRole="button"
              accessibilityLabel={
                explainOpen ? 'Ocultar mapa de calor' : 'Ver mapa de calor'
              }
            >
              <MaterialCommunityIcons
                name={explainOpen ? 'eye-off-outline' : 'thermometer'}
                size={20}
                color={colors.primaryDark}
              />
              <Text style={[typography.button, styles.explainBtnTxt]}>
                {explainOpen ? 'Ocultar mapa de calor' : 'Ver mapa de calor'}
              </Text>
            </TouchableOpacity>
            <HeatmapViewer
              visible={explainOpen}
              originalUri={imageUri}
              heatmapUri={heatmapUri}
              isLoading={heatmapLoading}
              errorMessage={heatmapError}
              stats={heatmapStats}
              label={analysis?.label}
            />
          </>
        ) : null}

        {/* Acciones */}
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
  explainIntro: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  ensembleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ensembleBadgeText: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  simulatedWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  simulatedWarningText: {
    flex: 1,
    color: colors.white,
    lineHeight: 19,
    fontWeight: '600',
  },
  qualityWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  qualityWarningText: {
    flex: 1,
    color: '#92400E',
    lineHeight: 19,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  weatherBadgeText: {
    flex: 1,
    color: colors.primaryDark,
  },
  explainBtn: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: 8,
  },
  explainBtnTxt: {
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
