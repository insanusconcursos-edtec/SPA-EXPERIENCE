import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service, Therapist, Appointment } from '../types';
import { ServiceCard } from './ServiceCard';
import { ServiceModal } from './ServiceModal';
import { BookingWizard } from './BookingWizard';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { Sparkles, LogIn, LogOut, User, Compass, Calendar, Award, ShieldCheck, Star, Loader2, RefreshCw, Clock, X, AlertCircle } from 'lucide-react';

import { ensureDatabaseSeeded, DEFAULT_SERVICES, DEFAULT_THERAPISTS } from '../services/dbSeeder';
import { HeaderLogo } from './HeaderLogo';
import { CatalogBannerConfig, DEFAULT_BANNER, subscribeBannerConfig } from '../services/bannerService';

export const ServiceCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('todos');

  // Presentation Banner State (Syncs in Realtime from Firestore)
  const [bannerConfig, setBannerConfig] = useState<CatalogBannerConfig>(DEFAULT_BANNER);

  // Authentication & Permissões (RBAC) States
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'therapist' | 'client' | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Client Appointments States
  const [isClientAppointmentsOpen, setIsClientAppointmentsOpen] = useState(false);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);

  // Dynamic States from Firestore
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Client Booking Wizard Trigger States
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);
  const [wizardService, setWizardService] = useState<Service | null>(null);

  // Escuta Ativa de Sessão no Catálogo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(true);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data?.role || 'client');
            setUserName(data?.name || user.displayName || 'Cliente');
          } else {
            setUserRole('client');
            setUserName(user.displayName || 'Cliente');
          }
        } catch (err) {
          console.error('Error fetching user data for header:', err);
          setUserRole('client');
          setUserName('Cliente');
        }
      } else {
        setUserRole(null);
        setUserName(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Close client appointments if open
      setIsClientAppointmentsOpen(false);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const fetchClientAppointments = async () => {
    if (!auth.currentUser) return;
    try {
      setIsAppointmentsLoading(true);
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, where('clientId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetched: Appointment[] = [];
      querySnapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
      });
      // Sort by date descending
      fetched.sort((a, b) => b.date.localeCompare(a.date));
      setClientAppointments(fetched);
    } catch (err) {
      console.error('Error fetching client appointments:', err);
    } finally {
      setIsAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    if (isClientAppointmentsOpen && currentUser) {
      fetchClientAppointments();
    }
  }, [isClientAppointmentsOpen, currentUser]);

  const mockServices = DEFAULT_SERVICES;
  const mockTherapists = DEFAULT_THERAPISTS;

  // Fetch dynamic catalog data from Firestore
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setIsDataLoading(true);
        const seeded = await ensureDatabaseSeeded();

        const activeSrvs = seeded.services.filter(s => s.isActive);
        setServices(activeSrvs.length > 0 ? activeSrvs : DEFAULT_SERVICES);

        const activeThs = seeded.therapists.filter(t => t.isActive);
        setTherapists(activeThs.length > 0 ? activeThs : DEFAULT_THERAPISTS);

      } catch (err: any) {
        console.warn('Utilizando catálogo padrão do Spa (Firestore offline ou sincronização de regras):', err?.message || err);
        setServices(DEFAULT_SERVICES);
        setTherapists(DEFAULT_THERAPISTS);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  // Realtime Subscription to Presentation Banner Configuration
  useEffect(() => {
    const unsubscribeBanner = subscribeBannerConfig((newConfig) => {
      setBannerConfig(newConfig);
    });
    return () => unsubscribeBanner();
  }, []);

  const categories = [
    { id: 'todos', label: 'Todos os Serviços' },
    { id: 'relaxamento', label: 'Relaxamento' },
    { id: 'terapeuticas', label: 'Terapêuticas' }
  ];

  // Filter based on selected category
  const filteredServices = services.filter(service => {
    if (activeCategory === 'todos') return true;
    if (activeCategory === 'relaxamento') {
      return ['massage-relaxante', 'massage-pedras-quentes'].includes(service.id);
    }
    if (activeCategory === 'terapeuticas') {
      return ['massage-deep-tissue', 'massage-shiatsu'].includes(service.id);
    }
    return true;
  });

  return (
    <div id="catalog-root" className="min-h-screen bg-black text-zinc-100 selection:bg-[#D4AF37] selection:text-black">
      {/* Cinematic Golden Ambient Glow at Top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Header section */}
      <header id="catalog-header" className="relative z-10 border-b border-zinc-900/60 bg-black/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-20 items-center justify-between">
          {/* Brand Logo */}
          <HeaderLogo variant="full" onClick={() => navigate('/')} className="cursor-pointer" />

          {/* Action Login/Profile Trigger */}
          <div className="flex items-center gap-4">
            {isAuthLoading ? (
              <div className="flex h-8 w-8 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
              </div>
            ) : !currentUser ? (
              /* Scenario 1: Deslogado */
              <button
                id="header-login-btn"
                onClick={() => navigate('/auth')}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/30 bg-zinc-950/60 hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37] transition-all duration-300 shadow-md hover:shadow-[#D4AF37]/20 active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" />
                <span>Login / Entrar</span>
              </button>
            ) : userRole === 'admin' ? (
              /* Scenario 2: Logado como Admin */
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Modo Administrador
                </span>
                <button
                  onClick={() => navigate('/admin/servicos')}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-all duration-300 shadow-md hover:shadow-[#D4AF37]/20 active:scale-[0.98]"
                >
                  <span>Painel Admin</span>
                  <LogIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider px-2 py-2 transition-colors flex items-center gap-1.5"
                  title="Sair"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Sair</span>
                </button>
              </div>
            ) : userRole === 'therapist' ? (
              /* Scenario 4: Logado como Terapeuta */
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                  Modo Massoterapeuta
                </span>
                <button
                  onClick={() => navigate('/portal')}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-all duration-300 shadow-md hover:shadow-[#D4AF37]/20 active:scale-[0.98]"
                >
                  <span>Portal Terapeuta</span>
                  <LogIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider px-2 py-2 transition-colors flex items-center gap-1.5"
                  title="Sair"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Sair</span>
                </button>
              </div>
            ) : (
              /* Scenario 3: Logado como Cliente */
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsClientAppointmentsOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/30 bg-zinc-950/60 hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37] transition-all duration-300 shadow-md hover:shadow-[#D4AF37]/20 active:scale-[0.98]"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Meus Agendamentos</span>
                </button>
                <div className="flex items-center gap-2 border-l border-zinc-900 pl-3">
                  <div className="h-8 w-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] font-extrabold text-[#D4AF37] uppercase">
                    {userName ? userName.slice(0, 2) : 'CL'}
                  </div>
                  <span className="hidden md:inline text-xs font-bold text-zinc-300 max-w-[100px] truncate">
                    {userName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-zinc-600 hover:text-red-400 p-1.5 transition-colors"
                    title="Encerrar Sessão"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {isDataLoading ? (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-zinc-400 gap-3 relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sincronizando vitrine de luxo...</span>
        </div>
      ) : (
        <>
          {/* Billboard Hero Presentation Banner - Full Width Mode (Edge-to-Edge) */}
          {bannerConfig.enabled && bannerConfig.displayStyle === 'full_width' && (
            <section 
              id="billboard-hero" 
              className="w-full border-b border-zinc-900 overflow-hidden bg-black"
            >
              {/* VERSÃO MOBILE (< 768px): Imagem no topo livre com degradê para preto, e informações abaixo */}
              <div className="block md:hidden w-full">
                {/* 1. Imagem do Banner Mobile no topo */}
                <div className="relative w-full aspect-[4/5] max-h-[460px] overflow-hidden bg-black">
                  {(bannerConfig.mobileImageUrl || bannerConfig.desktopImageUrl) ? (
                    <img
                      src={bannerConfig.mobileImageUrl || bannerConfig.desktopImageUrl}
                      alt={bannerConfig.title || 'Banner Spa Experience'}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black" />
                  )}

                  {/* Degradê suave para o preto na base da imagem */}
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                  {/* Sombra suave no topo */}
                  <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
                </div>

                {/* 2. Informações cadastradas posicionadas ABAIXO da imagem em fundo preto */}
                <div className="px-5 pt-2 pb-10 bg-black">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
                      <Award className="h-4 w-4" /> {bannerConfig.tag || 'REFUGE DE LUXE'}
                    </span>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => navigate('/admin/banner')}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider transition-all shadow-md"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Editar Banner</span>
                      </button>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-white leading-tight font-serif-luxury italic">
                    {bannerConfig.title || 'Reconecte seus sentidos'} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] font-normal not-italic">
                      {bannerConfig.titleHighlight || 'AO ABSOLUTO'}
                    </span>
                  </h1>

                  <p className="mt-3.5 text-sm text-zinc-300 font-medium leading-relaxed">
                    {bannerConfig.description}
                  </p>

                  {bannerConfig.showBadges && (
                    <div className="mt-5 flex flex-col gap-2.5 text-xs font-bold text-zinc-300">
                      {bannerConfig.badge1 && (
                        <div className="flex items-center gap-2 bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800/80">
                          <ShieldCheck className="h-4 w-4 text-[#D4AF37] flex-shrink-0" />
                          <span>{bannerConfig.badge1}</span>
                        </div>
                      )}
                      {bannerConfig.badge2 && (
                        <div className="flex items-center gap-2 bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800/80">
                          <Star className="h-4 w-4 text-[#D4AF37] fill-[#D4AF37] flex-shrink-0" />
                          <span>{bannerConfig.badge2}</span>
                        </div>
                      )}
                      {bannerConfig.badge3 && (
                        <div className="flex items-center gap-2 bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800/80">
                          <Sparkles className="h-4 w-4 text-[#D4AF37] flex-shrink-0" />
                          <span>{bannerConfig.badge3}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {bannerConfig.ctaButtonText && (
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          const catalogSec = document.getElementById('catalog-section');
                          if (catalogSec) {
                            catalogSec.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-black transition-all duration-300 shadow-xl active:scale-[0.98]"
                      >
                        <span>{bannerConfig.ctaButtonText}</span>
                        <Compass className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* VERSÃO DESKTOP (>= 768px): Mantém a sobreposição cinematográfica ampla */}
              <div 
                className="hidden md:flex relative w-full items-center"
                style={{ minHeight: `${bannerConfig.bannerHeightDesktopPx || 480}px` }}
              >
                {/* Background Desktop Banner */}
                {(bannerConfig.desktopImageUrl || bannerConfig.mobileImageUrl) ? (
                  <img
                    src={bannerConfig.desktopImageUrl || bannerConfig.mobileImageUrl}
                    alt={bannerConfig.title || 'Banner Spa Experience'}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(212,175,55,0.06)_0%,transparent_60%)] pointer-events-none" />
                  </div>
                )}

                {/* Contrast and Readability Gradient Overlays */}
                <div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(to right, rgba(0,0,0,${bannerConfig.overlayDarkness / 100}) 0%, rgba(0,0,0,${bannerConfig.overlayDarkness / 130}) 55%, rgba(0,0,0,0.3) 100%)`,
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

                {/* Text & Content Layer */}
                <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 w-full">
                  <div className="max-w-3xl">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
                        <Award className="h-4 w-4" /> {bannerConfig.tag || 'REFUGE DE LUXE'}
                      </span>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => navigate('/admin/banner')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/70 hover:bg-black border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-all shadow-md hover:scale-105"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Editar Banner</span>
                        </button>
                      )}
                    </div>

                    <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-wide text-white leading-tight font-serif-luxury italic">
                      {bannerConfig.title || 'Reconecte seus sentidos'} <br className="hidden sm:inline" />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] font-normal not-italic">
                        {bannerConfig.titleHighlight || 'AO ABSOLUTO'}
                      </span>
                    </h1>

                    <p className="mt-4 sm:mt-5 text-sm sm:text-base text-zinc-300 font-medium leading-relaxed max-w-2xl drop-shadow">
                      {bannerConfig.description}
                    </p>
                    
                    {bannerConfig.showBadges && (
                      <div className="mt-8 flex flex-wrap gap-3 sm:gap-4 text-xs font-bold text-zinc-300">
                        {bannerConfig.badge1 && (
                          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-zinc-800">
                            <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
                            <span>{bannerConfig.badge1}</span>
                          </div>
                        )}
                        {bannerConfig.badge2 && (
                          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-zinc-800">
                            <Star className="h-4 w-4 text-[#D4AF37] fill-[#D4AF37]" />
                            <span>{bannerConfig.badge2}</span>
                          </div>
                        )}
                        {bannerConfig.badge3 && (
                          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-zinc-800">
                            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                            <span>{bannerConfig.badge3}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {bannerConfig.ctaButtonText && (
                      <div className="mt-8">
                        <button
                          onClick={() => {
                            const catalogSec = document.getElementById('catalog-section');
                            if (catalogSec) {
                              catalogSec.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-6 py-3 text-xs font-bold uppercase tracking-wider text-black transition-all duration-300 shadow-xl hover:shadow-[#D4AF37]/30 active:scale-[0.98]"
                        >
                          <span>{bannerConfig.ctaButtonText}</span>
                          <Compass className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <main className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            {/* Billboard Hero Presentation Banner - Boxed Mode */}
            {bannerConfig.enabled && bannerConfig.displayStyle === 'boxed' && (
              <section id="billboard-hero" className="mb-16 rounded-2xl border border-zinc-900 overflow-hidden bg-black shadow-2xl">
                {/* VERSÃO MOBILE (< 768px): Boxed Mode */}
                <div className="block md:hidden w-full">
                  <div className="relative w-full aspect-[4/5] max-h-[460px] overflow-hidden bg-black">
                    {(bannerConfig.mobileImageUrl || bannerConfig.desktopImageUrl) ? (
                      <img
                        src={bannerConfig.mobileImageUrl || bannerConfig.desktopImageUrl}
                        alt={bannerConfig.title || 'Banner Spa Experience'}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                  </div>

                  <div className="p-6 bg-black">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
                        <Award className="h-4 w-4" /> {bannerConfig.tag || 'REFUGE DE LUXE'}
                      </span>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => navigate('/admin/banner')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Editar Banner</span>
                        </button>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-white leading-tight font-serif-luxury italic">
                      {bannerConfig.title || 'Reconecte seus sentidos'} <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] font-normal not-italic">
                        {bannerConfig.titleHighlight || 'AO ABSOLUTO'}
                      </span>
                    </h1>

                    <p className="mt-3.5 text-sm text-zinc-300 font-medium leading-relaxed">
                      {bannerConfig.description}
                    </p>
                    
                    {bannerConfig.showBadges && (
                      <div className="mt-5 flex flex-col gap-2.5 text-xs font-bold text-zinc-300">
                        {bannerConfig.badge1 && (
                          <div className="flex items-center gap-2 bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800/80">
                            <ShieldCheck className="h-4 w-4 text-[#D4AF37] flex-shrink-0" />
                            <span>{bannerConfig.badge1}</span>
                          </div>
                        )}
                        {bannerConfig.badge2 && (
                          <div className="flex items-center gap-2 bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800/80">
                            <Star className="h-4 w-4 text-[#D4AF37] fill-[#D4AF37] flex-shrink-0" />
                            <span>{bannerConfig.badge2}</span>
                          </div>
                        )}
                        {bannerConfig.badge3 && (
                          <div className="flex items-center gap-2 bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800/80">
                            <Sparkles className="h-4 w-4 text-[#D4AF37] flex-shrink-0" />
                            <span>{bannerConfig.badge3}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {bannerConfig.ctaButtonText && (
                      <div className="mt-6">
                        <button
                          onClick={() => {
                            const catalogSec = document.getElementById('catalog-section');
                            if (catalogSec) {
                              catalogSec.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-black transition-all duration-300 shadow-xl active:scale-[0.98]"
                        >
                          <span>{bannerConfig.ctaButtonText}</span>
                          <Compass className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* VERSÃO DESKTOP (>= 768px): Boxed Mode */}
                <div className="hidden md:block relative p-6 md:p-12">
                  {(bannerConfig.desktopImageUrl || bannerConfig.mobileImageUrl) ? (
                    <img
                      src={bannerConfig.desktopImageUrl || bannerConfig.mobileImageUrl}
                      alt={bannerConfig.title || 'Banner Spa Experience'}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(212,175,55,0.04)_0%,transparent_60%)] pointer-events-none" />
                  )}

                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(to right, rgba(0,0,0,${bannerConfig.overlayDarkness / 100}) 0%, rgba(0,0,0,${bannerConfig.overlayDarkness / 130}) 60%, rgba(0,0,0,0.4) 100%)`,
                    }}
                  />

                  <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
                        <Award className="h-4 w-4" /> {bannerConfig.tag || 'REFUGE DE LUXE'}
                      </span>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => navigate('/admin/banner')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/70 hover:bg-black border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-all shadow-md hover:scale-105"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Editar Banner</span>
                        </button>
                      )}
                    </div>

                    <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-light tracking-wide text-white leading-tight font-serif-luxury italic">
                      {bannerConfig.title || 'Reconecte seus sentidos'} <br className="hidden sm:inline" />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] font-normal not-italic">
                        {bannerConfig.titleHighlight || 'AO ABSOLUTO'}
                      </span>
                    </h1>

                    <p className="mt-4 sm:mt-5 text-sm sm:text-base text-zinc-300 font-medium leading-relaxed max-w-2xl drop-shadow">
                      {bannerConfig.description}
                    </p>
                    
                    {bannerConfig.showBadges && (
                      <div className="mt-8 flex flex-wrap gap-3 sm:gap-4 text-xs font-bold text-zinc-300">
                        {bannerConfig.badge1 && (
                          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-zinc-800">
                            <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
                            <span>{bannerConfig.badge1}</span>
                          </div>
                        )}
                        {bannerConfig.badge2 && (
                          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-zinc-800">
                            <Star className="h-4 w-4 text-[#D4AF37] fill-[#D4AF37]" />
                            <span>{bannerConfig.badge2}</span>
                          </div>
                        )}
                        {bannerConfig.badge3 && (
                          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-zinc-800">
                            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                            <span>{bannerConfig.badge3}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {bannerConfig.ctaButtonText && (
                      <div className="mt-8">
                        <button
                          onClick={() => {
                            const catalogSec = document.getElementById('catalog-section');
                            if (catalogSec) {
                              catalogSec.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-6 py-3 text-xs font-bold uppercase tracking-wider text-black transition-all duration-300 shadow-xl hover:shadow-[#D4AF37]/30 active:scale-[0.98]"
                        >
                          <span>{bannerConfig.ctaButtonText}</span>
                          <Compass className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

          {/* Categories Filtering Header */}
          <section id="catalog-section" className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-[#D4AF37]" />
                <h2 className="text-base font-light uppercase tracking-widest text-zinc-200 font-serif-luxury">
                  Nossas Terapias
                </h2>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      activeCategory === category.id
                        ? 'bg-[#D4AF37] text-black shadow-lg shadow-gold-premium'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850 hover:text-[#D4AF37]'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Netflix-style Grid Catalog */}
          <section id="grid-catalog" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onClick={() => setSelectedService(service)}
              />
            ))}
          </section>
        </main>
        </>
      )}

      {/* Detailed Service Modal Popup */}
      {selectedService && (
        <ServiceModal
          service={selectedService}
          therapists={therapists}
          onClose={() => setSelectedService(null)}
          onBook={() => {
            setWizardService(selectedService);
            setIsBookingWizardOpen(true);
            setSelectedService(null); // Close the details modal
          }}
        />
      )}

      {/* Booking Wizard Flow */}
      {isBookingWizardOpen && wizardService && (
        <BookingWizard
          service={wizardService}
          therapists={therapists}
          onClose={() => {
            setIsBookingWizardOpen(false);
            setWizardService(null);
          }}
          onSuccess={() => {
            setIsBookingWizardOpen(false);
            setWizardService(null);
            alert('Parabéns! Seu agendamento foi registrado com sucesso. Aguardamos você para sua sessão exclusiva de bem-estar.');
          }}
        />
      )}

      {/* CLIENT APPOINTMENTS MODAL */}
      {isClientAppointmentsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow my-8">
            <button
              onClick={() => setIsClientAppointmentsOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-zinc-900 pb-4 mb-6">
              <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase block mb-1">Área do Cliente</span>
              <h3 className="text-xl font-light font-serif-luxury tracking-wide text-white">Meus Agendamentos</h3>
            </div>

            {isAppointmentsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Buscando suas sessões exclusivas...</span>
              </div>
            ) : clientAppointments.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm font-sans">
                Você ainda não realizou nenhum agendamento. Escolha uma terapia acima e agende sua experiência!
              </div>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                {clientAppointments.map((appt) => {
                  const statusColors = {
                    confirmed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                    pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                    cancelled: 'bg-red-500/10 border-red-500/20 text-red-400',
                    completed: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
                    no_show: 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  };

                  const paymentColors = {
                    paid: 'bg-emerald-500/10 text-emerald-400',
                    unpaid: 'bg-red-500/10 text-red-400',
                    refunded: 'bg-amber-500/10 text-amber-400',
                    failed: 'bg-red-500/10 text-red-400'
                  };

                  const translateStatus = (s: string) => {
                    const dict: Record<string, string> = {
                      confirmed: 'Confirmado',
                      pending: 'Pendente',
                      cancelled: 'Cancelado',
                      completed: 'Concluído',
                      no_show: 'Não Compareceu'
                    };
                    return dict[s] || s;
                  };

                  const translatePayment = (p: string) => {
                    const dict: Record<string, string> = {
                      paid: 'Pago',
                      unpaid: 'Aguardando Pagamento',
                      refunded: 'Reembolsado',
                      failed: 'Falhou'
                    };
                    return dict[p] || p;
                  };

                  return (
                    <div 
                      key={appt.id} 
                      className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 hover:border-[#D4AF37]/20 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-zinc-900">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-sans">Data & Horário</span>
                          <strong className="text-sm font-sans text-white block mt-0.5">
                            {new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {appt.startTime && appt.startTime.seconds ? new Date(appt.startTime.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : (appt as any).time || 'N/A'}
                          </strong>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColors[appt.status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                            {translateStatus(appt.status)}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${paymentColors[appt.paymentStatus] || 'bg-zinc-800 text-zinc-400'}`}>
                            {translatePayment(appt.paymentStatus)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">Terapia</span>
                          <span className="text-zinc-200 block font-medium mt-0.5">{appt.serviceName}</span>
                          <span className="text-[10px] text-zinc-400 mt-0.5 block">{appt.serviceDuration} minutos</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">Profissional</span>
                          <span className="text-zinc-200 block font-medium mt-0.5">{appt.therapistName}</span>
                        </div>
                      </div>

                      {appt.additionalServices && appt.additionalServices.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-zinc-900/60">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold mb-1.5">Upgrades Adicionados</span>
                          <div className="flex flex-wrap gap-1.5">
                            {appt.additionalServices.map((addSrv) => (
                              <span 
                                key={addSrv.id} 
                                className="text-[10px] font-medium bg-[#D4AF37]/5 border border-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full"
                              >
                                {addSrv.name} (+{addSrv.durationMinutes} min)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center text-xs font-sans">
                        <span className="text-zinc-500 font-medium">Investimento Total</span>
                        <strong className="text-sm font-bold text-white font-mono">
                          R$ {(appt.totalPrice / 100).toFixed(2).replace('.', ',')}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setIsClientAppointmentsOpen(false)}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-black bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] rounded-lg transition-all duration-300 shadow-md shadow-[#D4AF37]/20"
              >
                Voltar à Vitrine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aesthetic Footer */}
      <footer className="border-t border-zinc-950 bg-black py-12 text-center text-xs text-zinc-600 font-semibold tracking-wider uppercase relative z-10">
        <p>© 2026 Spa Experience. All rights reserved.</p>
        <p className="mt-2 text-zinc-700">Dark Seduction Luxury Premium Concept</p>
      </footer>
    </div>
  );
};
