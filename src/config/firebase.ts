import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ============================================================
//  PASO 1: Creá un proyecto en https://console.firebase.google.com
//  PASO 2: Habilitá Authentication (Email/Contraseña), Firestore y Storage
//  PASO 3: Agregá una app web, copiá el firebaseConfig y pegalo acá:
// ============================================================
const firebaseConfig = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROJECT_ID.firebaseapp.com',
  projectId: 'TU_PROJECT_ID',
  storageBucket: 'TU_PROJECT_ID.appspot.com',
  messagingSenderId: 'TU_MESSAGING_SENDER_ID',
  appId: 'TU_APP_ID',
};

// Nota: Firebase v12 eliminó getReactNativePersistence. Se usa inMemoryPersistence;
// la sesión dura mientras la app está abierta y se pide login al reiniciarla.
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
});

export const firestoreDb = getFirestore(app);
export const firebaseStorage = getStorage(app);
