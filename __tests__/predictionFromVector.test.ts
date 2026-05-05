import { describe, expect, it } from '@jest/globals';

import { softmaxVectorToPrediction } from '../src/model/predictionFromVector';

describe('softmaxVectorToPrediction', () => {
  it('elige la clase de mayor probabilidad y mapea a etiqueta en español', () => {
    const probs = new Float32Array([0.05, 0.85, 0.05, 0.05]);
    const r = softmaxVectorToPrediction(probs);
    expect(r.label).toBe('Mildiu');
    expect(r.confidence).toBeCloseTo(0.85, 5);
    const expected = [0.05, 0.85, 0.05, 0.05];
    expect(r.probabilities).toHaveLength(4);
    r.probabilities.forEach((p, i) => expect(p).toBeCloseTo(expected[i]!, 5));
  });

  it('lanza si la dimensión no coincide con las 4 clases', () => {
    expect(() => softmaxVectorToPrediction(new Float32Array([0.5, 0.5]))).toThrow();
  });
});
