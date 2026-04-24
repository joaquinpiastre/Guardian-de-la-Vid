/**
 * Modelo de dominio del diagnóstico de hoja de vid.
 * Coincide con las columnas persistidas en SQLite (tabla `diagnoses`).
 */

/** Identificadores de clase que el modelo (simulado o TFLite) puede predecir */
export type DiseaseLabel =
  | 'Hoja sana'
  | 'Mildiu'
  | 'Oídio'
  | 'Podredumbre bacteriana';

/** Nivel de riesgo agronómico simplificado para el viticultor */
export type RiskLevel = 'Bajo' | 'Moderado' | 'Alto';

/**
 * Categoría textual según umbral de confianza (reglas de la tesis).
 * Se calcula a partir del porcentaje de confianza del modelo.
 */
export type ConfidenceCategory =
  | 'Diagnóstico confiable'
  | 'Diagnóstico probable'
  | 'Diagnóstico no concluyente';

/** Registro almacenado en la base de datos local */
export interface Diagnosis {
  id: string;
  imageUri: string;
  label: DiseaseLabel;
  /** Confianza principal del modelo en el rango [0, 1] */
  confidence: number;
  riskLevel: RiskLevel;
  recommendation: string;
  createdAt: string;
}

/**
 * Resultado enriquecido del pipeline de análisis (antes de guardar).
 * Incluye metadatos de UI y el vector de probabilidades para futuras extensiones.
 */
export interface DiagnosisAnalysisResult {
  label: DiseaseLabel;
  confidence: number;
  probabilities: number[];
  riskLevel: RiskLevel;
  recommendation: string;
  confidenceCategory: ConfidenceCategory;
  /** URI de la imagen redimensionada/normalizada usada como “input” del modelo */
  processedImageUri: string;
}
