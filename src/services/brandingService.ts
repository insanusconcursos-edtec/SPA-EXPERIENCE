import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface BrandingConfig {
  logoUrl: string;
  useCustomLogo: boolean;
  spaName: string;
  spaSubtitle: string;
  logoMaxHeightPx: number;
  logoFit: 'contain' | 'cover';
  updatedAt?: any;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: '',
  useCustomLogo: true,
  spaName: 'Spa Experience',
  spaSubtitle: 'Dark Seduction',
  logoMaxHeightPx: 48,
  logoFit: 'contain',
};

const BRANDING_DOC_PATH = ['config', 'branding'] as const;

export async function getBrandingConfig(): Promise<BrandingConfig> {
  try {
    const docRef = doc(db, BRANDING_DOC_PATH[0], BRANDING_DOC_PATH[1]);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        ...DEFAULT_BRANDING,
        ...snap.data(),
      } as BrandingConfig;
    }
  } catch (error) {
    console.warn('Could not fetch branding config from Firestore, using default:', error);
  }
  return DEFAULT_BRANDING;
}

export async function saveBrandingConfig(config: Partial<BrandingConfig>): Promise<void> {
  const docRef = doc(db, BRANDING_DOC_PATH[0], BRANDING_DOC_PATH[1]);
  await setDoc(
    docRef,
    {
      ...config,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeBrandingConfig(onChange: (config: BrandingConfig) => void): () => void {
  const docRef = doc(db, BRANDING_DOC_PATH[0], BRANDING_DOC_PATH[1]);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onChange({
          ...DEFAULT_BRANDING,
          ...snap.data(),
        } as BrandingConfig);
      } else {
        onChange(DEFAULT_BRANDING);
      }
    },
    (err) => {
      console.warn('Error subscribing to branding config:', err);
      onChange(DEFAULT_BRANDING);
    }
  );
}
