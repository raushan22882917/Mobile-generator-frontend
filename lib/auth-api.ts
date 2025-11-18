import axios, { AxiosError } from 'axios';
import { User as FirebaseUser } from 'firebase/auth';

// Use Next.js API routes to proxy requests (avoids CORS and handles auth)
const API_BASE = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app');

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_login?: string | null;
  is_active: boolean;
}

/**
 * Convert Firebase user to our User interface
 */
export function firebaseUserToUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || undefined,
    created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
    last_login: firebaseUser.metadata.lastSignInTime || null,
    is_active: !firebaseUser.disabled,
  };
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface AuthError {
  success: false;
  message: string;
  error?: string;
}

/**
 * Signup (Register) a new user
 */
export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse | AuthError> {
  try {
    const endpoint = typeof window !== 'undefined' 
      ? '/api/auth/signup'
      : `${API_BASE}/auth/signup`;
    
    const response = await axios.post<AuthResponse>(endpoint, {
      email,
      password,
      name,
    });

    if (response.data.success && response.data.token) {
      // Store token and user data
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      // Store login timestamp for session management
      localStorage.setItem('auth_login_time', Date.now().toString());
      localStorage.setItem('auth_last_check', Date.now().toString());
    }

    return response.data;
  } catch (error: any) {
    const axiosError = error as AxiosError<AuthError>;
    return {
      success: false,
      message: axiosError.response?.data?.message || 'Signup failed',
      error: axiosError.response?.data?.error,
    };
  }
}

/**
 * Login with email and password
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse | AuthError> {
  try {
    const endpoint = typeof window !== 'undefined' 
      ? '/api/auth/login'
      : `${API_BASE}/auth/login`;
    
    const response = await axios.post<AuthResponse>(endpoint, {
      email,
      password,
    });

    if (response.data.success && response.data.token) {
      // Store token and user data
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      // Store login timestamp for session management
      localStorage.setItem('auth_login_time', Date.now().toString());
      localStorage.setItem('auth_last_check', Date.now().toString());
    }

    return response.data;
  } catch (error: any) {
    const axiosError = error as AxiosError<AuthError>;
    return {
      success: false,
      message: axiosError.response?.data?.message || 'Login failed',
      error: axiosError.response?.data?.error,
    };
  }
}

/**
 * Get current user information
 * This also helps keep the session alive by validating the token
 * If the backend extends token expiration on this call, it helps maintain the session
 */
export async function getCurrentUser(token?: string): Promise<User> {
  const authToken = token || localStorage.getItem('auth_token');
  
  if (!authToken) {
    throw new Error('No authentication token found');
  }

  const endpoint = typeof window !== 'undefined' 
    ? '/api/auth/me'
    : `${API_BASE}/auth/me`;

  try {
    const response = await axios.get<User>(endpoint, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    // Update stored user data and token timestamp
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(response.data));
      // Store last successful auth check timestamp
      localStorage.setItem('auth_last_check', Date.now().toString());
    }

    return response.data;
  } catch (error: any) {
    // Log detailed error for debugging
    if (error.response?.status === 401) {
      const loginTime = localStorage.getItem('auth_login_time');
      const lastCheck = localStorage.getItem('auth_last_check');
      const sessionDuration = loginTime ? Math.round((Date.now() - parseInt(loginTime)) / 1000 / 60) : 0;
      console.warn(`Token expired after ${sessionDuration} minutes. Last check: ${lastCheck ? Math.round((Date.now() - parseInt(lastCheck)) / 1000 / 60) : 'unknown'} minutes ago`);
    }
    throw error;
  }
}

/**
 * Logout - clear stored authentication data
 */
export function logout(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('auth_login_time');
  localStorage.removeItem('auth_last_check');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

/**
 * Get stored authentication token (for backward compatibility)
 * @deprecated Use getFirebaseIdToken instead for Firebase authentication
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Get Firebase ID token for API authentication
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const { auth } = await import('@/lib/firebase');
    if (auth && auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch (error) {
    console.error('Error getting Firebase ID token:', error);
  }
  
  return null;
}

/**
 * Get stored user data
 */
export function getStoredUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Verify Firebase ID token with backend
 * This should be called after Firebase authentication on the frontend
 */
export async function verifyToken(idToken: string): Promise<AuthResponse | AuthError> {
  try {
    const endpoint = typeof window !== 'undefined' 
      ? '/api/auth/verify'
      : `${API_BASE}/auth/verify`;
    
    const response = await axios.post<AuthResponse>(endpoint, {
      id_token: idToken,
    });

    if (response.data.success && response.data.token && response.data.user) {
      // Store token and user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }

    return response.data;
  } catch (error: any) {
    const axiosError = error as AxiosError<AuthError>;
    return {
      success: false,
      message: axiosError.response?.data?.message || 'Token verification failed',
      error: axiosError.response?.data?.error,
    };
  }
}

