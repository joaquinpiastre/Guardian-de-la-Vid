import { describe, expect, it } from '@jest/globals';

import { trainFolderNameToDiseaseLabel } from '../src/model/trainLabels';

describe('trainFolderNameToDiseaseLabel', () => {
  it('mapea nombres de carpeta del dataset a etiquetas de UI', () => {
    expect(trainFolderNameToDiseaseLabel('0_sana')).toBe('Hoja sana');
    expect(trainFolderNameToDiseaseLabel('1_mildiu')).toBe('Mildiu');
    expect(trainFolderNameToDiseaseLabel('2_oidio')).toBe('Oídio');
    expect(trainFolderNameToDiseaseLabel('3_bacteriana')).toBe('Podredumbre bacteriana');
  });

  it('rechaza nombres desconocidos', () => {
    expect(() => trainFolderNameToDiseaseLabel('99_xyz')).toThrow();
  });
});
