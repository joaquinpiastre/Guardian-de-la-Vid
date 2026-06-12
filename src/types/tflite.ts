import type { DiseaseLabel } from './diagnosis';

/**
 * Salida estándar del clasificador (simulado o TFLite).
 * Las probabilidades siguen el orden de `labels.txt` del entrenamiento
 * (0_sana, 1_mildiu, 2_oidio, 3_bacteriana), alineado con `CLASS_LABELS` en UI.
 */
export interface TflitePrediction {
  label: DiseaseLabel;
  /** Confianza de la clase ganadora en [0, 1] */
  confidence: number;
  /** Distribución completa (misma longitud y orden que las clases del modelo) */
  probabilities: number[];
  /** True si esta predicción viene del fallback simulado (sin modelo TFLite real). */
  isSimulated?: boolean;
}
