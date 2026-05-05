import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ImagePreview } from './ImagePreview';
import { colors, radii, spacing, typography } from '../constants/theme';

export interface HeatmapViewerProps {
  /** Imagen original (misma URI que captura / galería) */
  originalUri: string;
  /** Resultado de `composeGradCamOverlay` o `generateHeatmap` */
  heatmapUri: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  /** Si es true, se muestra la tarjeta de explicación y la vista con heatmap */
  visible: boolean;
}

/**
 * Bloque de UI reutilizable: leyenda académica + comparación visual original / heatmap.
 * Mantiene el diseño alineado con el resto de la app (tarjetas claras, tipografía del theme).
 */
export function HeatmapViewer({
  originalUri,
  heatmapUri,
  isLoading,
  errorMessage,
  visible,
}: HeatmapViewerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={[typography.subtitle, styles.title]}>Explicabilidad (Grad-CAM)</Text>
      <Text style={[typography.body, styles.caption]}>
        El mapa de calor indica las zonas de la hoja que influyeron en el diagnóstico. Los tonos cálidos
        (amarillo–rojo) marcan mayor relevancia; los fríos (azul), menor atención del clasificador.
      </Text>

      <Text style={[typography.caption, styles.hint]}>
        Vista original (referencia)
      </Text>
      <ImagePreview uri={originalUri} maxHeight={200} />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primaryDark} />
          <Text style={[typography.caption, styles.muted]}>Generando mapa en el dispositivo…</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <Text style={[typography.body, styles.error]}>{errorMessage}</Text>
      ) : null}

      {!isLoading && heatmapUri ? (
        <>
          <Text style={[typography.caption, styles.hint]}>Imagen con mapa de calor superpuesto</Text>
          <ImagePreview uri={heatmapUri} maxHeight={200} />
        </>
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
});
