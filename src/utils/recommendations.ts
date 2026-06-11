import type { DiseaseLabel, RiskLevel } from '../types/diagnosis';

/**
 * Recomendaciones agronómicas para el viticultor.
 * Cada enfermedad incluye: descripción del patógeno, señales de alerta,
 * pasos de acción inmediata y medidas preventivas.
 */

// ─── Resumen corto (usado en DiagnosisCard como texto compacto) ───────────────

const RECOMMENDATION_SUMMARY: Record<DiseaseLabel, string> = {
  'Hoja sana':
    'No se observan signos de patología en la imagen analizada. Continúe con el monitoreo periódico del viñedo.',
  'No es hoja de vid':
    'La imagen no corresponde a una hoja de vid reconocible. Fotografíe una sola hoja centrada, con buena luz y sin objetos de fondo.',
  Mildiu:
    'Se detectaron indicios de mildiu (Plasmopara viticola). Revise todo el cuadro y aplique tratamiento preventivo o curativo según el estado del cultivo y las condiciones de humedad.',
  Oídio:
    'Se detectaron indicios de oídio (Erysiphe necator). Mejore la aireación del follaje y aplique tratamiento autorizado según la etapa fenológica.',
  'Podredumbre bacteriana':
    'Se detectaron indicios de podredumbre bacteriana. Evite mojar el follaje, retire tejidos muy afectados y consulte a un técnico agrónomo para definir el tratamiento.',
};

// ─── Pasos de tratamiento estructurados ──────────────────────────────────────

export interface TreatmentStep {
  step: number;
  action: string;
}

export interface TreatmentGuide {
  disease: string;
  pathogen: string;
  riskDescription: string;
  immediateActions: TreatmentStep[];
  recommendedProducts: string;
  prevention: string;
  urgency: 'Inmediata' | 'Urgente' | 'Preventiva';
}

const TREATMENT_GUIDES: Partial<Record<DiseaseLabel, TreatmentGuide>> = {
  Mildiu: {
    disease: 'Mildiu',
    pathogen: 'Plasmopara viticola',
    riskDescription:
      'Hongo oomiceto que produce manchas aceitosas en el haz y eflorescencias blancas en el envés. Se favorece con alta humedad (>85%) y temperaturas de 10–25 °C.',
    immediateActions: [
      { step: 1, action: 'Revisar visualmente todas las hojas del cuadro afectado, incluyendo el envés.' },
      { step: 2, action: 'Retirar y destruir las hojas con síntomas severos (no compostar).' },
      { step: 3, action: 'Aplicar fungicida sistémico (p. ej. metalaxil + mancozeb) o de contacto según programa fitosanitario.' },
      { step: 4, action: 'Repetir la aplicación a los 7–10 días si persisten condiciones húmedas.' },
      { step: 5, action: 'Registrar la fecha, producto y dosis aplicados para el historial del lote.' },
    ],
    recommendedProducts:
      'Fungicidas sistémicos: metalaxil, fosetil-Al, dimetomorph. Fungicidas de contacto: mancozeb, folpet, cobre. Consulte la etiqueta del producto y respetar plazos de seguridad.',
    prevention:
      'Podar para favorecer la aireación del follaje. Evitar el riego nocturno por aspersión. Monitorear semanalmente en épocas lluviosas (regla de las 3 × 10: más de 10 mm de lluvia acumulada, temperatura >10 °C y brotes de más de 10 cm).',
    urgency: 'Urgente',
  },

  Oídio: {
    disease: 'Oídio',
    pathogen: 'Erysiphe necator (sin. Uncinula necator)',
    riskDescription:
      'Hongo ascomiceto que produce un polvillo blanco-grisáceo en la superficie de hojas, brotes y racimos. Se favorece con temperaturas de 20–27 °C y humedad relativa del 40–80% (a diferencia del mildiu, no necesita lluvia).',
    immediateActions: [
      { step: 1, action: 'Inspeccionar hojas jóvenes, brotes y racimos en desarrollo para confirmar la extensión del ataque.' },
      { step: 2, action: 'Aplicar azufre mojable o fungicida específico para oídio (tebuconazol, penconazol, quinoxifeno).' },
      { step: 3, action: 'Despuntar brotes muy afectados para reducir la carga de inóculo.' },
      { step: 4, action: 'Mejorar la aireación con despampanado y gestión de la canopia.' },
      { step: 5, action: 'Repetir tratamiento cada 10–14 días durante el período de riesgo.' },
    ],
    recommendedProducts:
      'Azufre mojable (preventivo y curativo). Fungicidas IBS: tebuconazol, miclobutanil, penconazol. Quinoxi-fenilo: quinoxifeno. Evitar azufre con temperaturas > 35 °C (fitotoxicidad).',
    prevention:
      'Elegir variedades con menor susceptibilidad al oídio. Mantener canopia abierta con podas y despampanado. Iniciar tratamientos preventivos en brotación, antes de que aparezcan síntomas.',
    urgency: 'Urgente',
  },

  'Podredumbre bacteriana': {
    disease: 'Podredumbre bacteriana',
    pathogen: 'Xanthomonas campestris / Agrobacterium vitis (según sintomatología)',
    riskDescription:
      'Bacterias que penetran por heridas de poda, granizo o insectos. Producen manchas acuosas, necrosis de bordes y en casos severos cancros en el tronco. Se propagan con el agua de lluvia y el riego por aspersión.',
    immediateActions: [
      { step: 1, action: 'Desinfectar inmediatamente todas las herramientas de poda con solución de hipoclorito al 10% entre planta y planta.' },
      { step: 2, action: 'Retirar y quemar los tejidos con necrosis severa; nunca dejarlos en el suelo del viñedo.' },
      { step: 3, action: 'Pintar los cortes con pasta cicatrizante que contenga cobre o captan.' },
      { step: 4, action: 'Suspender el riego por aspersión que moje el follaje; preferir riego por goteo.' },
      { step: 5, action: 'Consultar a un ingeniero agrónomo para evaluar la aplicación de bactericidas cúpricos.' },
    ],
    recommendedProducts:
      'Caldo bordelés (sulfato de cobre + cal). Oxicloruro de cobre. Hidróxido de cobre. En casos graves, bactericidas autorizados según normativa local. Siempre verificar el período de carencia.',
    prevention:
      'Realizar la poda en tiempo seco para reducir el riesgo de infección. Evitar heridas innecesarias. Controlar insectos vectores (Cicadella). Desinfectar el material de poda entre parcelas.',
    urgency: 'Inmediata',
  },
};

// ─── Nivel de riesgo por etiqueta ─────────────────────────────────────────────

const RISK_BY_LABEL: Record<DiseaseLabel, RiskLevel> = {
  'Hoja sana': 'Bajo',
  'No es hoja de vid': 'Bajo',
  Mildiu: 'Alto',
  Oídio: 'Moderado',
  'Podredumbre bacteriana': 'Alto',
};

// ─── API pública ──────────────────────────────────────────────────────────────

/** Texto resumen de recomendación (una o dos oraciones) para mostrar en la tarjeta de resultado. */
export function getRecommendationForLabel(label: DiseaseLabel): string {
  return RECOMMENDATION_SUMMARY[label];
}

/** Nivel de riesgo agronómico simplificado. */
export function getRiskLevelForLabel(label: DiseaseLabel): RiskLevel {
  return RISK_BY_LABEL[label];
}

/**
 * Guía de tratamiento completa para enfermedades con patógeno identificado.
 * Retorna `null` para "Hoja sana" y "No es hoja de vid".
 */
export function getTreatmentGuide(label: DiseaseLabel): TreatmentGuide | null {
  return TREATMENT_GUIDES[label] ?? null;
}
