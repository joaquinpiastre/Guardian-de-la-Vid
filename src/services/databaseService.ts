import * as SQLite from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

import { SQL_CREATE_DIAGNOSES, TABLE_DIAGNOSES } from '../database/schema';
import type { Diagnosis, DiseaseLabel } from '../types/diagnosis';

/**
 * Acceso a datos local con SQLite (sin backend).
 * Gestiona ciclo de vida de la BD y persistencia de imágenes en el directorio de documentos.
 *
 * Nota (Expo SDK 54+): se usa la API moderna de `expo-file-system` (`File` / `Directory` / `Paths`)
 * en lugar de `documentDirectory` + `copyAsync` deprecados.
 */

let dbInstance: SQLite.SQLiteDatabase | null = null;

function generateId(): string {
  return `dg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('guardian_vid.sqlite');
    await dbInstance.execAsync(SQL_CREATE_DIAGNOSES);
  }
  return dbInstance;
}

/**
 * Inicializa la base al arranque de la app (idempotente).
 */
export async function initDatabase(): Promise<void> {
  await getDb();
}

const IMAGES_DIR = 'guardian_vid_images';

/**
 * Garantiza la carpeta persistente donde se copian las imágenes asociadas a cada diagnóstico.
 */
function ensureImagesDirectory(): Directory | null {
  try {
    const dir = new Directory(Paths.document, IMAGES_DIR);
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
    return dir;
  } catch {
    return null;
  }
}

/**
 * Copia la imagen analizada a almacenamiento persistente y devuelve su nueva URI (`file://`).
 */
export async function persistDiagnosisImage(sourceUri: string, id: string): Promise<string> {
  const dir = ensureImagesDirectory();
  if (!dir) {
    return sourceUri;
  }
  try {
    const sourceFile = new File(sourceUri);
    const destFile = new File(dir, `${id}.jpg`);
    sourceFile.copy(destFile);
    return destFile.uri;
  } catch {
    return sourceUri;
  }
}

function parseRow(row: Record<string, unknown>): Diagnosis {
  return {
    id: String(row.id),
    imageUri: String(row.imageUri),
    label: row.label as DiseaseLabel,
    confidence: Number(row.confidence),
    riskLevel: row.riskLevel as Diagnosis['riskLevel'],
    recommendation: String(row.recommendation),
    createdAt: String(row.createdAt),
  };
}

export async function saveDiagnosis(input: Omit<Diagnosis, 'id' | 'createdAt'> & { id?: string }): Promise<Diagnosis> {
  const db = await getDb();
  const id = input.id ?? generateId();
  const createdAt = new Date().toISOString();
  const persistentUri = await persistDiagnosisImage(input.imageUri, id);

  await db.runAsync(
    `INSERT INTO ${TABLE_DIAGNOSES} (id, imageUri, label, confidence, riskLevel, recommendation, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, persistentUri, input.label, input.confidence, input.riskLevel, input.recommendation, createdAt],
  );

  return {
    id,
    imageUri: persistentUri,
    label: input.label,
    confidence: input.confidence,
    riskLevel: input.riskLevel,
    recommendation: input.recommendation,
    createdAt,
  };
}

export async function listDiagnoses(): Promise<Diagnosis[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE_DIAGNOSES} ORDER BY datetime(createdAt) DESC`,
  );
  return rows.map(parseRow);
}

export async function getDiagnosisById(id: string): Promise<Diagnosis | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE_DIAGNOSES} WHERE id = ?`,
    [id],
  );
  if (!row) {
    return null;
  }
  return parseRow(row);
}

export async function deleteDiagnosisById(id: string): Promise<void> {
  const existing = await getDiagnosisById(id);
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TABLE_DIAGNOSES} WHERE id = ?`, [id]);

  if (existing?.imageUri.startsWith('file:')) {
    try {
      const file = new File(existing.imageUri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Si el archivo ya no existe, no bloqueamos la UX
    }
  }
}
