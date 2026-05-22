import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export async function register(email: string, password: string, name: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese correo.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Verificá tu internet e intentá de nuevo.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.';
    default:
      return 'Ocurrió un error. Intentá de nuevo.';
  }
}
