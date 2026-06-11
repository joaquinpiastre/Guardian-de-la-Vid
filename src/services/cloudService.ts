import type { Diagnosis } from '../types/diagnosis';

export async function uploadDiagnosis(_userId: string, _diagnosis: Diagnosis): Promise<string> {
  return '';
}

export async function deleteDiagnosisFromCloud(
  _userId: string,
  _diagnosisId: string,
): Promise<void> {
  // no-op en modo local
}
