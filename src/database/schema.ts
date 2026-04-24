/**
 * Esquema SQLite de la aplicación.
 * Mantiene el SQL en un solo lugar para facilitar migraciones futuras en la tesis.
 */

export const TABLE_DIAGNOSES = 'diagnoses';

/**
 * Sentencia DDL: tabla de diagnósticos guardados por el usuario.
 * `createdAt` en ISO 8601 para ordenar y mostrar fechas de forma consistente.
 */
export const SQL_CREATE_DIAGNOSES = `
CREATE TABLE IF NOT EXISTS ${TABLE_DIAGNOSES} (
  id TEXT PRIMARY KEY NOT NULL,
  imageUri TEXT NOT NULL,
  label TEXT NOT NULL,
  confidence REAL NOT NULL,
  riskLevel TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`;
