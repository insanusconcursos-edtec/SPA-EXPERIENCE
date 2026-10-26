import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface CatalogBannerConfig {
  enabled: boolean;
  displayStyle: 'full_width' | 'boxed'; // 'full_width' (Ponta a ponta cinematográfico) ou 'boxed' (Emoldurado)
  desktopImageUrl: string;
  mobileImageUrl: string;
  tag: string;
  title: string;
  titleHighlight: string;
  description: string;
  overlayDarkness: number; // 20 a 90 (%)
  bannerHeightDesktopPx: number; // 360 a 640
  showBadges: boolean;
  badge1: string;
  badge2: string;
  badge3: string;
  ctaButtonText: string;
  ctaButtonAction: 'scroll_catalog' | 'open_login' | 'custom_link';
  ctaButtonLink?: string;
  updatedAt?: any;
}

export const DEFAULT_BANNER: CatalogBannerConfig = {
  enabled: true,
  displayStyle: 'full_width',
  desktopImageUrl: '',
  mobileImageUrl: '',
  tag: 'REFUGE DE LUXE',
  title: 'Reconecte seus sentidos',
  titleHighlight: 'AO ABSOLUTO',
  description: 'Entre em uma jornada de rejuvenescimento e relaxamento profundo, onde cada toque é executado com precisão milimétrica por nossas terapeutas altamente qualificadas.',
  overlayDarkness: 70,
  bannerHeightDesktopPx: 480,
  showBadges: true,
  badge1: 'Ambiente Climatizado',
  badge2: 'Profissionais Especializados',
  badge3: 'Experiência Sensorial Única',
  ctaButtonText: 'Explorar Terapias',
  ctaButtonAction: 'scroll_catalog',
  ctaButtonLink: '#catalog-section',
};

const BANNER_DOC_PATH = ['config', 'catalog_banner'] as const;

export async function getBannerConfig(): Promise<CatalogBannerConfig> {
  try {
    const docRef = doc(db, BANNER_DOC_PATH[0], BANNER_DOC_PATH[1]);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        ...DEFAULT_BANNER,
        ...snap.data(),
      } as CatalogBannerConfig;
    }
  } catch (error) {
    console.warn('Could not fetch banner config from Firestore, using default:', error);
  }
  return DEFAULT_BANNER;
}

export async function saveBannerConfig(config: Partial<CatalogBannerConfig>): Promise<void> {
  const docRef = doc(db, BANNER_DOC_PATH[0], BANNER_DOC_PATH[1]);
  await setDoc(
    docRef,
    {
      ...config,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeBannerConfig(onChange: (config: CatalogBannerConfig) => void): () => void {
  const docRef = doc(db, BANNER_DOC_PATH[0], BANNER_DOC_PATH[1]);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onChange({
          ...DEFAULT_BANNER,
          ...snap.data(),
        } as CatalogBannerConfig);
      } else {
        onChange(DEFAULT_BANNER);
      }
    },
    (err) => {
      console.warn('Error subscribing to banner config:', err);
      onChange(DEFAULT_BANNER);
    }
  );
}
