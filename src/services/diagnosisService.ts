import type { DiagnosisAnalysisResult, DiseaseLabel } from '../types/diagnosis';
import { getConfidenceCategory, getLowConfidenceHint } from '../utils/confidenceRules';
import { getRecommendationForLabel, getRiskLevelForLabel } from '../utils/recommendations';
import { prepareImageForModel } from './imageProcessor';
import { runModelInference } from './tfliteService';

/**
 * Orquestación del pipeline: imagen → preprocesado → inferencia (simulada/TFLite) → resultado UI.
 * Centraliza reglas de negocio para que las pantallas solo presenten datos.
 */

export interface DiagnosisPipelineResult extends DiagnosisAnalysisResult {
  /** Texto extra si la confianza cae bajo 65 % */
  lowConfidenceHint: string | null;
}

function assertDiseaseLabel(label: string): asserts label is DiseaseLabel {
  const ok = ['Hoja sana', 'Mildiu', 'Oídio', 'Podredumbre bacteriana'].includes(label);
  if (!ok) {
    throw new Error(`Etiqueta de modelo no reconocida: ${label}`);
  }
}

/**
 * Ejecuta análisis completo offline a partir de la URI local de la captura.
 */
export async function runDiagnosisFromImageUri(imageUri: string): Promise<DiagnosisPipelineResult> {
  const processed = await prepareImageForModel(imageUri);
  const prediction = await runModelInference(processed.processedUri);

  assertDiseaseLabel(prediction.label);

  const riskLevel = getRiskLevelForLabel(prediction.label);
  const recommendation = getRecommendationForLabel(prediction.label);
  const confidenceCategory = getConfidenceCategory(prediction.confidence);
  const lowConfidenceHint = getLowConfidenceHint(prediction.confidence);

  return {
    label: prediction.label,
    confidence: prediction.confidence,
    probabilities: prediction.probabilities,
    riskLevel,
    recommendation,
    confidenceCategory,
    processedImageUri: processed.processedUri,
    lowConfidenceHint,
  };
}
