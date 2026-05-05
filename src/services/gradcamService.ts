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
 * - **TFLite está optimizado para inferencia**, no expone de forma portable el
 *   grafo completo de entrenamiento ni los gradientes por clase en todas las
 *   plataformas. Grad-CAM real requiere tensores intermedios (activaciones) y
 *   gradientes respecto a la clase, típicamente obtenidos en Python (TensorFlow
 *   / PyTorch) o en runtimes con soporte explícito de diferenciación.
 * - **Coste computacional**: calcular gradientes y upsample sobre la marcha puede
 *   ser pesado en teléfonos modestos y bloquear el hilo JS si no se delega a
 *   código nativo o a un worker.
 * - **jpeg-js es puro JS**: útil offline en Expo, pero más lento que codecs
 *   nativos; aquí operamos en 224×224 para mantener tiempos razonables.
 *
 * ## Cómo reemplazar la simulación por Grad-CAM real (ruta recomendada)
 * 1. **En el entrenamiento (Python)**: exportar un modelo auxiliar o un script
 *    que, dada una imagen, devuelva el mapa de saliencia ya calculado (tensor
 *    H×W) y guardarlo junto al diagnóstico (no aplica si debe ser 100 % on-device).
 * 2. **On-device avanzado**: usar un intérprete que permita acceder a tensores
 *    intermedios y, si existe API de gradientes, replicar la fórmula Grad-CAM;
 *    o bien integrar una biblioteca nativa que ejecute el backward selectivo.
 * 3. **Sustituir en este archivo** la función `buildSimulatedSaliencyMap` por
 *    una que lea el mapa real (misma resolución que la entrada del modelo) y
 *    conserve `colorizeSaliency` + `blendRgba` sin cambios conceptuales.
 *
 * Hasta entonces, `buildSimulatedSaliencyMap` genera una máscara plausible
 * determinista a partir de la predicción, solo con fines de UI y arquitectura.
 */

import { decode, encode } from 'jpeg-js';
import * as ImageManipulator from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

import { MODEL_INPUT_SIZE } from './imageProcessor';
import type { DiseaseLabel } from '../types/diagnosis';

/** Opacidad del mapa de calor sobre la foto (0 = invisible, 1 = opaco). */
export const HEATMAP_OVERLAY_ALPHA = 0.4;

/**
 * Entrada mínima para alinear la simulación con la salida del clasificador.
 * Cuando exista Grad-CAM real, aquí se pasarían también handles a tensores
 * intermedios o el mapa H×W precalculado.
 */
export interface GradCamPredictionInput {
  label: DiseaseLabel | string;
  /** Confianza principal del modelo en [0, 1]; modula intensidad del mapa simulado */
  confidence: number;
  /** Opcional: usado para dispersar centros de activación entre clases cercanas */
  probabilities?: number[];
}

const CACHE_DIR_NAME = 'guardian_vid_gradcam';

/** Predicción por defecto cuando solo se invoca `generateHeatmap` (demo / API mínima). */
const DEFAULT_PREDICTION: GradCamPredictionInput = {
  label: 'Hoja sana',
  confidence: 0.7,
};

/**
 * Genera una nueva imagen JPEG local (`file://`) con mapa de calor superpuesto.
 * Es un atajo documentado para integraciones que aún no tienen el vector de
 * predicción; internamente usa `composeGradCamOverlay` con valores neutros.
 */
export async function generateHeatmap(imageUri: string): Promise<string> {
  return composeGradCamOverlay(imageUri, DEFAULT_PREDICTION);
}

/**
 * Punto de entrada principal: imagen original + predicción → JPEG con heatmap.
 * Redimensiona a `MODEL_INPUT_SIZE` para coincidir con el tensor de entrada del
 * modelo y con el futuro mapa Grad-CAM real.
 */
export async function composeGradCamOverlay(
  imageUri: string,
  prediction: GradCamPredictionInput,
): Promise<string> {
  const normalized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
  );

  const file = new File(normalized.uri);
  const b64 = await file.base64();
  const bytes = base64ToUint8Array(b64);
  const decoded = decode(bytes, { useTArray: true, formatAsRGBA: true });
  if (!decoded?.data) {
    throw new Error('No se pudo decodificar la imagen para el mapa de explicabilidad.');
  }

  const { width, height, data } = decoded;
  const saliency = buildSimulatedSaliencyMap(width, height, prediction);
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
  return writeJpegToCache(encoded.data);
}

// --- Implementación simulada (reemplazar por mapa real Grad-CAM) ---

/**
 * Construye un mapa de “importancia” por píxel en [0, 1] sin acceso a capas internas.
 * Usa blobs gaussianos cuyos centros dependen del hash de la etiqueta y de la
 * confianza, de modo que dos diagnósticos distintos producen patrones distintos.
 */
function buildSimulatedSaliencyMap(
  width: number,
  height: number,
  prediction: GradCamPredictionInput,
): Float32Array {
  const map = new Float32Array(width * height);
  const seed = hashString(`${prediction.label}:${prediction.confidence.toFixed(4)}`);
  const rnd = mulberry32(seed);
  const numBlobs = 2 + (seed % 2);
  const confidenceFactor = 0.55 + 0.45 * clamp01(prediction.confidence);
  const margin = 0.18;
  const cx: number[] = [];
  const cy: number[] = [];
  const sigma: number[] = [];

  for (let b = 0; b < numBlobs; b++) {
    cx.push(margin + rnd() * (1 - 2 * margin));
    cy.push(margin + rnd() * (1 - 2 * margin));
    sigma.push(0.12 + rnd() * 0.1);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      let acc = 0;
      for (let b = 0; b < numBlobs; b++) {
        const dx = nx - cx[b]!;
        const dy = ny - cy[b]!;
        const s = sigma[b]!;
        acc += Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
      }
      const v = clamp01(acc * confidenceFactor * 1.15);
      map[y * width + x] = v;
    }
  }
  return map;
}

/**
 * Colormap estilo explicabilidad: azul (baja atención) → amarillo → rojo (alta).
 * Alineado con la literatura de visualización, legible para usuarios no técnicos.
 */
function jetLikeColor(s: number): [number, number, number] {
  const t = clamp01(s);
  if (t < 0.5) {
    const u = t / 0.5;
    const r = lerp(30, 255, u);
    const g = lerp(60, 220, u);
    const b = lerp(200, 40, u);
    return [r, g, b];
  }
  const u = (t - 0.5) / 0.5;
  const r = lerp(255, 220, u);
  const g = lerp(220, 50, u);
  const b = lerp(40, 40, u);
  return [r, g, b];
}

function blendRgba(
  src: Uint8Array,
  dst: Uint8Array,
  i: number,
  hr: number,
  hg: number,
  hb: number,
  alpha: number,
): void {
  const sr = src[i]!;
  const sg = src[i + 1]!;
  const sb = src[i + 2]!;
  const sa = src[i + 3]!;
  dst[i] = Math.round(sr * (1 - alpha) + hr * alpha);
  dst[i + 1] = Math.round(sg * (1 - alpha) + hg * alpha);
  dst[i + 2] = Math.round(sb * (1 - alpha) + hb * alpha);
  dst[i + 3] = sa;
}

/**
 * Persiste bytes JPEG en disco.
 *
 * Importante (Expo SDK 54+ / Android): `File.write(Uint8Array)` delega en buffers
 * “directos” del bridge nativo y puede fallar con ciertos `TypedArray` de Hermes.
 * Escribir como cadena Base64 con `{ encoding: 'base64' }` fuerza el camino
 * `Base64.decode → ByteArray` en Kotlin/Swift, estable para binarios.
 */
function writeJpegToCache(jpegBytes: Uint8Array): string {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  const name = `gradcam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const out = new File(dir, name);
  const b64 = uint8ArrayToBase64(
    jpegBytes.byteOffset === 0 && jpegBytes.byteLength === jpegBytes.buffer.byteLength
      ? jpegBytes
      : new Uint8Array(jpegBytes.buffer, jpegBytes.byteOffset, jpegBytes.byteLength),
  );
  out.write(b64, { encoding: 'base64' });
  return out.uri;
}

/** Codificación Base64 compatible con RN/Hermes (sin depender de `Buffer`). */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return globalThis.btoa(binary);
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

function base64ToUint8Array(b64: string): Uint8Array {
  const binaryString = globalThis.atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
