import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Servicio de preprocesado de imagen antes de inferencia con TensorFlow Lite.
 * Redimensiona a 224×224 (tamaño típico en redes convolucionales para visión)
 * y deja hooks para normalización estadística del tensor de entrada.
 */

export const MODEL_INPUT_SIZE = 224;

export interface ProcessedImageForModel {
  /** URI del JPEG redimensionado en disco (cache de la app) */
  processedUri: string;
  width: number;
  height: number;
  /**
   * Placeholder de estadísticas de normalización (media/desvío) para el tensor.
   * Con TFLite real se reemplazaría por valores calculados sobre píxeles RGB.
   */
  normalizationPreview: {
    meanRgbApprox: [number, number, number];
    note: string;
  };
}

/**
 * Redimensiona la imagen al tamaño de entrada del modelo y documenta la normalización esperada.
 */
export async function prepareImageForModel(localUri: string): Promise<ProcessedImageForModel> {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
  );

  return {
    processedUri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
    normalizationPreview: {
      meanRgbApprox: [0.485, 0.456, 0.406],
      note:
        'Valores ilustrativos tipo ImageNet; al integrar TFLite, calcular media/desvío reales o aplicar la normalización definida en el entrenamiento.',
    },
  };
}

/**
 * Simula la conversión a tensor plano NHWC — aquí solo documenta el contrato.
 * La implementación real usaría `tf.browser.fromPixels` o buffer nativo del intérprete TFLite.
 */
export function describeTensorLayout(): string {
  return `[1, ${MODEL_INPUT_SIZE}, ${MODEL_INPUT_SIZE}, 3] float32, valores en rango acorde al pipeline de entrenamiento`;
}
