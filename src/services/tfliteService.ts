import type { DiseaseLabel } from '../types/diagnosis';

/**
 * Capa de inferencia con TensorFlow Lite.
 * ---------------------------------------------------------------------------
 * ESTADO ACTUAL (tesis / prototipo): simulación determinística-ligera mezclando
 * entropía acotada para demostrar el flujo UI → modelo → diagnóstico offline.
 *
 * INTEGRACIÓN FUTURA: reemplazar `simulatePrediction` por:
 *   - carga del archivo `.tflite` desde `expo-file-system` o assets
 *   - intérprete (`@tensorflow/tfjs` + backend nativo o `react-native-fast-tflite`)
 *   - alimentación con el tensor generado desde `imageProcessor.prepareImageForModel`
 * ---------------------------------------------------------------------------
 */

export const CLASS_LABELS: DiseaseLabel[] = [
  'Hoja sana',
  'Mildiu',
  'Oídio',
  'Podredumbre bacteriana',
];

export interface TflitePrediction {
  label: DiseaseLabel;
  /** Confianza de la clase ganadora en [0, 1] */
  confidence: number;
  /** Distribución completa alineada con `CLASS_LABELS` */
  probabilities: number[];
}

/**
 * Genera un vector de probabilidades sintético y devuelve la clase ganadora.
 * Mantiene la suma ≈ 1 para asemejar la salida softmax de una red neuronal.
 */
export async function simulatePrediction(_processedImageUri: string): Promise<TflitePrediction> {
  // Pequeña demora para simular costo de inferencia en dispositivo
  await new Promise((r) => setTimeout(r, 450));

  const raw = CLASS_LABELS.map(() => Math.random() * 0.85 + 0.05);
  const sum = raw.reduce((a, b) => a + b, 0);
  const probabilities = raw.map((v) => v / sum);

  let bestIdx = 0;
  probabilities.forEach((p, i) => {
    if (p > probabilities[bestIdx]) {
      bestIdx = i;
    }
  });

  const label = CLASS_LABELS[bestIdx];
  const confidence = probabilities[bestIdx];

  return {
    label,
    confidence,
    probabilities,
  };
}

/**
 * Punto de extensión: misma firma que usará la inferencia TFLite real.
 */
export async function runModelInference(processedImageUri: string): Promise<TflitePrediction> {
  return simulatePrediction(processedImageUri);
}
