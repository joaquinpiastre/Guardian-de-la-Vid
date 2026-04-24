import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { colors, radii } from '../constants/theme';

interface ImagePreviewProps {
  uri: string;
  /** Alto máximo del contenedor (responsive) */
  maxHeight?: number;
}

/**
 * Vista previa con bordes redondeados y sombra suave para destacar la hoja analizada.
 */
export function ImagePreview({ uri, maxHeight = 260 }: ImagePreviewProps) {
  return (
    <View style={[styles.wrap, { maxHeight }]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" accessibilityLabel="Vista previa de la hoja" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
