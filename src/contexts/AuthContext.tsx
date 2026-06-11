import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onLocalAuthStateChanged, type LocalUser } from '../services/authService';

interface AuthContextValue {
  user: LocalUser | null;
  loading: boolean;
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isGuest: false,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Timeout de seguridad: si AsyncStorage tarda más de 3s, desbloqueamos igual
    const timeout = setTimeout(() => setLoading(false), 3000);
    const unsubscribe = onLocalAuthStateChanged((localUser) => {
      clearTimeout(timeout);
      setUser(localUser);
      if (localUser) setIsGuest(false);
      setLoading(false);
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const enterGuestMode = useCallback(() => setIsGuest(true), []);
  const exitGuestMode = useCallback(() => setIsGuest(false), []);

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, enterGuestMode, exitGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
