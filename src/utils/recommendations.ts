import type { DiseaseLabel, RiskLevel } from '../types/diagnosis';

/**
 * Recomendaciones agronómicas básicas (nivel divulgación para pequeños viticultores).
 * En un trabajo real se amplían con bibliografía y calendario fenológico.
 */

const RECOMMENDATIONS: Record<DiseaseLabel, string> = {
  'Hoja sana':
    'No se observan signos evidentes de patología en la imagen analizada. Mantenga monitoreo visual periódico en cuadrillas cercanas.',
  'No es hoja de vid':
    'La imagen no muestra una hoja de vid reconocible (color y forma de follaje). Fotografíe una sola hoja centrada, con buena luz y sin objetos de fondo que confundan al sistema.',
  Mildiu:
    'Revise otras hojas y racimos; valore aplicación preventiva o curativa según programa fitosanitario autorizado y condiciones de humedad.',
  Oídio:
    'Favorezca la aireación del follaje; consulte tratamientos autorizados para oídio según estado del cultivo y etiquetas de producto.',
  'Podredumbre bacteriana':
    'Evite el riego por aspersión que moja el follaje; retire tejidos muy afectados si corresponde y consulte a un ingeniero agrónomo.',
};

const RISK_BY_LABEL: Record<DiseaseLabel, RiskLevel> = {
  'Hoja sana': 'Bajo',
  'No es hoja de vid': 'Bajo',
  Mildiu: 'Alto',
  Oídio: 'Moderado',
  'Podredumbre bacteriana': 'Alto',
};

export function getRecommendationForLabel(label: DiseaseLabel): string {
  return RECOMMENDATIONS[label];
}

export function getRiskLevelForLabel(label: DiseaseLabel): RiskLevel {
  return RISK_BY_LABEL[label];
}
