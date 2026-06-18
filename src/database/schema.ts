/**
 * Esquema SQLite de la aplicación.
 * Mantiene el SQL en un solo lugar para facilitar migraciones futuras en la tesis.
 */

export const TABLE_DIAGNOSES = 'diagnoses';

/**
 * Sentencia DDL: tabla de diagnósticos guardados por el usuario.
 * `createdAt` en ISO 8601 para ordenar y mostrar fechas de forma consistente.
 * `syncStatus`: 'local' (sin cuenta), 'pending' (esperando sync), 'synced' (en nube).
 */
export const SQL_CREATE_DIAGNOSES = `
CREATE TABLE IF NOT EXISTS ${TABLE_DIAGNOSES} (
  id TEXT PRIMARY KEY NOT NULL,
  imageUri TEXT NOT NULL,
  label TEXT NOT NULL,
  confidence REAL NOT NULL,
  riskLevel TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  userId TEXT,
  syncStatus TEXT DEFAULT 'local',
  cloudId TEXT,
  latitude REAL,
  longitude REAL,
  weatherTempC REAL,
  weatherHumidity REAL,
  weatherCondition TEXT,
  weatherObservedAt TEXT
);
`;

/**
 * Migraciones incrementales: agregan columnas nuevas a instalaciones existentes.
 * SQLite lanza "duplicate column name" si ya existe — se ignora silenciosamente.
 */
export const SQL_MIGRATIONS = [
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN userId TEXT`,
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN syncStatus TEXT DEFAULT 'local'`,
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN cloudId TEXT`,
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN latitude REAL`,
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN longitude REAL`,
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN weatherTempC REAL`,
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN weatherHumidity REAL`,
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN weatherCondition TEXT`,
  `ALTER TABLE ${TABLE_DIAGNOSES} ADD COLUMN weatherObservedAt TEXT`,
];
