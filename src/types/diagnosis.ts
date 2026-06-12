/**
 * Modelo de dominio del diagnóstico de hoja de vid.
 * Coincide con las columnas persistidas en SQLite (tabla `diagnoses`).
 */

/** Identificadores de clase que el modelo (simulado o TFLite) puede predecir */
export type DiseaseLabel =
  | 'Hoja sana'
  | 'Mildiu'
  | 'Oídio'
  | 'Podredumbre bacteriana'
  /** No sale del modelo: se aplica un filtro de escena (verdor) cuando la imagen no parece follaje de vid */
  | 'No es hoja de vid';

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

/**
 * Métricas de calidad de la imagen capturada, calculadas sobre el tensor 224×224
 * antes de la inferencia. Permite advertir al usuario sobre fotos problemáticas
 * sin bloquear el diagnóstico.
 */
export interface ImageQualityInfo {
  /** True si la imagen tiene bajo contraste de luminancia (posible desenfoque). */
  isBlurry: boolean;
  /** True si la luminancia promedio es muy baja (foto demasiado oscura). */
  isDark: boolean;
  /** True si la luminancia promedio es muy alta (sobreexpuesta / lavada). */
  isOverexposed: boolean;
  /** Desviación estándar de la luminancia en [0, 1]. Mayor = más nítida. */
  sharpnessScore: number;
  /** Luminancia promedio en [0, 1]. Referencia: 0.12–0.88 es rango aceptable. */
  avgBrightness: number;
  /** Mensaje de advertencia legible por el usuario, o null si la calidad es aceptable. */
  warning: string | null;
}

/** Estado de sincronización con la nube */
export type SyncStatus = 'local' | 'pending' | 'synced';

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
  /** UID de Firebase del usuario propietario; undefined si se guardó sin cuenta */
  userId?: string;
  /** Estado de sincronización con Firebase Storage + Firestore */
  syncStatus?: SyncStatus;
  /** ID del documento en Firestore una vez sincronizado */
  cloudId?: string;
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
  /** URI de la imagen redimensionada/normalizada usada como "input" del modelo */
  processedImageUri: string;
  /** Calidad de la imagen analizada; undefined si no se pudo calcular. */
  qualityInfo?: ImageQualityInfo;
  /** True si el resultado viene del fallback simulado (sin modelo TFLite real). */
  isSimulated?: boolean;
}
