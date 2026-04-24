import type { ConfidenceCategory } from '../types/diagnosis';

/**
 * Reglas de interpretación de la confianza del modelo (especificación de la tesis).
 * Los umbrales se aplican sobre el porcentaje [0, 100].
 */

const THRESHOLD_HIGH = 85;
const THRESHOLD_MID = 65;

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
