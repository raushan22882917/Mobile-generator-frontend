'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { User, firebaseUserToUser } from '@/lib/auth-api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render after hydration to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Firebase auth state changes
  useEffect(() => {
    // Only run after component is mounted to prevent hydration issues
    if (!mounted || typeof window === 'undefined') return;

    if (!auth) {
      // Firebase not initialized (server-side or missing config)
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Convert Firebase user to our User interface
          const user = firebaseUserToUser(firebaseUser);
          setUser(user);
          setAuthenticated(true);
        } catch (error) {
          console.error('Error processing Firebase user:', error);
          setUser(null);
          setAuthenticated(false);
        }
      } else {
        // No Firebase user
        setUser(null);
        setAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mounted]);

  // Listen for token refresh (Firebase tokens expire after 1 hour)
  // This ensures the token is refreshed periodically
  useEffect(() => {
    if (!mounted || !auth || !auth.currentUser) return;

    const refreshToken = async () => {
      try {
        // Force token refresh - this helps keep the session alive
        await auth.currentUser!.getIdToken(true);
        // Update user data in case it changed
        if (auth.currentUser) {
          const user = firebaseUserToUser(auth.currentUser);
          setUser(user);
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    };

    // Refresh token every 50 minutes (tokens expire after 1 hour)
    const interval = setInterval(refreshToken, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [mounted, authenticated]);

  const login = (userData: User) => {
    setUser(userData);
    setAuthenticated(true);
  };

  const logout = async () => {
    // Sign out from Firebase
    if (auth && auth.currentUser) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setAuthenticated(false);
  };

  const refreshUser = async () => {
    if (auth && auth.currentUser) {
      try {
        // Get fresh Firebase token and update user data
        await auth.currentUser.getIdToken(true);
        const user = firebaseUserToUser(auth.currentUser);
        setUser(user);
        setAuthenticated(true);
      } catch (error) {
        console.error('Error refreshing user:', error);
        logout();
      }
    }
  };

  // Prevent hydration mismatch by not rendering children until mounted
  if (!mounted) {
    return (
      <AuthContext.Provider value={{ user, loading: true, authenticated: false, login, logout, refreshUser }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, authenticated, login, logout, refreshUser }}>
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


