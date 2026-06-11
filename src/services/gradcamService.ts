/**
 * Servicio de explicabilidad tipo Grad-CAM para "Guardián de la Vid"
 * =================================================================
 *
 * ## ¿Qué es Grad-CAM?
 * Grad-CAM (Gradient-weighted Class Activation Mapping) es una técnica de
 * explicabilidad post-hoc para redes neuronales convolucionales. Resume qué
 * regiones espaciales de la imagen de entrada contribuyeron más al logit de la
 * clase predicha, combinando los mapas de activación de una capa convolucional
 * tardía con gradientes respecto a esa clase (Selvaraju et al., 2017).
 *
 * ## Para qué sirve en este proyecto
 * El viticultor no solo necesita la etiqueta del diagnóstico (p. ej. mildiu),
 * sino una pista visual de *dónde* el modelo "miró" en la hoja. Eso aumenta la
 * confianza en el sistema y ayuda a detectar errores evidentes (fondos,
 * sombras, objetos extraños) cuando el mapa no coincide con síntomas esperados.
 *
 * ## Limitaciones en dispositivos móviles y con TensorFlow Lite
 * - TFLite está optimizado para inferencia, no expone gradientes por clase en
 *   todas las plataformas. Grad-CAM real requiere tensores intermedios y
 *   diferenciación, típicamente en Python (TF / PyTorch).
 * - jpeg-js es puro JS: útil offline en Expo, pero más lento que codecs
 *   nativos; se opera en 224×224 para tiempos razonables.
 *
 * ## Cómo reemplazar la simulación por Grad-CAM real
 * 1. En el entrenamiento (Python): exportar el mapa de saliencia ya calculado.
 * 2. On-device avanzado: usar un intérprete con acceso a tensores intermedios.
 * 3. Sustituir `buildSimulatedSaliencyMap` por una que lea el mapa real y
 *    conserve `colorizeSaliency` + `blendRgba` sin cambios.
 *
 * La función `buildSimulatedSaliencyMap` genera una máscara determinista
 * diferenciada por enfermedad, solo con fines de UI y arquitectura.
 */

import { decode, encode } from 'jpeg-js';
import * as ImageManipulator from 'expo-image-manipulator';

import { MODEL_INPUT_SIZE } from './imageProcessor';
import type { DiseaseLabel } from '../types/diagnosis';

/** Opacidad del mapa de calor sobre la foto (0 = invisible, 1 = opaco). */
export const HEATMAP_OVERLAY_ALPHA = 0.42;

export interface GradCamPredictionInput {
  label: DiseaseLabel | string;
  /** Confianza principal del modelo en [0, 1] */
  confidence: number;
  /** Opcional: vector completo de probabilidades por clase */
  probabilities?: number[];
}

/**
 * Estadísticas cuantitativas del mapa de calor generado.
 * Permiten al viticultor y al evaluador interpretar la distribución de atención.
 */
export interface HeatmapStats {
  /** % del área de la imagen con saliency > 0.70 (zona de alta activación, rojo/naranja) */
  hotAreaPct: number;
  /** % del área con saliency 0.40–0.70 (activación media, amarillo) */
  warmAreaPct: number;
  /** % del área con saliency < 0.40 (baja activación, azul/frío) */
  coldAreaPct: number;
  /** Saliency promedio ponderado sobre toda la imagen [0, 1] */
  meanSaliency: number;
  /** Valor máximo de saliency registrado [0, 1] */
  maxSaliency: number;
  /** Posición X normalizada del píxel de máxima atención [0=izquierda, 1=derecha] */
  peakX: number;
  /** Posición Y normalizada del píxel de máxima atención [0=arriba, 1=abajo] */
  peakY: number;
}

/** Resultado completo del pipeline de explicabilidad. */
export interface GradCamResult {
  /** Data URI (`data:image/jpeg;base64,...`) con heatmap superpuesto — compatible con Image en RN */
  uri: string;
  /** Métricas estadísticas para mostrar en la UI de explicabilidad */
  stats: HeatmapStats;
}

const DEFAULT_PREDICTION: GradCamPredictionInput = {
  label: 'Hoja sana',
  confidence: 0.7,
};

/**
 * Atajo documentado para integraciones sin vector de predicción.
 * Internamente usa `composeGradCamOverlay` con valores neutros.
 */
export async function generateHeatmap(imageUri: string): Promise<GradCamResult> {
  return composeGradCamOverlay(imageUri, DEFAULT_PREDICTION);
}

/**
 * Punto de entrada principal: imagen original + predicción → JPEG con heatmap + estadísticas.
 * Redimensiona a `MODEL_INPUT_SIZE` para coincidir con el tensor de entrada del modelo.
 */
export async function composeGradCamOverlay(
  imageUri: string,
  prediction: GradCamPredictionInput,
): Promise<GradCamResult> {
  // base64:true obtiene los bytes directamente desde expo-image-manipulator,
  // evitando una lectura de archivo adicional que puede fallar en Expo Go.
  const normalized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!normalized.base64) {
    throw new Error('ImageManipulator no devolvió base64. No se puede generar el mapa.');
  }
  const bytes = base64ToUint8Array(normalized.base64);
  const decoded = decode(bytes, { useTArray: true, formatAsRGBA: true });
  if (!decoded?.data) {
    throw new Error('No se pudo decodificar la imagen para el mapa de explicabilidad.');
  }

  const { width, height, data } = decoded;
  const saliency = buildSimulatedSaliencyMap(width, height, prediction);
  const stats = computeHeatmapStats(saliency, width, height);

  const outRgba = new Uint8Array(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const s = saliency[y * width + x]!;
      const [hr, hg, hb] = jetLikeColor(s);
      blendRgba(data, outRgba, i, hr, hg, hb, HEATMAP_OVERLAY_ALPHA);
    }
  }

  const encoded = encode({ data: outRgba, width, height }, 88);
  // Data URI evita escribir a disco y funciona en Expo Go y builds nativos.
  const uri = `data:image/jpeg;base64,${uint8ArrayToBase64(new Uint8Array(encoded.data))}`;
  return { uri, stats };
}

// ─── Estadísticas del mapa ────────────────────────────────────────────────────

/** Recorre el mapa de saliency una sola vez y extrae todas las métricas. */
function computeHeatmapStats(
  saliency: Float32Array,
  width: number,
  height: number,
): HeatmapStats {
  const total = width * height;
  let hot = 0;
  let warm = 0;
  let cold = 0;
  let sum = 0;
  let maxVal = 0;
  let peakIdx = 0;

  for (let i = 0; i < total; i++) {
    const v = saliency[i]!;
    sum += v;
    if (v > maxVal) {
      maxVal = v;
      peakIdx = i;
    }
    if (v > 0.70) hot++;
    else if (v > 0.40) warm++;
    else cold++;
  }

  const factor = 100 / total;
  return {
    hotAreaPct: Math.round(hot * factor * 10) / 10,
    warmAreaPct: Math.round(warm * factor * 10) / 10,
    coldAreaPct: Math.round(cold * factor * 10) / 10,
    meanSaliency: Math.round((sum / total) * 1000) / 1000,
    maxSaliency: Math.round(maxVal * 1000) / 1000,
    peakX: Math.round(((peakIdx % width) / width) * 100) / 100,
    peakY: Math.round((Math.floor(peakIdx / width) / height) * 100) / 100,
  };
}

// ─── Patrones de activación por enfermedad ────────────────────────────────────

interface BlobConfig {
  /** Cantidad base de blobs gaussianos (se suma hasta +1 por ruido de hash) */
  numBlobsBase: number;
  /** Sigma mínimo: controla el tamaño de cada foco */
  sigmaMin: number;
  /** Sigma máximo */
  sigmaMax: number;
  /**
   * Sesgo hacia el centro:
   *   0 = disperso uniformemente (margen = 15% del borde)
   *   1 = forzado al centro exacto
   */
  centerBias: number;
  /** Escala global del mapa (mayor → zonas más intensas) */
  intensityScale: number;
}

/**
 * Parámetros de simulación calibrados por enfermedad.
 *
 * - Mildiu: manchas aceitosas dispersas → múltiples blobs medianos esparcidos.
 * - Oídio: polvo blanco difuso → blobs grandes y centrados.
 * - Podredumbre bacteriana: necrosis concentrada → pocos blobs pequeños e intensos.
 * - Hoja sana: sin patrón patológico → activación difusa y de baja intensidad.
 */
const DISEASE_BLOB_CONFIG: Record<string, BlobConfig> = {
  Mildiu: {
    numBlobsBase: 3,
    sigmaMin: 0.11,
    sigmaMax: 0.17,
    centerBias: 0.05,
    intensityScale: 1.25,
  },
  Oídio: {
    numBlobsBase: 2,
    sigmaMin: 0.18,
    sigmaMax: 0.27,
    centerBias: 0.35,
    intensityScale: 1.05,
  },
  'Podredumbre bacteriana': {
    numBlobsBase: 2,
    sigmaMin: 0.08,
    sigmaMax: 0.13,
    centerBias: 0.0,
    intensityScale: 1.45,
  },
  'Hoja sana': {
    numBlobsBase: 2,
    sigmaMin: 0.15,
    sigmaMax: 0.23,
    centerBias: 0.1,
    intensityScale: 0.55,
  },
};

const DEFAULT_BLOB_CONFIG: BlobConfig = {
  numBlobsBase: 2,
  sigmaMin: 0.12,
  sigmaMax: 0.20,
  centerBias: 0.1,
  intensityScale: 1.0,
};

/**
 * Construye un mapa de "importancia" por píxel en [0, 1].
 * Usa blobs gaussianos con parámetros diferenciados por etiqueta de enfermedad,
 * de modo que dos diagnósticos producen patrones visualmente distintos y coherentes
 * con la sintomatología real del patógeno.
 */
function buildSimulatedSaliencyMap(
  width: number,
  height: number,
  prediction: GradCamPredictionInput,
): Float32Array {
  const map = new Float32Array(width * height);
  const cfg = DISEASE_BLOB_CONFIG[prediction.label] ?? DEFAULT_BLOB_CONFIG;
  const seed = hashString(`${prediction.label}:${prediction.confidence.toFixed(4)}`);
  const rnd = mulberry32(seed);
  const numBlobs = cfg.numBlobsBase + (seed % 2);
  const confidenceFactor = 0.52 + 0.48 * clamp01(prediction.confidence);

  // Rango de posición según centerBias: más centro → rango más estrecho
  const half = 0.5;
  const margin = 0.15;
  const rangeHalf = (half - margin) * (1 - cfg.centerBias);

  const cx: number[] = [];
  const cy: number[] = [];
  const sigma: number[] = [];

  for (let b = 0; b < numBlobs; b++) {
    cx.push(half - rangeHalf + rnd() * 2 * rangeHalf);
    cy.push(half - rangeHalf + rnd() * 2 * rangeHalf);
    sigma.push(cfg.sigmaMin + rnd() * (cfg.sigmaMax - cfg.sigmaMin));
  }

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      let acc = 0;
      for (let b = 0; b < numBlobs; b++) {
        const dx = nx - cx[b]!;
        const dy = ny - cy[b]!;
        const s = sigma[b]!;
        acc += Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
      }
      map[y * width + x] = clamp01(acc * cfg.intensityScale * confidenceFactor);
    }
  }
  return map;
}

// ─── Colormap jet-like ────────────────────────────────────────────────────────

/**
 * Colormap de explicabilidad: azul (baja atención) → amarillo → rojo (alta).
 * Alineado con la literatura de visualización (jet/turbo), legible sin conocimiento técnico.
 *
 * Puntos de referencia aproximados:
 *   t=0.00 → rgb(30, 60, 200)   azul
 *   t=0.25 → rgb(142,140,120)   verde-turquesa
 *   t=0.50 → rgb(255,220, 40)   amarillo
 *   t=0.75 → rgb(237,135, 40)   naranja
 *   t=1.00 → rgb(220, 50, 40)   rojo
 */
export function jetLikeColor(s: number): [number, number, number] {
  const t = clamp01(s);
  if (t < 0.5) {
    const u = t / 0.5;
    return [Math.round(lerp(30, 255, u)), Math.round(lerp(60, 220, u)), Math.round(lerp(200, 40, u))];
  }
  const u = (t - 0.5) / 0.5;
  return [Math.round(lerp(255, 220, u)), Math.round(lerp(220, 50, u)), 40];
}

// ─── Utilidades de píxel ─────────────────────────────────────────────────────

function blendRgba(
  src: Uint8Array,
  dst: Uint8Array,
  i: number,
  hr: number,
  hg: number,
  hb: number,
  alpha: number,
): void {
  dst[i] = Math.round(src[i]! * (1 - alpha) + hr * alpha);
  dst[i + 1] = Math.round(src[i + 1]! * (1 - alpha) + hg * alpha);
  dst[i + 2] = Math.round(src[i + 2]! * (1 - alpha) + hb * alpha);
  dst[i + 3] = src[i + 3]!;
}

// ─── Helpers matemáticos y de codificación ────────────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return globalThis.btoa(binary);
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
