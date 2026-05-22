import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Contrato de rutas del stack principal.
 * Tipar `navigation` y `route` en cada pantalla evita errores al pasar parámetros.
 */
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Camera: undefined;
  /**
   * URI local de la imagen capturada o elegida desde galería.
   * `additionalUris` contiene las imágenes extra cuando se usa el modo
   * de análisis múltiple (ensemble de 2–3 fotos).
   */
  Result: { imageUri: string; additionalUris?: string[] };
  History: undefined;
  Detail: { id: string };
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type CameraScreenProps = NativeStackScreenProps<RootStackParamList, 'Camera'>;
export type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;
export type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'History'>;
export type DetailScreenProps = NativeStackScreenProps<RootStackParamList, 'Detail'>;
