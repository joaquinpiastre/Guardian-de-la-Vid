import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Contrato de rutas del stack principal.
 * Tipar `navigation` y `route` en cada pantalla evita errores al pasar parámetros.
 */
export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  /** URI local de la imagen capturada o elegida desde galería */
  Result: { imageUri: string };
  History: undefined;
  Detail: { id: string };
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type CameraScreenProps = NativeStackScreenProps<RootStackParamList, 'Camera'>;
export type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;
export type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'History'>;
export type DetailScreenProps = NativeStackScreenProps<RootStackParamList, 'Detail'>;
