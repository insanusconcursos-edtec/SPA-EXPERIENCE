import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const metaEnv = (import.meta as any).env || {};

export const firebaseConfig = {
  apiKey: metaEnv.NEXT_PUBLIC_FIREBASE_API_KEY || metaEnv.VITE_FIREBASE_API_KEY || 'AIzaSyAp6W9X5NDdQajhAeapbOvfi9AUeIAhY3g',
  authDomain: metaEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'spa-experience-6d012.firebaseapp.com',
  projectId: metaEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || metaEnv.VITE_FIREBASE_PROJECT_ID || 'spa-experience-6d012',
  storageBucket: metaEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'spa-experience-6d012.firebasestorage.app',
  messagingSenderId: metaEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '418814741313',
  appId: metaEnv.NEXT_PUBLIC_FIREBASE_APP_ID || metaEnv.VITE_FIREBASE_APP_ID || '1:418814741313:web:6394f8ade2f7db6dcb2fc0',
  measurementId: metaEnv.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || metaEnv.VITE_FIREBASE_MEASUREMENT_ID || 'G-PXCZ1RWC5Z',
};

// Initialize Firebase safely (Singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Database instance
export const db = getFirestore(app);

// Auth instance
export const auth = getAuth(app);

export default app;
