import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from './types';
import { DB } from './db';

interface AuthContextType {
  user: User | null;
  login: (email: string, senha: string) => boolean;
  logout: () => void;
  updateUser: (u: User) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => false,
  logout: () => {},
  updateUser: () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((email: string, senha: string) => {
    const users = DB.get<User>('users');
    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha && u.ativo !== false
    );
    if (found) { setUser(found); return true; }
    return false;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAdmin: user?.perfil === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}
