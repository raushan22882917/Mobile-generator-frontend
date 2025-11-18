import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration
// Can use environment variables or fallback to default config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAN5hfhAjpLOy7I9nPZiZeolFtCUT7PQ3g",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0148980288.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gen-lang-client-0148980288",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0148980288.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1098053868371",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1098053868371:web:fa27fa17ddae90f2081fa6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-2S2JEE401K",
};

// Validate Firebase configuration
const isFirebaseConfigValid = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
};

// Initialize Firebase (client-side only)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;

if (typeof window !== 'undefined') {
  // Only initialize on client side and if config is valid
  if (isFirebaseConfigValid()) {
    try {
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }
      auth = getAuth(app);
    } catch (error) {
      console.error('Firebase initialization error:', error);
      console.warn('Firebase environment variables may be missing or invalid. Please check your .env.local file.');
    }
  } else {
    console.warn('Firebase configuration is incomplete. Please set the following environment variables:');
    console.warn('- NEXT_PUBLIC_FIREBASE_API_KEY');
    console.warn('- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    console.warn('- NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    console.warn('- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    console.warn('- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
    console.warn('- NEXT_PUBLIC_FIREBASE_APP_ID');
  }
}

// Export auth (will be undefined on server-side or if config is invalid)
export { auth };
export default app;

