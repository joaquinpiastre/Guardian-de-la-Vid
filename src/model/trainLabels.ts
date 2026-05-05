import type { DiseaseLabel } from '../types/diagnosis';

/**
 * Orden de clases tal como aparece en `assets/model/labels.txt` del entrenamiento.
 * El vector softmax del modelo respeta exactamente este orden.
 */
export const TRAIN_FOLDER_NAMES = ['0_sana', '1_mildiu', '2_oidio', '3_bacteriana'] as const;

export type TrainFolderName = (typeof TRAIN_FOLDER_NAMES)[number];

const FOLDER_TO_DISEASE: Record<TrainFolderName, DiseaseLabel> = {
  '0_sana': 'Hoja sana',
  '1_mildiu': 'Mildiu',
  '2_oidio': 'Oídio',
  '3_bacteriana': 'Podredumbre bacteriana',
};

/** Mapea el nombre de carpeta del dataset al texto mostrado en la app. */
export function trainFolderNameToDiseaseLabel(name: string): DiseaseLabel {
  if (!(name in FOLDER_TO_DISEASE)) {
    throw new Error(`Etiqueta de entrenamiento desconocida: ${name}`);
  }
  return FOLDER_TO_DISEASE[name as TrainFolderName];
}
