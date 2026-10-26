import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { BrandingConfig, DEFAULT_BRANDING, subscribeBrandingConfig } from '../services/brandingService';

interface HeaderLogoProps {
  variant?: 'full' | 'compact' | 'sidebar' | 'auth';
  customConfig?: BrandingConfig | null;
  className?: string;
  onClick?: () => void;
}

export const HeaderLogo: React.FC<HeaderLogoProps> = ({
  variant = 'full',
  customConfig = null,
  className = '',
  onClick,
}) => {
  const [branding, setBranding] = useState<BrandingConfig>(customConfig || DEFAULT_BRANDING);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (customConfig) {
      setBranding(customConfig);
      setImageError(false);
      return;
    }

    const unsubscribe = subscribeBrandingConfig((data) => {
      setBranding(data);
      setImageError(false);
    });

    return () => unsubscribe();
  }, [customConfig]);

  const hasCustomLogo = Boolean(branding.logoUrl && branding.useCustomLogo && !imageError);

  if (variant === 'sidebar') {
    return (
      <div 
        onClick={onClick}
        className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {hasCustomLogo ? (
          <img
            src={branding.logoUrl}
            alt={branding.spaName || 'Spa Logo'}
            onError={() => setImageError(true)}
            className="h-10 max-w-[180px] object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.25)] transition-all duration-300"
          />
        ) : (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-zinc-900 text-[#D4AF37] shadow-gold-premium shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-black tracking-[0.15em] uppercase text-white block leading-none">
                Spa <span className="text-[#D4AF37]">Experience</span>
              </span>
              <p className="text-[8px] font-bold tracking-[0.25em] text-zinc-600 uppercase mt-1">
                {branding.spaSubtitle || 'Painel Admin'}
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <div 
        onClick={onClick}
        className={`flex flex-col items-center text-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {hasCustomLogo ? (
          <div className="mb-4 flex items-center justify-center max-w-full">
            <img
              src={branding.logoUrl}
              alt={branding.spaName || 'Spa Logo'}
              onError={() => setImageError(true)}
              className="max-h-20 max-w-[280px] object-contain drop-shadow-[0_4px_16px_rgba(212,175,55,0.3)] transition-all duration-300"
            />
          </div>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-zinc-900 text-[#D4AF37] shadow-gold-premium mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-light tracking-[0.15em] uppercase text-white font-serif-luxury">
              Spa <span className="text-[#D4AF37]">Experience</span>
            </h2>
            <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase mt-1">
              {branding.spaSubtitle || 'Autenticação Exclusiva'}
            </p>
          </>
        )}
      </div>
    );
  }

  // Variant 'full' or 'compact' (Header Navigation)
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {hasCustomLogo ? (
        <img
          src={branding.logoUrl}
          alt={branding.spaName || 'Spa Logo'}
          onError={() => setImageError(true)}
          style={{ maxHeight: `${branding.logoMaxHeightPx || 48}px` }}
          className="w-auto object-contain max-w-[260px] sm:max-w-[320px] drop-shadow-[0_2px_10px_rgba(212,175,55,0.25)] transition-all duration-300"
        />
      ) : (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-zinc-950 text-[#D4AF37] shadow-gold-premium shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-[0.18em] uppercase text-white block leading-tight">
              Spa <span className="text-[#D4AF37]">Experience</span>
            </span>
            <p className="text-[9px] font-bold tracking-[0.25em] text-zinc-500 uppercase -mt-0.5">
              {branding.spaSubtitle || 'Dark Seduction'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
