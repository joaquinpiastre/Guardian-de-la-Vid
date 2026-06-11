import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ImagePreview } from './ImagePreview';
import { colors, radii, spacing, typography } from '../constants/theme';
import type { HeatmapStats } from '../services/gradcamService';
import type { DiseaseLabel } from '../types/diagnosis';

export interface HeatmapViewerProps {
  /** Imagen original (misma URI que captura / galería) */
  originalUri: string;
  /** Resultado de `composeGradCamOverlay` o `generateHeatmap` */
  heatmapUri: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  /** Si es true, se muestra la tarjeta de explicación y la vista con heatmap */
  visible: boolean;
  /** Estadísticas cuantitativas del mapa de calor */
  stats?: HeatmapStats | null;
  /** Etiqueta de enfermedad para mostrar interpretación específica */
  label?: DiseaseLabel | string | null;
}

// ─── Interpretaciones por enfermedad ─────────────────────────────────────────

const DISEASE_INTERPRETATION: Record<string, string> = {
  Mildiu:
    'El modelo detectó múltiples focos de activación distribuidos, coherentes con el patrón de manchas aceitosas del mildiu (Plasmopara viticola). Las zonas rojas/naranja señalan regiones con mayor concentración de síntomas foliares.',
  Oídio:
    'La activación amplia y difusa es característica del oídio (Erysiphe necator): el hongo genera un polvillo blanco que cubre uniformemente la lámina foliar. Las zonas amarillas/naranja indican alta concentración del patógeno.',
  'Podredumbre bacteriana':
    'El modelo focalizó su atención en focos compactos de alta intensidad, patrón asociado a lesiones necróticas bacterianas. Las zonas rojas señalan manchas oscuras de tejido muerto donde se concentran los síntomas.',
  'Hoja sana':
    'La activación es difusa y de baja intensidad, sin focos patológicos claros. Este patrón respalda el diagnóstico de hoja sin enfermedad detectable.',
  'No es hoja de vid':
    'El modelo no identificó estructuras foliares de vid. Se sugiere fotografiar una sola hoja centrada con buena iluminación y sin fondos que interfieran.',
};

const DEFAULT_INTERPRETATION =
  'El mapa muestra las regiones que mayor peso tuvieron en la decisión del clasificador.';

// ─── Escala de colores (muestreada del colormap jet-like) ─────────────────────

const COLOR_STOPS: Array<{ color: string; label: string }> = [
  { color: 'rgb(30,60,200)', label: '0%' },
  { color: 'rgb(30,200,170)', label: '25%' },
  { color: 'rgb(255,220,40)', label: '50%' },
  { color: 'rgb(237,135,40)', label: '75%' },
  { color: 'rgb(220,50,40)', label: '100%' },
];

function ColorScaleLegend() {
  return (
    <View style={legendStyles.container}>
      <Text style={[typography.caption, legendStyles.sideLabel]}>Baja atención</Text>
      <View style={legendStyles.scaleRow}>
        {COLOR_STOPS.map((stop, idx) => (
          <View key={idx} style={legendStyles.stopWrapper}>
            <View style={[legendStyles.swatch, { backgroundColor: stop.color }]} />
            <Text style={legendStyles.stopLabel}>{stop.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[typography.caption, legendStyles.sideLabel]}>Alta atención</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F9FAFB',
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scaleRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 2,
  },
  stopWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  swatch: {
    width: '100%',
    height: 14,
    borderRadius: 3,
  },
  stopLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  sideLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 48,
    lineHeight: 13,
  },
});

// ─── Panel estadístico ────────────────────────────────────────────────────────

function getPeakQuadrant(peakX: number, peakY: number): string {
  const h = peakY < 0.5 ? 'Superior' : 'Inferior';
  const v = peakX < 0.5 ? 'Izquierda' : 'Derecha';
  return `${h}-${v}`;
}

function AreaBar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <View style={statsStyles.areaRow}>
      <Text style={statsStyles.areaLabel}>{label}</Text>
      <View style={statsStyles.barTrack}>
        <View style={[statsStyles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={statsStyles.areaPct}>{pct.toFixed(1)}%</Text>
    </View>
  );
}

function StatsPanelContent({ stats }: { stats: HeatmapStats }) {
  const focusIndex = Math.round(stats.meanSaliency * 100);
  const quadrant = getPeakQuadrant(stats.peakX, stats.peakY);

  return (
    <View style={statsStyles.container}>
      <Text style={statsStyles.panelTitle}>Análisis estadístico del mapa</Text>

      {/* Distribución de áreas */}
      <View style={statsStyles.section}>
        <Text style={statsStyles.sectionTitle}>Distribución de activación</Text>
        <AreaBar pct={stats.hotAreaPct} color="rgb(220,50,40)" label="Alta  (>70%)" />
        <AreaBar pct={stats.warmAreaPct} color="rgb(237,135,40)" label="Media (40–70%)" />
        <AreaBar pct={stats.coldAreaPct} color="rgb(30,60,200)" label="Baja  (<40%)" />
      </View>

      {/* Métricas de foco */}
      <View style={statsStyles.section}>
        <Text style={statsStyles.sectionTitle}>Métricas de atención</Text>
        <View style={statsStyles.metricsGrid}>
          <View style={statsStyles.metricCell}>
            <Text style={statsStyles.metricValue}>{focusIndex}%</Text>
            <Text style={statsStyles.metricKey}>Índice de foco</Text>
          </View>
          <View style={statsStyles.metricCell}>
            <Text style={statsStyles.metricValue}>{(stats.maxSaliency * 100).toFixed(0)}%</Text>
            <Text style={statsStyles.metricKey}>Activación máx.</Text>
          </View>
          <View style={statsStyles.metricCell}>
            <Text style={statsStyles.metricValue}>{quadrant}</Text>
            <Text style={statsStyles.metricKey}>Foco principal</Text>
          </View>
          <View style={statsStyles.metricCell}>
            <Text style={statsStyles.metricValue}>
              ({(stats.peakX * 100).toFixed(0)}%, {(stats.peakY * 100).toFixed(0)}%)
            </Text>
            <Text style={statsStyles.metricKey}>Coord. pico (X, Y)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const statsStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: spacing.sm,
  },
  panelTitle: {
    ...typography.subtitle,
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    fontSize: 11,
    marginBottom: 2,
  },
  areaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: spacing.sm,
  },
  areaLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text,
    width: 88,
    fontVariant: ['tabular-nums'] as const,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: '100%' as const,
    borderRadius: 5,
  },
  areaPct: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text,
    width: 36,
    textAlign: 'right' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  metricsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  metricCell: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '45%' as const,
    flex: 1,
    alignItems: 'center' as const,
  },
  metricValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.primaryDark,
    textAlign: 'center' as const,
  },
  metricKey: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 2,
  },
});

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * Bloque de UI reutilizable: leyenda académica + estadísticas cuantitativas +
 * comparación visual original / heatmap + interpretación por enfermedad.
 */
export function HeatmapViewer({
  originalUri,
  heatmapUri,
  isLoading,
  errorMessage,
  visible,
  stats,
  label,
}: HeatmapViewerProps) {
  if (!visible) {
    return null;
  }

  const interpretation =
    (label ? DISEASE_INTERPRETATION[label] : null) ?? DEFAULT_INTERPRETATION;

  return (
    <View style={styles.card}>
      {/* Título */}
      <Text style={[typography.subtitle, styles.title]}>Explicabilidad — Grad-CAM</Text>

      {/* Descripción del método */}
      <Text style={[typography.body, styles.caption]}>
        El mapa de calor indica las regiones de la hoja que más influyeron en el diagnóstico.
        Los tonos cálidos (amarillo–rojo) marcan mayor relevancia; los fríos (azul), menor atención del clasificador.
      </Text>

      {/* Leyenda de escala de colores */}
      <ColorScaleLegend />

      {/* Imagen original */}
      <Text style={[typography.caption, styles.hint]}>Imagen original (referencia)</Text>
      <ImagePreview uri={originalUri} maxHeight={200} />

      {/* Estado: generando */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primaryDark} />
          <Text style={[typography.caption, styles.muted]}>Generando mapa de calor en el dispositivo…</Text>
        </View>
      ) : null}

      {/* Estado: error */}
      {errorMessage ? (
        <Text style={[typography.body, styles.error]}>{errorMessage}</Text>
      ) : null}

      {/* Imagen con heatmap */}
      {!isLoading && heatmapUri ? (
        <>
          <Text style={[typography.caption, styles.hint]}>Imagen con mapa de calor superpuesto</Text>
          <ImagePreview uri={heatmapUri} maxHeight={200} />
        </>
      ) : null}

      {/* Panel estadístico */}
      {!isLoading && stats ? <StatsPanelContent stats={stats} /> : null}

      {/* Interpretación por enfermedad */}
      {!isLoading && heatmapUri ? (
        <View style={styles.interpretBox}>
          <Text style={styles.interpretTitle}>Interpretación del modelo</Text>
          <Text style={[typography.body, styles.interpretText]}>{interpretation}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  title: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  caption: {
    color: colors.text,
    lineHeight: 22,
  },
  hint: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  muted: {
    color: colors.textMuted,
  },
  loader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  error: {
    color: colors.danger,
  },
  interpretBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  interpretTitle: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  interpretText: {
    color: '#78350F',
    lineHeight: 22,
    fontSize: 14,
  },
});
