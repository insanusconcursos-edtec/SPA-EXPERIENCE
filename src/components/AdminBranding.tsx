import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Info, 
  Sliders, 
  Eye, 
  RotateCcw, 
  Save, 
  FileImage,
  Layers,
  HelpCircle,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  Check,
  Tag,
  Type,
  ShieldCheck,
  Star,
  ExternalLink,
  Award
} from 'lucide-react';
import { BrandingConfig, DEFAULT_BRANDING, getBrandingConfig, saveBrandingConfig } from '../services/brandingService';
import { CatalogBannerConfig, DEFAULT_BANNER, getBannerConfig, saveBannerConfig } from '../services/bannerService';
import { HeaderLogo } from './HeaderLogo';

interface AdminBrandingProps {
  initialTab?: 'logo' | 'banner';
}

export const AdminBranding: React.FC<AdminBrandingProps> = ({ initialTab = 'logo' }) => {
  const [activeTab, setActiveTab] = useState<'logo' | 'banner'>(initialTab);

  // Logo state
  const [logoConfig, setLogoConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoTestStatus, setLogoTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [logoPreviewBg, setLogoPreviewBg] = useState<'dark' | 'grid'>('dark');

  // Banner state
  const [bannerConfig, setBannerConfig] = useState<CatalogBannerConfig>(DEFAULT_BANNER);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [desktopImageStatus, setDesktopImageStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mobileImageStatus, setMobileImageStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bannerPreviewDevice, setBannerPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllConfigs();
  }, []);

  const loadAllConfigs = async () => {
    try {
      const [brandingData, bannerData] = await Promise.all([
        getBrandingConfig(),
        getBannerConfig(),
      ]);
      setLogoConfig(brandingData);
      setBannerConfig(bannerData);

      if (brandingData.logoUrl) testImageUrl(brandingData.logoUrl, setLogoTestStatus);
      if (bannerData.desktopImageUrl) testImageUrl(bannerData.desktopImageUrl, setDesktopImageStatus);
      if (bannerData.mobileImageUrl) testImageUrl(bannerData.mobileImageUrl, setMobileImageStatus);
    } catch (err) {
      console.error('Error loading branding or banner configs:', err);
    } finally {
      setLogoLoading(false);
      setBannerLoading(false);
    }
  };

  const testImageUrl = (
    url: string, 
    setStatus: React.Dispatch<React.SetStateAction<'idle' | 'loading' | 'success' | 'error'>>
  ) => {
    if (!url || !url.trim()) {
      setStatus('idle');
      return;
    }
    setStatus('loading');
    const img = new Image();
    img.onload = () => setStatus('success');
    img.onerror = () => setStatus('error');
    img.src = url;
  };

  // --- LOGO HANDLERS ---
  const handleLogoUrlChange = (newUrl: string) => {
    setLogoConfig((prev) => ({ ...prev, logoUrl: newUrl }));
    testImageUrl(newUrl, setLogoTestStatus);
  };

  const handleSaveLogo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLogoSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await saveBrandingConfig(logoConfig);
      setSuccessMessage('Logo e identidade visual salvas com sucesso no Firebase!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error saving branding config:', err);
      setErrorMessage(err.message || 'Erro ao salvar a logo.');
    } finally {
      setLogoSaving(false);
    }
  };

  const handleResetLogo = async () => {
    if (window.confirm('Deseja realmente restaurar a logo padrão do Spa Experience?')) {
      setLogoConfig(DEFAULT_BRANDING);
      setLogoTestStatus('idle');
      setLogoSaving(true);
      try {
        await saveBrandingConfig(DEFAULT_BRANDING);
        setSuccessMessage('Logo padrão restaurada com sucesso!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } catch (err: any) {
        setErrorMessage('Erro ao restaurar a logo.');
      } finally {
        setLogoSaving(false);
      }
    }
  };

  // --- BANNER HANDLERS ---
  const handleDesktopBannerUrlChange = (newUrl: string) => {
    setBannerConfig((prev) => ({ ...prev, desktopImageUrl: newUrl }));
    testImageUrl(newUrl, setDesktopImageStatus);
  };

  const handleMobileBannerUrlChange = (newUrl: string) => {
    setBannerConfig((prev) => ({ ...prev, mobileImageUrl: newUrl }));
    testImageUrl(newUrl, setMobileImageStatus);
  };

  const handleSaveBanner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBannerSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await saveBannerConfig(bannerConfig);
      setSuccessMessage('Banner de apresentação do catálogo salvo com sucesso no Firebase!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error saving banner config:', err);
      setErrorMessage(err.message || 'Erro ao salvar as configurações do banner.');
    } finally {
      setBannerSaving(false);
    }
  };

  const handleResetBanner = async () => {
    if (window.confirm('Deseja restaurar as configurações originais do banner do catálogo?')) {
      setBannerConfig(DEFAULT_BANNER);
      setDesktopImageStatus('idle');
      setMobileImageStatus('idle');
      setBannerSaving(true);
      try {
        await saveBannerConfig(DEFAULT_BANNER);
        setSuccessMessage('Banner padrão restaurado com sucesso!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } catch (err: any) {
        setErrorMessage('Erro ao restaurar o banner.');
      } finally {
        setBannerSaving(false);
      }
    }
  };

  const isLoading = logoLoading || bannerLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[#D4AF37]" />
        <span className="ml-2 text-xs uppercase tracking-widest text-zinc-400">Carregando configurações visuais...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
              Personalização Visual & Marca
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-wider mt-2 font-serif-luxury">
            Identidade & <span className="text-[#D4AF37]">Banners do Spa</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Configure a logo oficial do Spa Dark Seduction e o banner de apresentação do catálogo com dimensões sob medida para Desktop e Mobile.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          {activeTab === 'logo' ? (
            <>
              <button
                type="button"
                onClick={handleResetLogo}
                disabled={logoSaving}
                className="px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restaurar Logo</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveLogo()}
                disabled={logoSaving}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-[#D4AF37]/20 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
              >
                {logoSaving ? <RefreshCw className="h-4 w-4 animate-spin text-black" /> : <Save className="h-4 w-4" />}
                <span>Salvar Logo</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetBanner}
                disabled={bannerSaving}
                className="px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restaurar Banner</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveBanner()}
                disabled={bannerSaving}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-[#D4AF37]/20 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
              >
                {bannerSaving ? <RefreshCw className="h-4 w-4 animate-spin text-black" /> : <Save className="h-4 w-4" />}
                <span>Salvar Banner</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-900 gap-2">
        <button
          onClick={() => setActiveTab('banner')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 border-b-2 transition-all duration-300 ${
            activeTab === 'banner'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-zinc-900/50'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>Banner de Apresentação (Catálogo)</span>
          {bannerConfig.desktopImageUrl && (
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('logo')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 border-b-2 transition-all duration-300 ${
            activeTab === 'logo'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-zinc-900/50'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Logo do Spa (Cabeçalho & Menu)</span>
          {logoConfig.logoUrl && (
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: BANNER DO CATÁLOGO                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'banner' && (
        <div className="space-y-8">
          {/* BANNER SPECIFICATIONS & ADVICE BOX */}
          <div className="rounded-xl border border-[#D4AF37]/40 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 shadow-gold-glow">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <FileImage className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Guia Técnico: Dimensões em Pixels e Como Adaptar o Banner</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Respostas às suas perguntas sobre proporções, formato ponta a ponta e adaptação Mobile / Desktop:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              {/* Desktop Dimension Card */}
              <div className="p-4 rounded-xl bg-black/70 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-[#D4AF37]">
                  <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Monitor className="h-4 w-4" /> 1. Versão Desktop (PC / Notebook)
                  </span>
                  <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded font-mono font-bold">16:5</span>
                </div>
                <div className="text-zinc-200 font-mono text-[11px] space-y-1 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-850">
                  <p>• Resolução Ideal: <strong className="text-white">1920 × 600 px</strong></p>
                  <p>• Resolução Mínima: <strong className="text-zinc-300">1440 × 480 px</strong></p>
                  <p>• Proporção: <strong className="text-[#D4AF37]">3.2:1 (Widescreen Panorâmico)</strong></p>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-300">Dica de enquadramento:</strong> Mantenha o elemento visual principal (vela, terapeuta, modelo) do centro para a direita, pois os títulos de boas-vindas ficam posicionados à esquerda.
                </p>
              </div>

              {/* Mobile Dimension Card */}
              <div className="p-4 rounded-xl bg-black/70 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-[#D4AF37]">
                  <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4" /> 2. Versão Mobile (Smartphones)
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">DESACOPLADO</span>
                </div>
                <div className="text-zinc-200 font-mono text-[11px] space-y-1 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-850">
                  <p>• Formato Retrato: <strong className="text-white">750 × 1000 px</strong> (3:4)</p>
                  <p>• Formato Quadrado: <strong className="text-white">800 × 800 px</strong> (1:1)</p>
                  <p>• Layout Mobile: <strong className="text-[#D4AF37]">Foto no topo + Textos abaixo</strong></p>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-300">Sem sobreposições no celular:</strong> A imagem mobile fica posicionada no topo com degradê suave para o fundo preto, e todos os textos e botões ficam logo abaixo, valorizando a foto da terapeuta/spa sem nenhum elemento na frente!
                </p>
              </div>

              {/* Ponta a Ponta Recommendation */}
              <div className="p-4 rounded-xl bg-black/70 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-[#D4AF37]">
                  <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Layers className="h-4 w-4" /> 3. Sugestão: Ponta a Ponta?
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">RECOMENDADO</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  <strong className="text-white">Sim, deve ser ponta a ponta (Full-Bleed)!</strong> Spas de alto luxo utilizam o banner sangrado até as bordas da tela para gerar um impacto cinematográfico imediato.
                </p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Para não haver corte brusco com o fundo preto, nosso sistema aplica automaticamente um degradê suave que funde o banner com o catálogo abaixo. Você também pode alternar para o modo "Emoldurado" com 1 clique abaixo.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Banner Form Settings */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleSaveBanner} className="space-y-6">
                
                {/* 1. Ativação e Estilo de Exibição */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#D4AF37]" />
                    <span>Exibição e Modo de Layout</span>
                  </h3>

                  {/* Toggle Banner Active */}
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 block">
                        Ativar Banner no Catálogo
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Exibe o banner fotográfico no topo da página de serviços para todos os clientes.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bannerConfig.enabled}
                        onChange={(e) => setBannerConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                    </label>
                  </div>

                  {/* Style Selector: Full Width vs Boxed */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
                      Estilo do Banner (Como ele se adapta à tela)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBannerConfig((prev) => ({ ...prev, displayStyle: 'full_width' }))}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                          bannerConfig.displayStyle === 'full_width'
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white shadow-gold-sm'
                            : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Maximize2 className={`h-4 w-4 ${bannerConfig.displayStyle === 'full_width' ? 'text-[#D4AF37]' : 'text-zinc-500'}`} />
                          {bannerConfig.displayStyle === 'full_width' && (
                            <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                          )}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-white block">
                          Ponta a Ponta (Full Bleed)
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                          (Recomendado) Ocupa toda a largura da tela com degradê suave.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBannerConfig((prev) => ({ ...prev, displayStyle: 'boxed' }))}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                          bannerConfig.displayStyle === 'boxed'
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white shadow-gold-sm'
                            : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Minimize2 className={`h-4 w-4 ${bannerConfig.displayStyle === 'boxed' ? 'text-[#D4AF37]' : 'text-zinc-500'}`} />
                          {bannerConfig.displayStyle === 'boxed' && (
                            <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                          )}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-white block">
                          Emoldurado (Boxed Card)
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                          Alinhado com a largura do catálogo, com bordas arredondadas.
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Links das Imagens (Desktop & Mobile) */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[#D4AF37]" />
                    <span>Links das Imagens do Banner</span>
                  </h3>

                  {/* Desktop Banner URL */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 text-[#D4AF37]" />
                        <span>Link da Imagem Desktop (1920 × 600 px)</span>
                      </label>
                      {desktopImageStatus === 'success' && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Imagem Ativa
                        </span>
                      )}
                      {desktopImageStatus === 'error' && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Link Inválido
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://exemplo.com/banner-spa-desktop-1920x600.jpg"
                        value={bannerConfig.desktopImageUrl}
                        onChange={(e) => handleDesktopBannerUrlChange(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      />
                      {bannerConfig.desktopImageUrl && (
                        <button
                          type="button"
                          onClick={() => handleDesktopBannerUrlChange('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Cole a URL direta da imagem (Imgur, Postimages, Google Cloud, AWS ou seu servidor).
                    </p>
                  </div>

                  {/* Mobile Banner URL (Optional) */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-[#D4AF37]" />
                        <span>Link da Imagem Mobile (Opcional - 800 × 800 px)</span>
                      </label>
                      {mobileImageStatus === 'success' && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Imagem Ativa
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://exemplo.com/banner-spa-mobile-800x800.jpg"
                        value={bannerConfig.mobileImageUrl || ''}
                        onChange={(e) => handleMobileBannerUrlChange(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      />
                      {bannerConfig.mobileImageUrl && (
                        <button
                          type="button"
                          onClick={() => handleMobileBannerUrlChange('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Se deixar em branco, o sistema utilizará a imagem Desktop com corte inteligente centralizado no smartphone.
                    </p>
                  </div>

                  {/* Contrast Overlay Slider & Height Slider */}
                  <div className="pt-3 border-t border-zinc-900 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Escurecimento de Contraste (Legibilidade do Texto):</span>
                        <span className="font-mono text-[#D4AF37] font-bold">{bannerConfig.overlayDarkness}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="90"
                        step="5"
                        value={bannerConfig.overlayDarkness}
                        onChange={(e) => setBannerConfig((prev) => ({ ...prev, overlayDarkness: Number(e.target.value) }))}
                        className="w-full accent-[#D4AF37] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
                        <span>20% (Mais Claro)</span>
                        <span>70% (Equilíbrio Perfeito)</span>
                        <span>90% (Mais Escuro)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Altura do Banner no Desktop:</span>
                        <span className="font-mono text-[#D4AF37] font-bold">{bannerConfig.bannerHeightDesktopPx || 480}px</span>
                      </div>
                      <input
                        type="range"
                        min="380"
                        max="620"
                        step="20"
                        value={bannerConfig.bannerHeightDesktopPx || 480}
                        onChange={(e) => setBannerConfig((prev) => ({ ...prev, bannerHeightDesktopPx: Number(e.target.value) }))}
                        className="w-full accent-[#D4AF37] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Textos e Conteúdo do Banner */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                    <Type className="h-4 w-4 text-[#D4AF37]" />
                    <span>Títulos, Textos e Badges</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Selo Superior (Tag)
                      </label>
                      <input
                        type="text"
                        value={bannerConfig.tag}
                        onChange={(e) => setBannerConfig((prev) => ({ ...prev, tag: e.target.value }))}
                        placeholder="REFUGE DE LUXE"
                        className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Texto de Ação (Botão)
                      </label>
                      <input
                        type="text"
                        value={bannerConfig.ctaButtonText || ''}
                        onChange={(e) => setBannerConfig((prev) => ({ ...prev, ctaButtonText: e.target.value }))}
                        placeholder="Explorar Terapias"
                        className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Título Principal
                      </label>
                      <input
                        type="text"
                        value={bannerConfig.title}
                        onChange={(e) => setBannerConfig((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Reconecte seus sentidos"
                        className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Palavra em Destaque Dourado
                      </label>
                      <input
                        type="text"
                        value={bannerConfig.titleHighlight}
                        onChange={(e) => setBannerConfig((prev) => ({ ...prev, titleHighlight: e.target.value }))}
                        placeholder="AO ABSOLUTO"
                        className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-amber-400 font-bold focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Descrição de Apresentação
                    </label>
                    <textarea
                      rows={3}
                      value={bannerConfig.description}
                      onChange={(e) => setBannerConfig((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Entre em uma jornada de relaxamento profundo..."
                      className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-300 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  {/* Badges */}
                  <div className="pt-2 border-t border-zinc-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Badges de Diferenciais Sensoriais
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bannerConfig.showBadges}
                          onChange={(e) => setBannerConfig((prev) => ({ ...prev, showBadges: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                      </label>
                    </div>

                    {bannerConfig.showBadges && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={bannerConfig.badge1}
                          onChange={(e) => setBannerConfig((prev) => ({ ...prev, badge1: e.target.value }))}
                          placeholder="Ambiente Climatizado"
                          className="rounded-lg border border-zinc-850 bg-black px-3 py-1.5 text-[11px] text-zinc-300 focus:border-[#D4AF37] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={bannerConfig.badge2}
                          onChange={(e) => setBannerConfig((prev) => ({ ...prev, badge2: e.target.value }))}
                          placeholder="Profissionais Especializados"
                          className="rounded-lg border border-zinc-850 bg-black px-3 py-1.5 text-[11px] text-zinc-300 focus:border-[#D4AF37] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={bannerConfig.badge3}
                          onChange={(e) => setBannerConfig((prev) => ({ ...prev, badge3: e.target.value }))}
                          placeholder="Experiência Sensorial Única"
                          className="rounded-lg border border-zinc-850 bg-black px-3 py-1.5 text-[11px] text-zinc-300 focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column: Live Interactive Device Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[#D4AF37]" />
                    <span>Pré-visualização do Banner</span>
                  </h3>

                  {/* Switch Desktop vs Mobile preview */}
                  <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setBannerPreviewDevice('desktop')}
                      className={`px-2.5 py-1 rounded font-bold uppercase flex items-center gap-1.5 transition-all ${
                        bannerPreviewDevice === 'desktop' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Monitor className="h-3 w-3" />
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerPreviewDevice('mobile')}
                      className={`px-2.5 py-1 rounded font-bold uppercase flex items-center gap-1.5 transition-all ${
                        bannerPreviewDevice === 'mobile' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="h-3 w-3" />
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-900 pb-3">
                  <span className="flex items-center gap-1.5">
                    Modo atual: <strong className="text-white">{bannerConfig.displayStyle === 'full_width' ? 'Ponta a Ponta' : 'Emoldurado'}</strong>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bannerConfig.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {bannerConfig.enabled ? 'Ativo' : 'Oculto'}
                  </span>
                </div>

                {/* PREVIEW CONTAINER */}
                {bannerPreviewDevice === 'desktop' ? (
                  /* DESKTOP SIMULATOR */
                  <div className="w-full rounded-xl border border-zinc-800 bg-black overflow-hidden relative shadow-2xl">
                    <div className="h-6 bg-zinc-900 border-b border-zinc-800 px-3 flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-500/60" />
                      <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
                      <div className="h-2 w-2 rounded-full bg-green-500/60" />
                      <span className="ml-2 text-[9px] text-zinc-500 font-mono truncate">spa-experience.com (Desktop Widescreen)</span>
                    </div>

                    <div className={`relative ${bannerConfig.displayStyle === 'boxed' ? 'p-3 bg-zinc-950' : 'bg-black'}`}>
                      <div 
                        className={`relative overflow-hidden ${
                          bannerConfig.displayStyle === 'boxed' 
                            ? 'rounded-xl border border-zinc-800 min-h-[220px]' 
                            : 'min-h-[240px]'
                        }`}
                      >
                        {/* Background Image */}
                        {bannerConfig.desktopImageUrl ? (
                          <img
                            src={bannerConfig.desktopImageUrl}
                            alt="Banner Desktop"
                            className="absolute inset-0 w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-950 to-black">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(212,175,55,0.05)_0%,transparent_70%)]" />
                          </div>
                        )}

                        {/* Dark Gradient Overlay */}
                        <div 
                          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                          style={{
                            background: `linear-gradient(to right, rgba(0,0,0,${bannerConfig.overlayDarkness / 100}) 0%, rgba(0,0,0,${bannerConfig.overlayDarkness / 130}) 60%, rgba(0,0,0,0.3) 100%)`,
                          }}
                        />
                        {/* Bottom vignette */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none" />

                        {/* Content */}
                        <div className="relative z-10 p-5 max-w-sm">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
                            <Award className="h-3 w-3" /> {bannerConfig.tag || 'REFUGE DE LUXE'}
                          </span>
                          <h4 className="mt-1.5 text-base sm:text-lg font-light tracking-wide text-white leading-tight font-serif-luxury italic">
                            {bannerConfig.title || 'Reconecte seus sentidos'} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] font-normal not-italic">
                              {bannerConfig.titleHighlight || 'AO ABSOLUTO'}
                            </span>
                          </h4>
                          <p className="mt-2 text-[10px] text-zinc-300 line-clamp-2 leading-relaxed">
                            {bannerConfig.description}
                          </p>
                          {bannerConfig.ctaButtonText && (
                            <button
                              type="button"
                              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] text-black text-[9px] font-bold uppercase tracking-wider shadow-sm"
                            >
                              <span>{bannerConfig.ctaButtonText}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MOBILE SIMULATOR - Image on top with degradê, content below */
                  <div className="w-[280px] mx-auto rounded-3xl border-4 border-zinc-800 bg-black overflow-hidden relative shadow-2xl">
                    {/* Notch & Header */}
                    <div className="h-5 bg-zinc-900 flex justify-center items-center">
                      <div className="w-16 h-2 rounded-full bg-zinc-800" />
                    </div>

                    {/* Scrollable phone viewport */}
                    <div className="max-h-[520px] overflow-y-auto bg-black scrollbar-thin">
                      {/* 1. Mobile Banner Image Top Container with Degradê to Pure Black */}
                      <div className="relative w-full aspect-[4/5] overflow-hidden bg-zinc-950">
                        {(bannerConfig.mobileImageUrl || bannerConfig.desktopImageUrl) ? (
                          <img
                            src={bannerConfig.mobileImageUrl || bannerConfig.desktopImageUrl}
                            alt="Banner Mobile"
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-zinc-600 text-xs">
                            Sem imagem mobile
                          </div>
                        )}

                        {/* Efeito degradê suave para o preto na base da imagem */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
                      </div>

                      {/* 2. Informações cadastradas posicionadas ABAIXO da imagem (fundo preto sólido) */}
                      <div className="p-4 space-y-3 bg-black">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
                            <Award className="h-2.5 w-2.5" /> {bannerConfig.tag || 'REFUGE DE LUXE'}
                          </span>
                          <span className="text-[7px] text-[#D4AF37]/80 uppercase tracking-wider bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
                            Mobile Livre
                          </span>
                        </div>

                        <h4 className="text-sm font-light text-white leading-tight font-serif-luxury italic">
                          {bannerConfig.title || 'Reconecte seus sentidos'} <br />
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] font-normal not-italic">
                            {bannerConfig.titleHighlight || 'AO ABSOLUTO'}
                          </span>
                        </h4>

                        <p className="text-[9px] text-zinc-300 leading-relaxed">
                          {bannerConfig.description}
                        </p>

                        {bannerConfig.showBadges && (
                          <div className="space-y-1.5 pt-1">
                            {bannerConfig.badge1 && (
                              <div className="flex items-center gap-1.5 bg-zinc-900/90 px-2 py-1.5 rounded border border-zinc-800 text-[8px] text-zinc-300">
                                <ShieldCheck className="h-3 w-3 text-[#D4AF37] flex-shrink-0" />
                                <span>{bannerConfig.badge1}</span>
                              </div>
                            )}
                            {bannerConfig.badge2 && (
                              <div className="flex items-center gap-1.5 bg-zinc-900/90 px-2 py-1.5 rounded border border-zinc-800 text-[8px] text-zinc-300">
                                <Star className="h-3 w-3 text-[#D4AF37] fill-[#D4AF37] flex-shrink-0" />
                                <span>{bannerConfig.badge2}</span>
                              </div>
                            )}
                            {bannerConfig.badge3 && (
                              <div className="flex items-center gap-1.5 bg-zinc-900/90 px-2 py-1.5 rounded border border-zinc-800 text-[8px] text-zinc-300">
                                <Sparkles className="h-3 w-3 text-[#D4AF37] flex-shrink-0" />
                                <span>{bannerConfig.badge3}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {bannerConfig.ctaButtonText && (
                          <div className="pt-2">
                            <span className="w-full text-center block px-3 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] text-black text-[9px] font-bold uppercase tracking-wider shadow-sm">
                              {bannerConfig.ctaButtonText}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Home bar */}
                    <div className="h-4 bg-black flex justify-center items-center">
                      <div className="w-20 h-1 rounded-full bg-zinc-700" />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-zinc-500 text-center">
                  💡 As atualizações entram em vigor em tempo real para os visitantes do catálogo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LOGO DO SPA (CABEÇALHO)                                            */}
      {/* ========================================================================= */}
      {activeTab === 'logo' && (
        <div className="space-y-8">
          {/* Recommended Pixel Specifications Box */}
          <div className="rounded-xl border border-[#D4AF37]/30 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-black p-6 shadow-gold-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <FileImage className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Guia & Especificações Recomendadas de Tamanho da Logo (Pixels)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Para garantir nitidez perfeita no cabeçalho superior e no menu do painel admin:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-black/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-[#D4AF37] font-bold uppercase tracking-wider text-[11px]">
                  <Layers className="h-4 w-4" />
                  <span>1. Logo Horizontal (Ideal)</span>
                </div>
                <p className="text-zinc-300 font-mono text-[11px] font-bold">
                  • Largura: <span className="text-white">400px</span> até <span className="text-white">600px</span>
                  <br />
                  • Altura: <span className="text-white">100px</span> até <span className="text-white">150px</span>
                  <br />
                  • Proporção: <span className="text-[#D4AF37]">4:1</span> (Horizontal)
                </p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Formato ideal para a barra de navegação superior do catálogo.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-black/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-[#D4AF37] font-bold uppercase tracking-wider text-[11px]">
                  <Sparkles className="h-4 w-4" />
                  <span>2. Logo Quadrada / Emblema</span>
                </div>
                <p className="text-zinc-300 font-mono text-[11px] font-bold">
                  • Resolução: <span className="text-white">512px × 512px</span>
                  <br />
                  • Proporção: <span className="text-[#D4AF37]">1:1</span> (Quadrada)
                </p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Ideal para selos ou monogramas redondos/quadrados.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-black/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-[#D4AF37] font-bold uppercase tracking-wider text-[11px]">
                  <Info className="h-4 w-4" />
                  <span>3. Formato do Arquivo</span>
                </div>
                <p className="text-zinc-300 font-mono text-[11px] font-bold">
                  • Formato: <span className="text-white">PNG</span> (fundo transparente) ou <span className="text-white">SVG</span>
                  <br />
                  • Peso ideal: <span className="text-white">&lt; 1 MB</span>
                </p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Fundo transparente evita caixas brancas indesejadas no tema escuro.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleSaveLogo} className="space-y-6">
                {/* Logo Image URL Field */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-[#D4AF37]" />
                      <span>Link da Imagem da Logo (URL Direct)</span>
                    </label>

                    {logoTestStatus === 'success' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Imagem Carregada
                      </span>
                    )}
                    {logoTestStatus === 'error' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> URL Inválida
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://exemplo.com/minha-logo-spa.png"
                      value={logoConfig.logoUrl}
                      onChange={(e) => handleLogoUrlChange(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-xs text-white placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all"
                    />
                    {logoConfig.logoUrl && (
                      <button
                        type="button"
                        onClick={() => handleLogoUrlChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold px-1.5 py-0.5"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    Você pode hospedar a imagem em serviços como Imgur, Postimages, AWS S3, Google Cloud ou utilizar links públicos diretos terminados em <span className="text-zinc-300 font-mono">.png</span>, <span className="text-zinc-300 font-mono">.jpg</span> ou <span className="text-zinc-300 font-mono">.svg</span>.
                  </p>

                  {/* Toggle Custom Logo vs Vector */}
                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 block">
                        Exibir Logo de Imagem
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Quando ativo, a imagem enviada substitui o vetor e o texto padrão no topo.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={logoConfig.useCustomLogo}
                        onChange={(e) => setLogoConfig((prev) => ({ ...prev, useCustomLogo: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                    </label>
                  </div>
                </div>

                {/* Layout Adjustments */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#D4AF37]" />
                    <span>Ajustes Finos de Exibição</span>
                  </h3>

                  {/* Height Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Altura Máxima da Logo no Cabeçalho:</span>
                      <span className="font-mono text-[#D4AF37] font-bold">{logoConfig.logoMaxHeightPx || 48}px</span>
                    </div>
                    <input
                      type="range"
                      min="28"
                      max="80"
                      step="2"
                      value={logoConfig.logoMaxHeightPx || 48}
                      onChange={(e) => setLogoConfig((prev) => ({ ...prev, logoMaxHeightPx: Number(e.target.value) }))}
                      className="w-full accent-[#D4AF37] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
                      <span>28px (Compacta)</span>
                      <span>48px (Padrão)</span>
                      <span>80px (Expandida)</span>
                    </div>
                  </div>

                  {/* Subtitle adjustment */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Subtítulo Secundário (Fallback)
                    </label>
                    <input
                      type="text"
                      value={logoConfig.spaSubtitle}
                      onChange={(e) => setLogoConfig((prev) => ({ ...prev, spaSubtitle: e.target.value }))}
                      placeholder="Dark Seduction"
                      className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column: Live Header Preview Box */}
            <div className="lg:col-span-5 space-y-6">
              <div className="sticky top-6 rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[#D4AF37]" />
                    <span>Pré-visualização da Logo</span>
                  </h3>

                  <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setLogoPreviewBg('dark')}
                      className={`px-2 py-1 rounded font-bold uppercase transition-all ${
                        logoPreviewBg === 'dark' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoPreviewBg('grid')}
                      className={`px-2 py-1 rounded font-bold uppercase transition-all ${
                        logoPreviewBg === 'grid' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Xadrez (PNG)
                    </button>
                  </div>
                </div>

                {/* Catalog Top Header Mockup */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    1. Cabeçalho Superior do Catálogo:
                  </span>
                  <div
                    className={`w-full rounded-xl border border-zinc-800 px-4 py-3 flex items-center justify-between transition-all duration-300 ${
                      logoPreviewBg === 'dark'
                        ? 'bg-black/90'
                        : 'bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:8px_8px] bg-zinc-900'
                    }`}
                  >
                    <HeaderLogo variant="full" customConfig={logoConfig} />
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-lg border border-[#D4AF37]/30 bg-zinc-950 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider">
                        Login / Entrar
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Sidebar Header Mockup */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    2. Topo do Painel Admin (Menu Lateral):
                  </span>
                  <div
                    className={`w-full rounded-xl border border-zinc-800 px-4 py-3 flex items-center transition-all duration-300 ${
                      logoPreviewBg === 'dark' ? 'bg-zinc-950' : 'bg-zinc-900'
                    }`}
                  >
                    <HeaderLogo variant="sidebar" customConfig={logoConfig} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
