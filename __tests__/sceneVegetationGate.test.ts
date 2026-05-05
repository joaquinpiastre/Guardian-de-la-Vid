import { describe, expect, it } from '@jest/globals';

import type { TflitePrediction } from '../src/types/tflite';
import {
  applySceneVegetationGate,
  MIN_VEGETATION_FOR_HEALTHY_LEAF,
  MIN_VEGETATION_GLOBAL,
} from '../src/utils/sceneVegetationGate';

const basePred = (label: TflitePrediction['label']): TflitePrediction => ({
  label,
  confidence: 0.9,
  probabilities: [0.9, 0.03, 0.04, 0.03],
});

describe('applySceneVegetationGate', () => {
  it('rechaza escenas con muy poco verdor aunque el modelo diga cualquier clase', () => {
    const p = basePred('Mildiu');
    const r = applySceneVegetationGate(p, MIN_VEGETATION_GLOBAL * 0.5);
    expect(r.label).toBe('No es hoja de vid');
  });

  it('rechaza “Hoja sana” con verdor moderado-bajo (falso positivo típico en objetos)', () => {
    const p = basePred('Hoja sana');
    const r = applySceneVegetationGate(p, MIN_VEGETATION_FOR_HEALTHY_LEAF * 0.85);
    expect(r.label).toBe('No es hoja de vid');
  });

  it('no modifica una hoja sana con suficiente verdor', () => {
    const p = basePred('Hoja sana');
    const r = applySceneVegetationGate(p, 0.12);
    expect(r.label).toBe('Hoja sana');
  });

  it('no modifica mildiu con verdor bajo pero por encima del umbral global', () => {
    const p = basePred('Mildiu');
    const r = applySceneVegetationGate(p, 0.04);
    expect(r.label).toBe('Mildiu');
  });
});
