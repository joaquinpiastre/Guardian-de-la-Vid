import { uploadDiagnosis } from './cloudService';
import { listPendingDiagnoses, markDiagnosisSynced } from './databaseService';

/**
 * Sube a la nube todos los diagnósticos que quedaron pendientes durante offline.
 * Se llama automáticamente cuando el dispositivo recupera conectividad.
 * Devuelve la cantidad de registros sincronizados.
 */
export async function syncPendingDiagnoses(userId: string): Promise<number> {
  const pending = await listPendingDiagnoses(userId);
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const diagnosis of pending) {
    try {
      await uploadDiagnosis(userId, diagnosis);
      await markDiagnosisSynced(diagnosis.id);
      synced++;
    } catch {
      // Si falla uno seguimos con los demás; se reintentará en la próxima reconexión
    }
  }
  return synced;
}
