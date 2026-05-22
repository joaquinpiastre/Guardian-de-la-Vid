import * as SQLite from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

import { SQL_CREATE_DIAGNOSES, SQL_MIGRATIONS, TABLE_DIAGNOSES } from '../database/schema';
import type { Diagnosis, DiseaseLabel, SyncStatus } from '../types/diagnosis';

let dbInstance: SQLite.SQLiteDatabase | null = null;

function generateId(): string {
  return `dg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('guardian_vid.sqlite');
    await dbInstance.execAsync(SQL_CREATE_DIAGNOSES);
    // Migraciones para installs existentes (columnas nuevas)
    for (const sql of SQL_MIGRATIONS) {
      try {
        await dbInstance.execAsync(sql);
      } catch {
        // "duplicate column name" — idempotente, se ignora
      }
    }
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  await getDb();
}

const IMAGES_DIR = 'guardian_vid_images';

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

export async function persistDiagnosisImage(sourceUri: string, id: string): Promise<string> {
  const dir = ensureImagesDirectory();
  if (!dir) return sourceUri;
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
    userId: row.userId != null ? String(row.userId) : undefined,
    syncStatus: (row.syncStatus as SyncStatus | null) ?? 'local',
    cloudId: row.cloudId != null ? String(row.cloudId) : undefined,
  };
}

export async function saveDiagnosis(
  input: Omit<Diagnosis, 'id' | 'createdAt'> & { id?: string },
): Promise<Diagnosis> {
  const db = await getDb();
  const id = input.id ?? generateId();
  const createdAt = new Date().toISOString();
  const persistentUri = await persistDiagnosisImage(input.imageUri, id);
  const syncStatus: SyncStatus = input.syncStatus ?? 'local';
  const userId = input.userId ?? null;

  await db.runAsync(
    `INSERT INTO ${TABLE_DIAGNOSES}
       (id, imageUri, label, confidence, riskLevel, recommendation, createdAt, userId, syncStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, persistentUri, input.label, input.confidence, input.riskLevel, input.recommendation, createdAt, userId, syncStatus],
  );

  return {
    id,
    imageUri: persistentUri,
    label: input.label,
    confidence: input.confidence,
    riskLevel: input.riskLevel,
    recommendation: input.recommendation,
    createdAt,
    userId: input.userId,
    syncStatus,
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
  if (!row) return null;
  return parseRow(row);
}

/** Devuelve todos los diagnósticos de un usuario que aún no se subieron a la nube. */
export async function listPendingDiagnoses(userId: string): Promise<Diagnosis[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE_DIAGNOSES} WHERE syncStatus = 'pending' AND userId = ? ORDER BY datetime(createdAt) ASC`,
    [userId],
  );
  return rows.map(parseRow);
}

/** Marca un diagnóstico como sincronizado con la nube. */
export async function markDiagnosisSynced(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${TABLE_DIAGNOSES} SET syncStatus = 'synced' WHERE id = ?`,
    [id],
  );
}

export async function deleteDiagnosisById(id: string): Promise<void> {
  const existing = await getDiagnosisById(id);
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TABLE_DIAGNOSES} WHERE id = ?`, [id]);

  if (existing?.imageUri.startsWith('file:')) {
    try {
      const file = new File(existing.imageUri);
      if (file.exists) file.delete();
    } catch {
      // Archivo ya eliminado, no bloqueamos la UX
    }
  }
}
