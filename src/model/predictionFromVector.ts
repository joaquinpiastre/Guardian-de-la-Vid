import type { TflitePrediction } from '../types/tflite';
import { TRAIN_FOLDER_NAMES, trainFolderNameToDiseaseLabel } from './trainLabels';

/**
 * Temperature scaling: sharpea la distribución de probabilidades.
 *
 * El modelo fue entrenado con label_smoothing=0.10, lo que lo hace sistemáticamente
 * conservador (softmax "aplastado"). T < 1 compensa eso: reconcentra la masa de
 * probabilidad hacia la clase dominante sin cambiar cuál clase gana.
 *
 * T=0.50 → un 50% de confianza raw se convierte en ~70%; un 40% en ~56%.
 * Ajustar T entre 0.4–0.7 según el modelo entrenado.
 */
const TEMPERATURE = 0.5;

function applyTemperatureScaling(probs: number[]): number[] {
  // log(p) / T → re-softmax
  const logits = probs.map((p) => Math.log(Math.max(p, 1e-10)) / TEMPERATURE);
  const maxLogit = Math.max(...logits);
  const expValues = logits.map((l) => Math.exp(l - maxLogit)); // resta max para estabilidad numérica
  const sum = expValues.reduce((a, b) => a + b, 0);
  return expValues.map((e) => e / sum);
}

/**
 * Convierte el vector de probabilidades (softmax) del modelo en etiqueta UI y confianza.
 * Aplica temperature scaling para corregir la subestimación de confianza por label smoothing.
 * Función pura: fácil de testear sin cargar TFLite ni imágenes.
 */
export function softmaxVectorToPrediction(probs: Float32Array | number[]): TflitePrediction {
  const raw = Array.from(probs);
  if (raw.length !== TRAIN_FOLDER_NAMES.length) {
    throw new Error(`Se esperaban ${TRAIN_FOLDER_NAMES.length} clases, recibido ${raw.length}`);
  }

  const calibrated = applyTemperatureScaling(raw);

  let bestIdx = 0;
  for (let i = 1; i < calibrated.length; i++) {
    if (calibrated[i]! > calibrated[bestIdx]!) bestIdx = i;
  }

  const folder = TRAIN_FOLDER_NAMES[bestIdx]!;
  const label = trainFolderNameToDiseaseLabel(folder);
  return {
    label,
    confidence: calibrated[bestIdx]!,
    probabilities: calibrated,
  };
}
