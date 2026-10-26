import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTherapistImageStyle } from '../utils/imageUtils';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp,
  updateDoc, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  DollarSign, 
  LogOut, 
  User, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Loader2,
  Lock,
  Phone,
  Mail,
  Award,
  ChevronRight,
  RefreshCw,
  Landmark,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { Therapist, Appointment, Service } from '../types';
import { calculateSplit } from '../services/pagarme';

export const TherapistPortal: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [therapistProfile, setTherapistProfile] = useState<Therapist | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  
  // Selected appointment for details modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Payout request modal states
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  useEffect(() => {
    // 1. Monitor Auth State
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUser(user);
      
      try {
        setLoading(true);
        setError(null);

        // Fetch all services to match names and prices
        const servicesSnap = await getDocs(collection(db, 'services'));
        const servicesList: Service[] = [];
        servicesSnap.forEach(d => {
          servicesList.push({ id: d.id, ...d.data() } as Service);
        });
        setServices(servicesList);

        // 2. Fetch Therapist profile by Matching User Email or UID
        const therapistsRef = collection(db, 'therapists');
        const qTherapist = query(therapistsRef, where('email', '==', user.email.toLowerCase()));
        let therapistQuerySnap = await getDocs(qTherapist);
        
        if (therapistQuerySnap.empty) {
          // Check by UID document directly
          const docByUid = await getDoc(doc(db, 'therapists', user.uid));
          if (docByUid.exists()) {
            setTherapistProfile({ id: docByUid.id, ...docByUid.data() } as Therapist);
          } else {
            // Auto-provision therapist document if user is logging in as a therapist
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            const isTherapistRole = userDocSnap.exists() && userDocSnap.data()?.role === 'therapist';
            const isKnownTherapistEmail = 
              user.email.toLowerCase().includes('leda.souza') ||
              user.email.toLowerCase().includes('kelsen') ||
              user.email.toLowerCase().includes('therapist') ||
              user.email.toLowerCase().endsWith('@spaexperience.com');

            if (isTherapistRole || isKnownTherapistEmail) {
              const defaultName = user.displayName || 
                (user.email.includes('leda.souza') ? 'Leda Souza' : 
                 user.email.includes('kelsen') ? 'Kelsen Pantoja' : 'Massoterapeuta');

              const autoTherapist: Therapist = {
                id: user.uid,
                name: defaultName,
                email: user.email.toLowerCase(),
                phone: '(11) 97777-8888',
                bio: 'Massoterapeuta especializada em bem-estar e terapias de luxo.',
                specialties: ['massage-relaxante', 'massage-pedras-quentes', 'massage-deep-tissue'],
                isActive: true,
                avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300',
                commissionPercentage: 30,
                pagarmeRecipientId: `re_ck_${user.uid.slice(0, 10)}`,
                createdAt: null,
                updatedAt: null,
              };

              // Persist in Firestore therapists collection
              await setDoc(doc(db, 'therapists', user.uid), {
                ...autoTherapist,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });

              // Ensure user role in /users is set to therapist
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: defaultName,
                email: user.email.toLowerCase(),
                role: 'therapist',
                updatedAt: serverTimestamp()
              }, { merge: true });

              setTherapistProfile(autoTherapist);
            } else {
              setError('Nenhum perfil de Massoterapeuta foi encontrado vinculado a este e-mail. Entre em contato com a administração.');
              setLoading(false);
              return;
            }
          }
        } else {
          const therapistData = { id: therapistQuerySnap.docs[0].id, ...therapistQuerySnap.docs[0].data() } as Therapist;
          setTherapistProfile(therapistData);
        }

        const activeTherapistId = therapistQuerySnap.empty ? user.uid : therapistQuerySnap.docs[0].id;

        // 3. Real-time listener for Appointments
        const appointmentsRef = collection(db, 'appointments');
        const qAppointments = query(
          appointmentsRef, 
          where('therapistId', '==', activeTherapistId),
          orderBy('startTime', 'desc')
        );

        const unsubscribeAppointments = onSnapshot(qAppointments, (snapshot) => {
          const fetchedAppointments: Appointment[] = [];
          snapshot.forEach(docSnap => {
            fetchedAppointments.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
          });

          // Calibrate with Pagar.me fee and commission split logic
          const defaultCommissionRate = therapistProfile?.commissionPercentage !== undefined ? therapistProfile.commissionPercentage : 30;
          const calibrated = fetchedAppointments.map(app => {
            if (app.pagarmeFee !== undefined && app.netAmount !== undefined && app.therapistShare !== undefined && app.spaShare !== undefined) {
              return app;
            }

            const paymentMethod = app.paymentGatewayDetails?.paymentMethod === 'pix' ? 'pix' : 'card';
            const installments = app.paymentInstallments || 1;
            const split = calculateSplit(app.totalPrice, paymentMethod, installments, defaultCommissionRate);

            return {
              ...app,
              pagarmeFee: split.pagarmeFee,
              netAmount: split.netAmount,
              therapistCommissionPercentage: split.therapistCommissionPercentage,
              therapistShare: split.therapistShare,
              spaShare: split.spaShare
            };
          });

          setAppointments(calibrated);
          setLoading(false);
        }, (err) => {
          console.error("Error listening to appointments:", err);
          setError("Erro ao carregar agendamentos em tempo real.");
          setLoading(false);
        });

        return () => {
          unsubscribeAppointments();
        };

      } catch (err: any) {
        console.error("Error setting up therapist portal data:", err);
        setError("Ocorreu um erro ao buscar suas credenciais.");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Status updates
  const updateAppointmentStatus = async (appointmentId: string, newStatus: 'completed' | 'no_show' | 'confirmed') => {
    try {
      setSyncing(true);
      const appRef = doc(db, 'appointments', appointmentId);
      
      // If marking as completed, set paymentStatus as paid too if they chose "pay on site"
      const updateData: any = { 
        status: newStatus,
        updatedAt: new Date()
      };
      
      if (newStatus === 'completed') {
        updateData.paymentStatus = 'paid';
      }

      await updateDoc(appRef, updateData);
      
      // Update local detailed view if modal is open
      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment(prev => prev ? { ...prev, ...updateData } : null);
      }
      
      setSyncing(false);
    } catch (err) {
      console.error("Error updating appointment status:", err);
      alert("Erro ao salvar status. Tente novamente.");
      setSyncing(false);
    }
  };

  // Financial calculations
  const defaultCommission = therapistProfile?.commissionPercentage ?? 30;

  // Filter completed and uncompleted sessions
  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const upcomingAppointments = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed');
  const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show');

  // Total earnings / Faturamento de comissões (Líquido)
  const totalCommissionCents = completedAppointments.reduce((acc, app) => {
    return acc + (app.therapistShare || 0);
  }, 0);

  // Pending upcoming earnings / Comissões previstas de sessões marcadas (Líquido)
  const pendingCommissionCents = upcomingAppointments.reduce((acc, app) => {
    return acc + (app.therapistShare || 0);
  }, 0);

  const formatBRL = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handlePayoutRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const centsValue = parseFloat(payoutAmount.replace(/\D/g, ''));
    if (!centsValue || centsValue <= 0) return;

    setSyncing(true);
    // Simulate real-time Stone Pagarme payment split disbursement
    setTimeout(() => {
      setSyncing(false);
      setPayoutSuccess(true);
      setPayoutAmount('');
      setTimeout(() => {
        setPayoutSuccess(false);
        setIsPayoutModalOpen(false);
      }, 3000);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37] mb-4" />
        <h2 className="text-sm font-light tracking-[0.2em] text-zinc-400 uppercase">Acessando Área do Colaborador...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-zinc-100 font-sans selection:bg-[#D4AF37] selection:text-black relative pb-16">
      {/* Visual Ambient Blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[350px] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Navigation Topbar */}
      <header className="border-b border-zinc-900 bg-black/40 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg border border-[#D4AF37]/30 bg-zinc-950 flex items-center justify-center text-[#D4AF37]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-light uppercase tracking-[0.15em] text-white">
              Spa <span className="text-[#D4AF37]">Experience</span>
            </h1>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block -mt-0.5">Portal de Especialistas</span>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all duration-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Desconectar</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Error State Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-xs flex gap-3 max-w-3xl">
            <XCircle className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-bold uppercase tracking-wider mb-1">Restrição de Acesso</p>
              <p className="leading-relaxed">{error}</p>
              <button 
                onClick={handleLogout}
                className="mt-3 text-[#D4AF37] hover:underline font-bold uppercase tracking-wider text-[10px]"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        )}

        {!error && therapistProfile && (
          <>
            {/* Staff Bio Header */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[#D4AF37]/50 bg-zinc-900 shrink-0 shadow-lg shadow-[#D4AF37]/15">
                  <img 
                    src={therapistProfile.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300"} 
                    alt={therapistProfile.name}
                    className="h-full w-full object-cover"
                    style={getTherapistImageStyle(therapistProfile)}
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif-luxury text-xl font-bold text-white">{therapistProfile.name}</h2>
                    <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/30">
                      Colaborador Ativo
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 font-sans flex items-center gap-2">
                    <Mail className="h-3 w-3 text-[#D4AF37]" /> {therapistProfile.email}
                    <span className="text-zinc-600">|</span>
                    <Phone className="h-3 w-3 text-[#D4AF37]" /> {therapistProfile.phone}
                  </p>
                </div>
              </div>

              {/* Commission Rate Stats Card */}
              <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4 rounded-lg flex items-center gap-3 w-full md:w-auto shrink-0">
                <div className="h-10 w-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest block">Comissão Contratada</span>
                  <span className="text-white text-lg font-bold font-mono">{defaultCommission}% <span className="text-xs text-zinc-400 font-light">por massagem</span></span>
                </div>
              </div>
            </div>

            {/* FINANCIAL DASHBOARD (DIGITAL WALLET CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Revenue Faturamento */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 hover:border-[#D4AF37]/20 transition-all duration-300 relative group overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-[#D4AF37]/5 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Faturamento de Comissões</span>
                  <div className="h-8 w-8 rounded-lg bg-zinc-900 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/15">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold font-mono text-white tracking-tight">{formatBRL(totalCommissionCents)}</h3>
                <p className="text-[10px] text-zinc-500 mt-2">Acumulado em sessões concluídas</p>
              </div>

              {/* Card 2: Saldo Disponível (Pagarme Transfer) */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 hover:border-emerald-950 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Saldo Pagar.me Disponível</span>
                  <div className="h-8 w-8 rounded-lg bg-zinc-900 text-emerald-400 flex items-center justify-center border border-emerald-950">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                {/* We simulate available balance as a percentage of faturamento representing real live cash transfers */}
                <h3 className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">{formatBRL(totalCommissionCents * 0.85)}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-zinc-500">Pronto para resgate Stone</span>
                  <button 
                    onClick={() => setIsPayoutModalOpen(true)}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider flex items-center gap-1 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30"
                  >
                    Resgatar
                  </button>
                </div>
              </div>

              {/* Card 3: Previsão a Receber */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 hover:border-[#D4AF37]/15 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-[#D4AF37]/5 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Saldo Previsto (A Receber)</span>
                  <div className="h-8 w-8 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold font-mono text-zinc-300 tracking-tight">{formatBRL(pendingCommissionCents)}</h3>
                <p className="text-[10px] text-zinc-500 mt-2">Agendamentos futuros confirmados</p>
              </div>

            </div>

            {/* STONE PAGARME DIGITAL RECIPIENT ACCOUNT DETAIL */}
            <div className="bg-gradient-to-r from-zinc-950 via-zinc-950 to-[#0A1D12]/20 border border-zinc-900 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">P</div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Conta Recebedora Stone Pagar.me</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Suas comissões por atendimento são divididas automaticamente no ato do agendamento por meio do <span className="text-[#D4AF37] font-medium">Split de Pagamentos</span> da Stone.
                </p>
              </div>

              <div className="space-y-2 border-y md:border-y-0 md:border-x border-zinc-900 py-4 md:py-0 md:px-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Chave do Recebedor:</span>
                  <span className="font-mono text-emerald-400">{therapistProfile.pagarmeRecipientId || "re_ck_not_configured"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Tipo de Conta:</span>
                  <span className="text-zinc-300 font-medium">Conta Corrente Individual</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Transferência de Saldo:</span>
                  <span className="text-zinc-300 font-medium">Automática diária</span>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Conexão Segura Ativa (Stone SDK)</span>
                </div>
                <p className="text-[10px] text-zinc-500 text-left md:text-right">
                  Alterações cadastrais bancárias devem ser solicitadas exclusivamente ao administrador do SPA.
                </p>
              </div>
            </div>

            {/* SESSIONS SECTION */}
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all relative ${
                      activeTab === 'upcoming' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Próximas Sessões ({upcomingAppointments.length})
                    {activeTab === 'upcoming' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('past')}
                    className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all relative ${
                      activeTab === 'past' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Histórico Geral ({pastAppointments.length})
                    {activeTab === 'past' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  {syncing && (
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin text-[#D4AF37]" />
                      <span>Sincronizando...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid of sessions */}
              {activeTab === 'upcoming' ? (
                upcomingAppointments.length === 0 ? (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center text-zinc-500 text-xs font-sans">
                    Nenhum agendamento futuro encontrado para você no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                    {upcomingAppointments.map((app) => {
                      const yourCut = app.therapistShare !== undefined ? app.therapistShare : app.totalPrice * (defaultCommission / 100);
                      return (
                        <div 
                          key={app.id}
                          onClick={() => setSelectedAppointment(app)}
                          className="bg-zinc-950 border border-zinc-900 hover:border-[#D4AF37]/35 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer relative group"
                        >
                          <div>
                            {/* Card Header: Client Name and Icon */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-[9px] font-bold tracking-widest uppercase bg-zinc-900 px-2 py-0.5 rounded text-[#D4AF37] border border-[#D4AF37]/10">
                                {app.serviceName}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                                Pix/Cartão Stone
                              </span>
                            </div>

                            <h4 className="font-serif-luxury text-base font-bold text-white group-hover:text-[#D4AF37] transition-colors">{app.clientName}</h4>
                            
                            <div className="mt-4 space-y-2 border-t border-zinc-900 pt-3 text-xs text-zinc-400">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                                <span>{new Date(app.date + "T12:00:00").toLocaleDateString('pt-BR')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                                <span>{app.totalDurationMinutes} min ({app.totalDurationMinutes - app.preparationDuration} min massagem)</span>
                              </div>
                            </div>

                            {/* Additional services snapshot */}
                            {app.additionalServices && app.additionalServices.length > 0 && (
                              <div className="mt-3.5 pt-2 border-t border-zinc-900">
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Adicionais (Upsells)</span>
                                <div className="flex flex-wrap gap-1">
                                  {app.additionalServices.map(ad => (
                                    <span key={ad.id} className="text-[9px] bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                                      + {ad.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Price & Action Section */}
                          <div className="mt-5 pt-3 border-t border-zinc-900 flex justify-between items-center">
                            <div>
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Sua Comissão ({defaultCommission}%)</span>
                              <span className="text-white font-mono font-bold text-sm">{formatBRL(yourCut)}</span>
                            </div>
                            
                            {/* Micro action button triggers */}
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointment(app);
                              }}
                              className="inline-flex items-center gap-1 bg-[#D4AF37] hover:bg-[#CFB53B] text-black text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded transition-all"
                            >
                              <span>Gerenciar</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                pastAppointments.length === 0 ? (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center text-zinc-500 text-xs font-sans">
                    Nenhum histórico de sessões anteriores encontrado para você.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                    {pastAppointments.map((app) => {
                      const yourCut = app.therapistShare !== undefined ? app.therapistShare : app.totalPrice * (defaultCommission / 100);
                      return (
                        <div 
                          key={app.id}
                          onClick={() => setSelectedAppointment(app)}
                          className="bg-zinc-950/65 border border-zinc-900 hover:border-[#D4AF37]/15 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer relative"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-[9px] font-bold tracking-widest uppercase bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">
                                {app.serviceName}
                              </span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                app.status === 'completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                                app.status === 'cancelled' ? 'bg-red-950/40 text-red-400 border border-red-900/30' :
                                'bg-zinc-900 text-zinc-400'
                              }`}>
                                {app.status === 'completed' ? 'Concluído' :
                                 app.status === 'cancelled' ? 'Cancelado' :
                                 'No-Show'}
                              </span>
                            </div>

                            <h4 className="font-serif-luxury text-base font-bold text-zinc-200">{app.clientName}</h4>
                            
                            <div className="mt-4 space-y-2 border-t border-zinc-900 pt-3 text-xs text-zinc-400">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                <span>{new Date(app.date + "T12:00:00").toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-zinc-900 flex justify-between items-center">
                            <div>
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Comissão Paga</span>
                              <span className="text-zinc-300 font-mono font-bold text-xs">{formatBRL(yourCut)}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 italic">Disparado via split</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

            </div>
          </>
        )}

      </main>

      {/* DETAIL AND ACTION MODAL */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow">
            <button
              onClick={() => setSelectedAppointment(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <span className="text-[9px] font-bold tracking-widest uppercase bg-zinc-900 px-2 py-0.5 rounded text-[#D4AF37] border border-[#D4AF37]/15">
              Detalhes do Atendimento
            </span>
            
            <h3 className="text-2xl font-serif-luxury font-bold text-white mt-2 mb-1">{selectedAppointment.clientName}</h3>
            <p className="text-xs text-[#D4AF37] mb-6">Agendado para {new Date(selectedAppointment.date + "T12:00:00").toLocaleDateString('pt-BR')}</p>

            <div className="space-y-4 border-t border-zinc-900 pt-4 text-sm font-sans">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Terapia Principal</span>
                  <span className="text-zinc-200">{selectedAppointment.serviceName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Duração da Sessão</span>
                  <span className="text-zinc-200">{selectedAppointment.totalDurationMinutes} minutos</span>
                </div>
              </div>

              {selectedAppointment.additionalServices && selectedAppointment.additionalServices.length > 0 && (
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold mb-1">Adicionais de Experiência</span>
                  <div className="space-y-1 bg-zinc-900/40 p-2.5 rounded border border-zinc-900">
                    {selectedAppointment.additionalServices.map(ad => (
                      <div key={ad.id} className="flex justify-between text-xs">
                        <span className="text-zinc-300">{ad.name}</span>
                        <span className="text-zinc-400 font-mono">{formatBRL(ad.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-3">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Valor Total Pago</span>
                  <span className="text-zinc-200 font-mono font-bold">{formatBRL(selectedAppointment.totalPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Sua Comissão ({defaultCommission}%)</span>
                  <span className="text-[#D4AF37] font-mono font-bold text-base">{formatBRL(selectedAppointment.therapistShare !== undefined ? selectedAppointment.therapistShare : selectedAppointment.totalPrice * (defaultCommission / 100))}</span>
                </div>
              </div>

              {/* Status indicators */}
              <div className="bg-zinc-900/20 p-3 rounded-lg border border-zinc-900/60 flex items-center justify-between text-xs mt-4">
                <div>
                  <span className="text-zinc-500 block uppercase text-[9px] font-bold">Status do Atendimento</span>
                  <span className={`font-bold uppercase tracking-wider ${
                    selectedAppointment.status === 'completed' ? 'text-emerald-400' :
                    selectedAppointment.status === 'cancelled' ? 'text-red-400' :
                    'text-amber-400'
                  }`}>
                    {selectedAppointment.status === 'completed' ? 'Concluído' :
                     selectedAppointment.status === 'cancelled' ? 'Cancelado' :
                     'Pendente / Confirmado'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 block uppercase text-[9px] font-bold text-right">Liquidação Pagar.me</span>
                  <span className="text-emerald-400 font-medium text-right block">Split Automático Conectado</span>
                </div>
              </div>

              {/* ACTION TOGGLES */}
              {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                <div className="mt-8 space-y-3 pt-4 border-t border-zinc-900">
                  <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest block mb-2">Ações Rápidas de Atendimento</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs py-3.5 transition-all shadow shadow-emerald-950/30"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Concluir Atendimento</span>
                    </button>

                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'no_show')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-xs py-3.5 transition-all border border-zinc-800"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Registrar No-Show</span>
                    </button>
                  </div>
                  <span className="text-[9px] text-zinc-500 text-center block mt-2">
                    A conclusão atualiza instantaneamente o faturamento de comissões e o dashboard geral.
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW RESGATE WALLET MODAL */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow font-sans">
            <button
              onClick={() => setIsPayoutModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <div className="h-10 w-10 rounded-lg bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Landmark className="h-5 w-5" />
            </div>

            <h3 className="text-lg font-serif-luxury font-bold text-white mb-2">Solicitar Resgate de Saldo</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Transfira o saldo acumulado de suas comissões Stone Pagar.me diretamente para sua conta corrente vinculada (CPF de titularidade igual ao cadastrado).
            </p>

            {payoutSuccess ? (
              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs text-center font-bold animate-fadeIn">
                Disparando Transferência Stone... Saldo liberado na sua conta bancária em até 10 minutos!
              </div>
            ) : (
              <form onSubmit={handlePayoutRequest} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Valor do Resgate (BRL)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 font-mono text-sm">R$</span>
                    <input 
                      type="text" 
                      required 
                      value={payoutAmount}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val) {
                          val = (parseFloat(val) / 100).toFixed(2);
                          val = val.replace('.', ',');
                          val = val.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
                          setPayoutAmount(val);
                        } else {
                          setPayoutAmount('');
                        }
                      }}
                      placeholder="0,00"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg py-3 pl-10 pr-4 text-sm text-zinc-100 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">Saldo Máximo Disponível: {formatBRL(totalCommissionCents * 0.85)}</span>
                </div>

                <button
                  type="submit"
                  disabled={syncing || !payoutAmount}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-black font-bold uppercase tracking-widest text-xs py-3.5 transition-all shadow shadow-emerald-950/30 disabled:opacity-50"
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                  <span>Solicitar Pix Instantâneo</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
