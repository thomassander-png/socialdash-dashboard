'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Einfaches Passwort-basiertes Auth-System
// Credentials: thomas.sander@famefact.com / SocialDAsh26ff.!!
const VALID_CREDENTIALS = {
  email: 'thomas.sander@famefact.com',
  password: 'SocialDAsh26ff.!!'
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string } | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem('socialdash_auth');
        if (authData) {
          const { email, timestamp } = JSON.parse(authData);
          // Session expires after 24 hours
          const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000;
          if (!isExpired && email === VALID_CREDENTIALS.email) {
            setIsAuthenticated(true);
            setUser({ email });
          } else {
            localStorage.removeItem('socialdash_auth');
          }
        }
      } catch (e) {
        localStorage.removeItem('socialdash_auth');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Redirect based on auth status
  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === '/login';
    
    if (!isAuthenticated && !isLoginPage) {
      router.push('/login');
    } else if (isAuthenticated && isLoginPage) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = (email: string, password: string): boolean => {
    if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
      const authData = { email, timestamp: Date.now() };
      localStorage.setItem('socialdash_auth', JSON.stringify(authData));
      setIsAuthenticated(true);
      setUser({ email });
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('socialdash_auth');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
