import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { File } from 'expo-file-system';

import { firebaseStorage, firestoreDb } from '../config/firebase';
import type { Diagnosis } from '../types/diagnosis';

/**
 * Sube la imagen a Firebase Storage y guarda el diagnóstico en Firestore.
 * Devuelve la URL pública de la imagen en la nube.
 */
export async function uploadDiagnosis(userId: string, diagnosis: Diagnosis): Promise<string> {
  const imageRef = ref(firebaseStorage, `users/${userId}/diagnoses/${diagnosis.id}.jpg`);

  const file = new File(diagnosis.imageUri);
  const bytes = await file.bytes();
  await uploadBytes(imageRef, bytes, { contentType: 'image/jpeg' });

  const cloudImageUrl = await getDownloadURL(imageRef);

  await setDoc(doc(firestoreDb, 'users', userId, 'diagnoses', diagnosis.id), {
    id: diagnosis.id,
    imageUrl: cloudImageUrl,
    label: diagnosis.label,
    confidence: diagnosis.confidence,
    riskLevel: diagnosis.riskLevel,
    recommendation: diagnosis.recommendation,
    createdAt: diagnosis.createdAt,
    syncedAt: new Date().toISOString(),
  });

  return cloudImageUrl;
}

export async function deleteDiagnosisFromCloud(userId: string, diagnosisId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestoreDb, 'users', userId, 'diagnoses', diagnosisId));
  } catch {
    // El registro puede no existir en la nube si nunca se sincronizó
  }
}
