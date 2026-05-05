import { describe, expect, it } from '@jest/globals';

import { getConfidenceCategory, getLowConfidenceHint } from '../src/utils/confidenceRules';

describe('confidenceRules', () => {
  it('>= 85% → Diagnóstico confiable', () => {
    expect(getConfidenceCategory(0.85)).toBe('Diagnóstico confiable');
    expect(getConfidenceCategory(0.99)).toBe('Diagnóstico confiable');
  });

  it('65%–84% → Diagnóstico probable', () => {
    expect(getConfidenceCategory(0.65)).toBe('Diagnóstico probable');
    expect(getConfidenceCategory(0.84)).toBe('Diagnóstico probable');
  });

  it('< 65% → Diagnóstico no concluyente y sugiere repetir foto', () => {
    expect(getConfidenceCategory(0.64)).toBe('Diagnóstico no concluyente');
    expect(getLowConfidenceHint(0.64)).toBeTruthy();
    expect(getLowConfidenceHint(0.7)).toBeNull();
  });
});
