import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@guardian_users';
const SESSION_KEY = '@guardian_session';

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string | null;
}

interface StoredUser extends LocalUser {
  password: string;
}

type UserChangeListener = (user: LocalUser | null) => void;
let _listener: UserChangeListener | null = null;

export function onLocalAuthStateChanged(callback: UserChangeListener): () => void {
  _listener = callback;
  AsyncStorage.getItem(SESSION_KEY)
    .then((raw) => {
      try {
        callback(raw ? (JSON.parse(raw) as LocalUser) : null);
      } catch {
        callback(null);
      }
    })
    .catch(() => callback(null));
  return () => {
    _listener = null;
  };
}

async function notifyListener(): Promise<void> {
  if (!_listener) return;
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  _listener(raw ? (JSON.parse(raw) as LocalUser) : null);
}

export async function register(email: string, password: string, name: string): Promise<void> {
  if (password.length < 6) throw { code: 'auth/weak-password' };

  const raw = await AsyncStorage.getItem(USERS_KEY);
  const users: StoredUser[] = raw ? (JSON.parse(raw) as StoredUser[]) : [];

  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw { code: 'auth/email-already-in-use' };
  }

  const newUser: StoredUser = {
    uid: `local_${Date.now()}`,
    email,
    password,
    displayName: name,
  };

  users.push(newUser);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

  const session: LocalUser = { uid: newUser.uid, email, displayName: name };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  await notifyListener();
}

export async function login(email: string, password: string): Promise<void> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  const users: StoredUser[] = raw ? (JSON.parse(raw) as StoredUser[]) : [];

  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) throw { code: 'auth/invalid-credential' };

  const session: LocalUser = { uid: user.uid, email: user.email, displayName: user.displayName };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  await notifyListener();
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  await notifyListener();
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
