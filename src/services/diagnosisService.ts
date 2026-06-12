import type { DiagnosisAnalysisResult, DiseaseLabel, ImageQualityInfo } from '../types/diagnosis';
import { jpegUriToTensorAndVegetation } from '../model/jpegToModelInput';
import { getConfidenceCategory, getLowConfidenceHint } from '../utils/confidenceRules';
import { getRecommendationForLabel, getRiskLevelForLabel } from '../utils/recommendations';
import { applySceneVegetationGate } from '../utils/sceneVegetationGate';
import { prepareImageForModel } from './imageProcessor';
import { runModelInferenceFromTensor } from './tfliteService';
import type { TflitePrediction } from '../types/tflite';

/**
 * Pipeline de diagnóstico offline:
 * imagen → preprocesado → calidad → inferencia TFLite → filtro escena → resultado UI.
 *
 * Centraliza toda la lógica de negocio para que las pantallas solo presenten datos.
 * Soporta análisis de imagen única y ensemble de múltiples imágenes (promedio de probabilidades).
 */

export interface DiagnosisPipelineResult extends DiagnosisAnalysisResult {
  /** Texto extra si la confianza cae bajo el umbral "probable". */
  lowConfidenceHint: string | null;
  /** True cuando el resultado es promedio de varias imágenes. */
  isEnsemble: boolean;
  /** Cantidad de imágenes analizadas (1 para análisis simple). */
  imageCount: number;
}

const ALL_UI_LABELS: DiseaseLabel[] = [
  'Hoja sana',
  'Mildiu',
  'Oídio',
  'Podredumbre bacteriana',
  'No es hoja de vid',
];

function assertDiseaseLabel(label: string): asserts label is DiseaseLabel {
  if (!ALL_UI_LABELS.includes(label as DiseaseLabel)) {
    throw new Error(`Etiqueta de diagnóstico no reconocida: "${label}"`);
  }
}

/** Resultado intermedio de procesar una sola imagen (antes de agregar). */
interface SingleImageAnalysis {
  modelOut: TflitePrediction;
  avgExcessGreen: number;
  quality: ImageQualityInfo;
  processedUri: string;
}

/** Analiza una imagen y devuelve los componentes crudos para ensamblar o retornar directamente. */
async function analyzeSingleImage(imageUri: string): Promise<SingleImageAnalysis> {
  const processed = await prepareImageForModel(imageUri);
  const { tensor, avgExcessGreen, quality } = await jpegUriToTensorAndVegetation(
    processed.processedUri,
  );
  const modelOut = await runModelInferenceFromTensor(tensor, processed.processedUri);
  return { modelOut, avgExcessGreen, quality, processedUri: processed.processedUri };
}

/** Construye el resultado final a partir de una predicción gateada y metadatos. */
function buildPipelineResult(
  gated: TflitePrediction,
  quality: ImageQualityInfo | undefined,
  processedImageUri: string,
  isEnsemble: boolean,
  imageCount: number,
): DiagnosisPipelineResult {
  assertDiseaseLabel(gated.label);

  const riskLevel = getRiskLevelForLabel(gated.label);
  const recommendation = getRecommendationForLabel(gated.label);
  const confidenceCategory = getConfidenceCategory(gated.confidence);
  const lowConfidenceHint = getLowConfidenceHint(gated.confidence);

  return {
    label: gated.label,
    confidence: gated.confidence,
    probabilities: gated.probabilities,
    riskLevel,
    recommendation,
    confidenceCategory,
    processedImageUri,
    qualityInfo: quality,
    lowConfidenceHint,
    isEnsemble,
    imageCount,
    isSimulated: gated.isSimulated,
  };
}

/**
 * Analiza una sola imagen de forma offline.
 * Es el modo estándar de uso al capturar o seleccionar una foto.
 */
export async function runDiagnosisFromImageUri(imageUri: string): Promise<DiagnosisPipelineResult> {
  const single = await analyzeSingleImage(imageUri);
  assertDiseaseLabel(single.modelOut.label);

  const gated = applySceneVegetationGate(single.modelOut, single.avgExcessGreen);
  return buildPipelineResult(gated, single.quality, single.processedUri, false, 1);
}

/**
 * Análisis ensemble: promedia los vectores de probabilidad de múltiples imágenes
 * y aplica el filtro de escena sobre el resultado promediado.
 *
 * Mayor robustez que el análisis de imagen única: reduce variabilidad por ángulo,
 * iluminación y zoom. Se recomienda con 2–3 fotos de la misma hoja.
 */
export async function runEnsembleDiagnosis(
  imageUris: string[],
): Promise<DiagnosisPipelineResult> {
  if (imageUris.length === 0) {
    throw new Error('Se necesita al menos una imagen para el diagnóstico.');
  }
  if (imageUris.length === 1) {
    return runDiagnosisFromImageUri(imageUris[0]!);
  }

  // Analizar todas las imágenes en paralelo
  const analyses = await Promise.all(imageUris.map(analyzeSingleImage));

  const numClasses = analyses[0]!.modelOut.probabilities.length;

  // Promediar vectores de probabilidad (antes del gating)
  const avgProbs = Array.from({ length: numClasses }, (_, ci) =>
    analyses.reduce((sum, a) => sum + (a.modelOut.probabilities[ci] ?? 0), 0) / analyses.length,
  );

  let bestIdx = 0;
  avgProbs.forEach((p, i) => {
    if (p > avgProbs[bestIdx]!) bestIdx = i;
  });

  const MODEL_LABELS: DiseaseLabel[] = [
    'Hoja sana',
    'Mildiu',
    'Oídio',
    'Podredumbre bacteriana',
  ];
  const avgPrediction: TflitePrediction = {
    label: MODEL_LABELS[bestIdx] ?? 'Hoja sana',
    confidence: avgProbs[bestIdx]!,
    probabilities: avgProbs,
    isSimulated: analyses.some((a) => a.modelOut.isSimulated),
  };

  // Gating con la media del índice de verdor
  const meanExcessGreen =
    analyses.reduce((s, a) => s + a.avgExcessGreen, 0) / analyses.length;
  const gated = applySceneVegetationGate(avgPrediction, meanExcessGreen);

  // Calidad: usar la peor imagen como referencia (advertir si al menos una es mala)
  const worstQuality = selectWorstQuality(analyses.map((a) => a.quality));

  return buildPipelineResult(
    gated,
    worstQuality,
    analyses[0]!.processedUri,
    true,
    analyses.length,
  );
}

/**
 * De la lista de métricas de calidad, retorna la que tiene mayor prioridad de advertencia.
 * Orden: oscura > sobreexpuesta > borrosa > sin problemas.
 */
function selectWorstQuality(qualities: ImageQualityInfo[]): ImageQualityInfo {
  const withWarning = qualities.filter((q) => q.warning !== null);
  if (withWarning.length === 0) return qualities[0]!;

  const dark = withWarning.find((q) => q.isDark);
  if (dark) return dark;

  const over = withWarning.find((q) => q.isOverexposed);
  if (over) return over;

  return withWarning[0]!;
}
