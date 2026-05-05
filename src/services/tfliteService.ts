import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { DiseaseLabel } from '../types/diagnosis';
import type { TflitePrediction } from '../types/tflite';

import { jpegUriToFloat32NHWC01 } from '../model/jpegToModelInput';
import { softmaxVectorToPrediction } from '../model/predictionFromVector';

/**
 * Capa de inferencia con TensorFlow Lite (`react-native-fast-tflite`).
 *
 * **Expo Go:** no carga el módulo nativo (Nitro no está soportado) → inferencia simulada, sin errores en consola.
 * **Build nativo** (`npx expo run:android` / iOS): carga `assets/model/guardian_vid.tflite` y predice en el dispositivo.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GUARDIAN_MODEL_ASSET = require('../../assets/model/guardian_vid.tflite') as number;

/** Clases que el archivo `.tflite` puede devolver (no incluye “No es hoja de vid”, que aplica el filtro de escena). */
export const CLASS_LABELS: DiseaseLabel[] = [
  'Hoja sana',
  'Mildiu',
  'Oídio',
  'Podredumbre bacteriana',
];

/** Contrato mínimo del intérprete TFLite (evita importar el paquete en Expo Go). */
interface NativeTfliteModel {
  run(inputs: ArrayBuffer[]): Promise<ArrayBuffer[]>;
}

let nativeModelPromise: Promise<NativeTfliteModel | null> | null = null;
let hasAnnouncedExpoGoSimulation = false;

/**
 * `StoreClient` = app abierta dentro de **Expo Go** (no hay módulos nativos del proyecto).
 */
function canLoadNativeTflite(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

async function getNativeModel(): Promise<NativeTfliteModel | null> {
  if (!canLoadNativeTflite()) {
    if (!hasAnnouncedExpoGoSimulation) {
      hasAnnouncedExpoGoSimulation = true;
      console.info(
        '[Guardián de la Vid] Expo Go: inferencia simulada. Para TFLite real usá `npx expo run:android` (o iOS) tras `npx expo prebuild`.',
      );
    }
    return null;
  }

  if (nativeModelPromise) {
    return nativeModelPromise;
  }

  nativeModelPromise = (async () => {
    try {
      const { loadTensorflowModel } = await import('react-native-fast-tflite');
      if (typeof loadTensorflowModel !== 'function') {
        throw new Error('loadTensorflowModel no disponible');
      }
      return await loadTensorflowModel(GUARDIAN_MODEL_ASSET, []);
    } catch (e) {
      console.warn('[Guardián de la Vid] No se pudo cargar TFLite. Inferencia simulada.', e);
      return null;
    }
  })();

  return nativeModelPromise;
}

/** Solo para tests: permite volver a intentar cargar el modelo nativo. */
export function __resetNativeModelCacheForTests(): void {
  nativeModelPromise = null;
  hasAnnouncedExpoGoSimulation = false;
}

/**
 * Predicción simulada (fallback offline cuando TFLite nativo no está disponible).
 */
export async function simulatePrediction(_processedImageUri: string): Promise<TflitePrediction> {
  await new Promise((r) => setTimeout(r, 450));

  const raw = CLASS_LABELS.map(() => Math.random() * 0.85 + 0.05);
  const sum = raw.reduce((a, b) => a + b, 0);
  const probabilities = raw.map((v) => v / sum);

  let bestIdx = 0;
  probabilities.forEach((p, i) => {
    if (p > probabilities[bestIdx]) {
      bestIdx = i;
    }
  });

  const label = CLASS_LABELS[bestIdx];
  const confidence = probabilities[bestIdx];

  return {
    label,
    confidence,
    probabilities,
  };
}

/**
 * Inferencia sobre el tensor RGB [0,1] ya decodificado (224×224×3 aplanado).
 * `processedImageUri` se usa solo si hay que caer a simulación (misma firma que antes).
 */
export async function runModelInferenceFromTensor(
  tensor: Float32Array,
  processedImageUri: string,
): Promise<TflitePrediction> {
  const model = await getNativeModel();
  if (!model) {
    return simulatePrediction(processedImageUri);
  }
  try {
    const sliced = tensor.buffer.slice(tensor.byteOffset, tensor.byteOffset + tensor.byteLength);
    const inputBuffer = sliced as ArrayBuffer;
    const outputs = await model.run([inputBuffer]);
    const first = outputs[0];
    if (!first) {
      throw new Error('El modelo no devolvió tensores de salida.');
    }
    const probs = new Float32Array(first);
    return softmaxVectorToPrediction(probs);
  } catch (e) {
    console.warn('[Guardián de la Vid] Error en inferencia TFLite; usando simulación.', e);
    return simulatePrediction(processedImageUri);
  }
}

/**
 * Decodifica el JPEG y ejecuta el modelo (una lectura de archivo).
 * El filtro “no es hoja” se aplica en `diagnosisService` con `jpegUriToTensorAndVegetation`.
 */
export async function runModelInference(processedImageUri: string): Promise<TflitePrediction> {
  const input = await jpegUriToFloat32NHWC01(processedImageUri);
  return runModelInferenceFromTensor(input, processedImageUri);
}
