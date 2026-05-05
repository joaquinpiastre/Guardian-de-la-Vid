import type { TflitePrediction } from '../types/tflite';
import { TRAIN_FOLDER_NAMES, trainFolderNameToDiseaseLabel } from './trainLabels';

/**
 * Convierte el vector de probabilidades (softmax) del modelo en etiqueta UI y confianza.
 * Función pura: fácil de testear sin cargar TFLite ni imágenes.
 */
export function softmaxVectorToPrediction(probs: Float32Array | number[]): TflitePrediction {
  const arr = Array.from(probs);
  if (arr.length !== TRAIN_FOLDER_NAMES.length) {
    throw new Error(`Se esperaban ${TRAIN_FOLDER_NAMES.length} clases, recibido ${arr.length}`);
  }
  let bestIdx = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i]! > arr[bestIdx]!) {
      bestIdx = i;
    }
  }
  const folder = TRAIN_FOLDER_NAMES[bestIdx]!;
  const label = trainFolderNameToDiseaseLabel(folder);
  return {
    label,
    confidence: arr[bestIdx]!,
    probabilities: arr,
  };
}
