import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isAuthenticated, setToken, clearToken } from '@/lib/api';
import { hasPublicKeys, clearPrivateKeysFromSession } from '@/lib/keyStorage';

interface AuthContextType {
  isLoggedIn: boolean;
  hasKeyPair: boolean;
  isLoadingKeys: boolean;
  setLoggedIn: (value: boolean) => void;
  setHasKeyPair: (value: boolean) => void;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasKeyPair, setHasKeyPair] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check authentication status
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      
      if (authenticated) {
        // Check if public keys exist (user has completed signup)
        try {
          const exists = await hasPublicKeys();
          setHasKeyPair(exists);
        } catch (error) {
          console.error('Error checking keys:', error);
          setHasKeyPair(false);
        }
      }
      
      setIsLoadingKeys(false);
    };

    initAuth();
  }, []);

  const login = (token: string) => {
    setToken(token);
    setIsLoggedIn(true);
  };

  const logout = () => {
    clearToken();
    clearPrivateKeysFromSession(); // Clear session private keys on logout
    setIsLoggedIn(false);
  };

  const setLoggedIn = (value: boolean) => {
    setIsLoggedIn(value);
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      hasKeyPair,
      isLoadingKeys,
      setLoggedIn, 
      setHasKeyPair, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
