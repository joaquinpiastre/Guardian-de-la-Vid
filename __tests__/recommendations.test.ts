import { describe, expect, it } from '@jest/globals';

import { getRecommendationForLabel, getRiskLevelForLabel } from '../src/utils/recommendations';

describe('recommendations', () => {
  it('devuelve texto de recomendación por clase', () => {
    expect(getRecommendationForLabel('Hoja sana').length).toBeGreaterThan(20);
    expect(getRecommendationForLabel('Mildiu').toLowerCase()).toMatch(/mildiu|humedad|preventiv/);
  });

  it('asigna nivel de riesgo', () => {
    expect(getRiskLevelForLabel('Hoja sana')).toBe('Bajo');
    expect(getRiskLevelForLabel('Mildiu')).toBe('Alto');
    expect(getRiskLevelForLabel('Oídio')).toBe('Moderado');
    expect(getRiskLevelForLabel('Podredumbre bacteriana')).toBe('Alto');
  });
});
