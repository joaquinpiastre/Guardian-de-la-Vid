import type { ConfidenceCategory } from '../types/diagnosis';

/**
 * Reglas de interpretación de la confianza del modelo (especificación de la tesis).
 * Los umbrales se aplican sobre el porcentaje [0, 100].
 *
 * Calibrados para un modelo MobileNetV2 entrenado con label_smoothing=0.05:
 * - Con smoothing 0.05 y 4 clases la confianza máxima teórica es ~0.9625.
 * - HIGH ≥ 75 → diagnóstico confiable (softmax dominante claro).
 * - MID ≥ 55 → diagnóstico probable (clase lidera con diferencia visible).
 * - < 55 → no concluyente (distribución casi uniforme o imagen problemática).
 */
const THRESHOLD_HIGH = 75;
const THRESHOLD_MID = 55;

/**
 * Devuelve la etiqueta de fiabilidad según el porcentaje de confianza.
 * @param confidence01 Valor en [0, 1] tal como lo devuelve el clasificador
 */
export function getConfidenceCategory(confidence01: number): ConfidenceCategory {
  const pct = confidence01 * 100;
  if (pct >= THRESHOLD_HIGH) {
    return 'Diagnóstico confiable';
  }
  if (pct >= THRESHOLD_MID) {
    return 'Diagnóstico probable';
  }
  return 'Diagnóstico no concluyente';
}

/**
 * Mensaje complementario cuando la confianza es baja: guía de uso sin ser alarmista.
 */
export function getLowConfidenceHint(confidence01: number): string | null {
  const pct = confidence01 * 100;
  if (pct >= THRESHOLD_MID) {
    return null;
  }
  return 'Se sugiere repetir la foto con mejor iluminación y enfoque, mostrando una sola hoja.';
}
