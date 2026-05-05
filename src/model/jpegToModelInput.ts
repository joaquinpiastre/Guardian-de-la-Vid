import { decode } from 'jpeg-js';
import { File } from 'expo-file-system';

import { MODEL_INPUT_SIZE } from '../services/imageProcessor';
import type { ImageQualityInfo } from '../types/diagnosis';

export interface JpegTensorAndVegetation {
  /** Tensor NHWC aplanado float32 RGB en [0, 1] */
  tensor: Float32Array;
  /**
   * Media del "exceso de verde" (2G − R − B, clamp ≥ 0) por píxel, escala ~[0, 0.6].
   * Valores muy bajos indican telas claras, madera u objetos sin follaje.
   */
  avgExcessGreen: number;
  /**
   * Métricas de calidad calculadas en el mismo recorrido de decodificación,
   * sin costo adicional de lectura de archivo.
   */
  quality: ImageQualityInfo;
}

// ── Umbrales de calidad ───────────────────────────────────────────────────────
/** Desviación estándar de luminancia por debajo de la cual la imagen se considera borrosa/plana. */
const BLUR_STD_THRESHOLD = 0.05;
/** Luminancia promedio por debajo de la cual se considera imagen oscura. */
const DARK_THRESHOLD = 0.12;
/** Luminancia promedio por encima de la cual se considera sobreexpuesta. */
const OVEREXPOSED_THRESHOLD = 0.88;

function buildQualityWarning(std: number, avg: number): string | null {
  if (avg < DARK_THRESHOLD) {
    return 'La imagen está muy oscura. Tome la foto con mejor iluminación para un diagnóstico más preciso.';
  }
  if (avg > OVEREXPOSED_THRESHOLD) {
    return 'La imagen está sobreexpuesta. Evite la luz directa al fotografiar la hoja.';
  }
  if (std < BLUR_STD_THRESHOLD) {
    return 'La imagen parece desenfocada o con poco contraste. Asegúrese de que la hoja esté bien enfocada.';
  }
  return null;
}

/**
 * Decodifica el JPEG 224×224 y computa en un solo recorrido:
 * - Tensor NHWC float32 RGB [0, 1] para el modelo TFLite.
 * - Índice de exceso de verde (filtro de escena).
 * - Métricas de calidad (nitidez, brillo, sobreexposición).
 */
export async function jpegUriToTensorAndVegetation(uri: string): Promise<JpegTensorAndVegetation> {
  const file = new File(uri);
  const b64 = await file.base64();
  const bytes = base64ToUint8Array(b64);
  const decoded = decode(bytes, { useTArray: true });
  if (!decoded) {
    throw new Error('No se pudo decodificar el JPEG para inferencia.');
  }
  const { width, height, data } = decoded;
  if (width !== MODEL_INPUT_SIZE || height !== MODEL_INPUT_SIZE) {
    throw new Error(`Se esperaba ${MODEL_INPUT_SIZE}×${MODEL_INPUT_SIZE}, obtuvo ${width}×${height}`);
  }

  const pixelCount = width * height;
  const out = new Float32Array(pixelCount * 3);

  // Acumuladores para un único recorrido
  let exgSum = 0;
  let lumSum = 0;
  let lumSumSq = 0;
  let o = 0;

  for (let i = 0; i < pixelCount * 4; i += 4) {
    const r = data[i]! / 255;
    const g = data[i + 1]! / 255;
    const b = data[i + 2]! / 255;

    // Exceso de verde (filtro escena)
    exgSum += Math.max(0, 2 * g - r - b);

    // Luminancia BT.601 para calidad
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumSum += lum;
    lumSumSq += lum * lum;

    // Tensor RGB
    out[o++] = r;
    out[o++] = g;
    out[o++] = b;
  }

  const avgExcessGreen = exgSum / pixelCount;
  const avgBrightness = lumSum / pixelCount;
  const lumVariance = lumSumSq / pixelCount - avgBrightness * avgBrightness;
  const sharpnessScore = Math.sqrt(Math.max(0, lumVariance));

  const quality: ImageQualityInfo = {
    isBlurry: sharpnessScore < BLUR_STD_THRESHOLD,
    isDark: avgBrightness < DARK_THRESHOLD,
    isOverexposed: avgBrightness > OVEREXPOSED_THRESHOLD,
    sharpnessScore,
    avgBrightness,
    warning: buildQualityWarning(sharpnessScore, avgBrightness),
  };

  return { tensor: out, avgExcessGreen, quality };
}

/**
 * Solo tensor (compatibilidad con inferencia que no necesita verdor ni calidad).
 */
export async function jpegUriToFloat32NHWC01(uri: string): Promise<Float32Array> {
  const { tensor } = await jpegUriToTensorAndVegetation(uri);
  return tensor;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binaryString = globalThis.atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
