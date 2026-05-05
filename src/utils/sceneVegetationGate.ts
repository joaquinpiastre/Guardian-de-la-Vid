import type { TflitePrediction } from '../types/tflite';

/**
 * Filtro de escena (sin reentrenar el modelo): el clasificador solo conoce clases de vid;
 * ante mesas, repasadores, etc. suele devolver “Hoja sana” con alta confianza.
 *
 * Se usa el índice de “exceso de verde” (ExG simplificado por píxel: max(0, 2G−R−B)) sobre la imagen 224².
 * Umbrales conservadores: afinar con fotos reales de tu finca si hace falta.
 */

/** Por debajo: casi no hay tonos de follaje (tela clara, madera, etc.) → no es hoja de vid */
export const MIN_VEGETATION_GLOBAL = 0.028;

/**
 * Si el modelo dice “sana” pero el verdor es moderado-bajo, suele ser objeto neutro
 * (el modelo fuerza una de las 4 clases).
 */
export const MIN_VEGETATION_FOR_HEALTHY_LEAF = 0.045;

/**
 * Ajusta la predicción cuando la imagen no parece contener hoja de vid.
 */
export function applySceneVegetationGate(prediction: TflitePrediction, avgExcessGreen: number): TflitePrediction {
  const tooLittleGreen = avgExcessGreen < MIN_VEGETATION_GLOBAL;
  const suspiciousHealthy =
    prediction.label === 'Hoja sana' && avgExcessGreen < MIN_VEGETATION_FOR_HEALTHY_LEAF;

  if (!tooLittleGreen && !suspiciousHealthy) {
    return prediction;
  }

  const confidence = Math.min(0.9, 0.62 + avgExcessGreen * 2.5);

  return {
    label: 'No es hoja de vid',
    confidence,
    probabilities: prediction.probabilities,
  };
}
