import React, { useState, useEffect } from 'react';
import { getTherapistImageStyle } from '../utils/imageUtils';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Sparkles, 
  Clock, 
  Loader2, 
  DollarSign, 
  Award, 
  Layers, 
  ChevronRight, 
  User, 
  Filter, 
  Search, 
  TrendingDown,
  Percent,
  TrendingUp as TrendUpIcon,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Appointment, Therapist, Service } from '../types';
import { calculateSplit } from '../services/pagarme';

// Import Recharts components
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const getTodayLocalDate = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime; // YYYY-MM-DD
  };

  // Selected date as standard reference for dynamic calculations
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate());
  
  // Chart view toggle: 'weekly' or 'monthly'
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected therapist ID for detailed performance reporting
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [appointmentsSnap, servicesSnap, therapistsSnap] = await Promise.all([
        getDocs(collection(db, 'appointments')),
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'therapists'))
      ]);

      const fetchedAppointments: Appointment[] = [];
      appointmentsSnap.forEach((docSnap) => {
        fetchedAppointments.push(docSnap.data() as Appointment);
      });

      const fetchedServices: Service[] = [];
      servicesSnap.forEach((docSnap) => {
        fetchedServices.push(docSnap.data() as Service);
      });

      const fetchedTherapists: Therapist[] = [];
      therapistsSnap.forEach((docSnap) => {
        fetchedTherapists.push(docSnap.data() as Therapist);
      });

      // Dynamically calibrate all appointments with Pagar.me fees and therapist split commissions
      const calibratedAppointments = fetchedAppointments.map(app => {
        const matchingTherapist = fetchedTherapists.find(t => t.id === app.therapistId);
        const commissionPercentage = matchingTherapist && matchingTherapist.commissionPercentage !== undefined 
          ? matchingTherapist.commissionPercentage 
          : 30;

        if (app.pagarmeFee !== undefined && app.netAmount !== undefined && app.therapistShare !== undefined && app.spaShare !== undefined) {
          return app;
        }

        const paymentMethod = app.paymentGatewayDetails?.paymentMethod === 'pix' ? 'pix' : 'card';
        const installments = app.paymentInstallments || 1;
        const split = calculateSplit(app.totalPrice, paymentMethod, installments, commissionPercentage);

        return {
          ...app,
          pagarmeFee: split.pagarmeFee,
          netAmount: split.netAmount,
          therapistCommissionPercentage: split.therapistCommissionPercentage,
          therapistShare: split.therapistShare,
          spaShare: split.spaShare
        };
      });

      setAppointments(calibratedAppointments);
      setServices(fetchedServices);
      setTherapists(fetchedTherapists);

      if (fetchedTherapists.length > 0) {
        setSelectedTherapistId(fetchedTherapists[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard resources:', err);
      setError('Ocorreu um erro de comunicação com o banco de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper date lists for metrics
  const getWeekDays = (referenceDateStr: string) => {
    const refDate = new Date(referenceDateStr + 'T12:00:00');
    const day = refDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + diffToMonday);
    
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      list.push(`${yyyy}-${mm}-${dd}`);
    }
    return list;
  };

  const getPreviousWeekDays = (firstDayOfActiveWeekStr: string) => {
    const refDate = new Date(firstDayOfActiveWeekStr + 'T12:00:00');
    const list = [];
    for (let i = 7; i >= 1; i--) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      list.push(`${yyyy}-${mm}-${dd}`);
    }
    return list;
  };

  const getDaysInMonth = (monthPrefixStr: string) => {
    const [year, month] = monthPrefixStr.split('-').map(Number);
    // day 0 of next month is last day of current month
    const date = new Date(year, month, 0);
    const numDays = date.getDate();
    
    const list = [];
    for (let i = 1; i <= numDays; i++) {
      const dd = String(i).padStart(2, '0');
      list.push(`${monthPrefixStr}-${dd}`);
    }
    return list;
  };

  const getPreviousMonthPrefix = (currentMonthPrefixStr: string) => {
    const [year, month] = currentMonthPrefixStr.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  };

  const getDayNameLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return `${dayNames[d.getDay()]} ${dateStr.substring(8, 10)}`;
  };

  // financial rule validation (completed or paid)
  const isCompletedOrPaid = (app: Appointment) => {
    return app.status === 'completed' || app.paymentStatus === 'paid';
  };

  // BRL Formatter (Standard Cents / 100 alignment)
  const formatBRL = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  // Metrics extraction based on selectedDate
  const todayStr = selectedDate;
  const activeWeek = getWeekDays(selectedDate);
  const activeMonthPrefix = selectedDate.substring(0, 7); // YYYY-MM

  // 1. TODAY KPIs
  const todayApps = appointments.filter(app => app.date === todayStr);
  const todayTotal = todayApps.length;
  const todayCompleted = todayApps.filter(app => app.status === 'completed').length;

  // 2. WEEK KPIs
  const weekApps = appointments.filter(app => activeWeek.includes(app.date));
  const weekTotal = weekApps.length;
  const weekCompleted = weekApps.filter(app => app.status === 'completed').length;

  // 3. MONTH KPIs & BILLING
  const monthApps = appointments.filter(app => app.date.startsWith(activeMonthPrefix));
  const monthTotal = monthApps.length;
  const monthCompleted = monthApps.filter(app => app.status === 'completed').length;
  
  // Rule: Register and report the NET amount (Valor Líquido) after Pagar.me fee deductions
  const monthBillingCents = monthApps
    .filter(isCompletedOrPaid)
    .reduce((sum, app) => sum + (app.netAmount || app.totalPrice || 0), 0);

  const monthSpaShareCents = monthApps
    .filter(isCompletedOrPaid)
    .reduce((sum, app) => sum + (app.spaShare !== undefined ? app.spaShare : (app.netAmount || app.totalPrice) * 0.7), 0);

  const monthTherapistShareCents = monthApps
    .filter(isCompletedOrPaid)
    .reduce((sum, app) => sum + (app.therapistShare !== undefined ? app.therapistShare : (app.netAmount || app.totalPrice) * 0.3), 0);

  const monthPagarmeFeesCents = monthApps
    .filter(isCompletedOrPaid)
    .reduce((sum, app) => sum + (app.pagarmeFee || 0), 0);

  // --- COMPARATIVE REVENUE GROWTH CALCULATION ---
  const getGrowthIndicator = () => {
    if (chartView === 'weekly') {
      // Current Week Revenue (Net)
      const currentWeekRev = weekApps
        .filter(isCompletedOrPaid)
        .reduce((sum, app) => sum + (app.netAmount || app.totalPrice || 0), 0);

      // Previous Week Revenue (Net)
      const prevWeekList = getPreviousWeekDays(activeWeek[0]);
      const prevWeekApps = appointments.filter(app => prevWeekList.includes(app.date));
      const prevWeekRev = prevWeekApps
        .filter(isCompletedOrPaid)
        .reduce((sum, app) => sum + (app.netAmount || app.totalPrice || 0), 0);

      if (prevWeekRev === 0) {
        return { percent: currentWeekRev > 0 ? 100 : 0, label: 'vs semana anterior' };
      }
      const percent = ((currentWeekRev - prevWeekRev) / prevWeekRev) * 100;
      return { percent: Math.round(percent * 10) / 10, label: 'vs semana anterior' };
    } else {
      // Current Month Revenue (Net)
      const currentMonthRev = monthBillingCents;

      // Previous Month Revenue (Net)
      const prevMonthPref = getPreviousMonthPrefix(activeMonthPrefix);
      const prevMonthApps = appointments.filter(app => app.date.startsWith(prevMonthPref));
      const prevMonthRev = prevMonthApps
        .filter(isCompletedOrPaid)
        .reduce((sum, app) => sum + (app.netAmount || app.totalPrice || 0), 0);

      if (prevMonthRev === 0) {
        return { percent: currentMonthRev > 0 ? 100 : 0, label: 'vs mês anterior' };
      }
      const percent = ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100;
      return { percent: Math.round(percent * 10) / 10, label: 'vs mês anterior' };
    }
  };

  const growth = getGrowthIndicator();

  // --- CHART DATA PREPARATION ---
  const getChartData = () => {
    if (chartView === 'weekly') {
      return activeWeek.map(dayStr => {
        const dayApps = appointments.filter(app => app.date === dayStr);
        return {
          name: getDayNameLabel(dayStr),
          'Agendados': dayApps.length,
          'Concluídos': dayApps.filter(app => app.status === 'completed').length,
          'Cancelados': dayApps.filter(app => app.status === 'cancelled').length,
        };
      });
    } else {
      const monthDays = getDaysInMonth(activeMonthPrefix);
      return monthDays.map(dayStr => {
        const dayApps = appointments.filter(app => app.date === dayStr);
        return {
          name: dayStr.substring(8, 10) + '/' + dayStr.substring(5, 7),
          'Agendados': dayApps.length,
          'Concluídos': dayApps.filter(app => app.status === 'completed').length,
          'Cancelados': dayApps.filter(app => app.status === 'cancelled').length,
        };
      });
    }
  };

  const chartData = getChartData();

  // SERVICES RANKING CALCULATION
  const getServicesRanking = () => {
    const serviceMap: { [id: string]: { name: string; count: number; totalRevenue: number } } = {};

    services.forEach(s => {
      serviceMap[s.id] = { name: s.name, count: 0, totalRevenue: 0 };
    });

    appointments.forEach(app => {
      const sId = app.serviceId || 'unknown';
      const sName = app.serviceName || 'Serviço Personalizado';
      
      if (!serviceMap[sId]) {
        serviceMap[sId] = { name: sName, count: 0, totalRevenue: 0 };
      }

      serviceMap[sId].count += 1;
      if (isCompletedOrPaid(app)) {
        serviceMap[sId].totalRevenue += (app.netAmount || app.totalPrice || 0);
      }
    });

    return Object.values(serviceMap)
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  };

  const servicesRanking = getServicesRanking();

  // THERAPIST GENERAL RANKING CALCULATION
  const getTherapistGeneralRanking = () => {
    const map: { [id: string]: { id: string; name: string; avatarUrl?: string; imagePosition?: string; imageZoom?: number; sessionsCount: number; totalRevenue: number } } = {};

    therapists.forEach(t => {
      map[t.id] = { id: t.id, name: t.name, avatarUrl: t.avatarUrl, imagePosition: t.imagePosition, imageZoom: t.imageZoom, sessionsCount: 0, totalRevenue: 0 };
    });

    const activeMonthAppointments = appointments.filter(app => app.date.startsWith(activeMonthPrefix));

    activeMonthAppointments.forEach(app => {
      const tId = app.therapistId;
      if (!tId) return;

      if (!map[tId]) {
        map[tId] = { id: tId, name: app.therapistName || 'Profissional', sessionsCount: 0, totalRevenue: 0 };
      }

      map[tId].sessionsCount += 1;
      if (isCompletedOrPaid(app)) {
        map[tId].totalRevenue += (app.netAmount || app.totalPrice || 0);
      }
    });

    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const therapistLeaderboard = getTherapistGeneralRanking();

  // DETAILED INDIVIDUAL REPORT FOR SELECTED THERAPIST
  const getSelectedTherapistReport = () => {
    const therapistObj = therapists.find(t => t.id === selectedTherapistId);
    if (!therapistObj) return null;

    const therapistApps = appointments.filter(
      app => app.therapistId === selectedTherapistId && app.date.startsWith(activeMonthPrefix)
    );

    const totalRevenueCents = therapistApps
      .filter(isCompletedOrPaid)
      .reduce((sum, app) => sum + (app.netAmount || app.totalPrice || 0), 0);

    const totalTherapistCutCents = therapistApps
      .filter(isCompletedOrPaid)
      .reduce((sum, app) => sum + (app.therapistShare !== undefined ? app.therapistShare : (app.netAmount || app.totalPrice) * 0.3), 0);

    const totalSpaCutCents = therapistApps
      .filter(isCompletedOrPaid)
      .reduce((sum, app) => sum + (app.spaShare !== undefined ? app.spaShare : (app.netAmount || app.totalPrice) * 0.7), 0);

    const serviceCountMap: { [name: string]: number } = {};
    therapistApps.forEach(app => {
      const sName = app.serviceName || 'Outro';
      serviceCountMap[sName] = (serviceCountMap[sName] || 0) + 1;
    });

    const rankedServices = Object.entries(serviceCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      therapist: therapistObj,
      totalRevenue: totalRevenueCents,
      therapistCut: totalTherapistCutCents,
      spaCut: totalSpaCutCents,
      sessionsCount: therapistApps.length,
      rankedServices
    };
  };

  const individualReport = getSelectedTherapistReport();

  // Custom styling elements for Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0c0c0c] border border-[#D4AF37]/50 rounded-xl p-4 shadow-2xl text-xs font-sans">
          <p className="font-bold text-white mb-2 border-b border-zinc-900 pb-1.5">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} style={{ color: entry.color }} className="font-semibold py-1 flex items-center justify-between gap-4">
              <span className="text-zinc-400">{entry.name}:</span>
              <span className="text-zinc-100 font-bold font-mono">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 text-zinc-100 font-sans">
      
      {/* HEADER SECTION WITH TEMPORAL FILTER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase block">
            BI &amp; Performance Operacional
          </span>
          <h2 className="text-2xl font-light text-white font-serif-luxury tracking-wide">
            Painel Executivo do Spa
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Refresh Button */}
          <button 
            onClick={fetchDashboardData}
            title="Atualizar Dados"
            className="p-2.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:text-[#D4AF37] rounded-xl transition-all duration-300"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>

          {/* Date Reference Selector to easily browse history and future schedules */}
          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2 max-w-xs">
            <Filter className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Mês de Referência</span>
              <input 
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 font-bold focus:outline-none tracking-wide cursor-pointer mt-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-4 text-xs text-red-200 animate-fade-in">
          {error}
        </div>
      )}

      {isLoading ? (
        /* SKELETON LOADING LOOPS FOR PREMIUM LOOK */
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111] h-32 rounded-xl border border-zinc-900"></div>
            <div className="bg-[#111] h-32 rounded-xl border border-zinc-900"></div>
            <div className="bg-[#111] h-32 rounded-xl border border-zinc-900"></div>
          </div>
          <div className="bg-[#111] h-80 rounded-xl border border-zinc-900"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111] h-80 rounded-xl border border-zinc-900"></div>
            <div className="bg-[#111] h-80 rounded-xl border border-zinc-900"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* SECTION 1: APPOINTMENT METRICS (DAILY, WEEKLY, MONTHLY GRID) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* HOJE KPI CARD */}
            <div className="bg-[#0c0c0c] border border-zinc-900 rounded-xl p-6 hover:border-[#D4AF37]/30 transition-all duration-300 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                  Atividade de Hoje
                </span>
                <span className="text-[10px] text-zinc-400">Referência: {selectedDate.split('-').reverse().join('/')}</span>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-4xl font-light text-[#D4AF37] tracking-tight">{todayTotal}</span>
                  <span className="text-xs text-zinc-500 ml-1.5 font-medium">agendados</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-emerald-400 block">{todayCompleted}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500">Concluídos</span>
                </div>
              </div>
              <div className="border-t border-zinc-900/60 pt-3 mt-4 flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Taxa de Conversão Diária</span>
                <span className="font-bold text-zinc-300 font-mono">
                  {todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* ESTA SEMANA KPI CARD */}
            <div className="bg-[#0c0c0c] border border-zinc-900 rounded-xl p-6 hover:border-[#D4AF37]/30 transition-all duration-300 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                  Operação na Semana
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Total de 7 dias úteis</span>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-4xl font-light text-[#D4AF37] tracking-tight">{weekTotal}</span>
                  <span className="text-xs text-zinc-500 ml-1.5 font-medium">sessões</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-emerald-400 block">{weekCompleted}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500">Concluídas</span>
                </div>
              </div>
              <div className="border-t border-zinc-900/60 pt-3 mt-4 flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Aproveitamento Semanal</span>
                <span className="font-bold text-zinc-300 font-mono">
                  {weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* ESTE MÊS KPI & REVENUE CARD */}
            <div className="bg-[#0c0c0c] border border-zinc-900 rounded-xl p-6 hover:border-[#D4AF37]/45 transition-all duration-300 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-24 w-24 bg-[#D4AF37]/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-[#D4AF37]/10" />
              <div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                  Consolidado Mensal (Líquido)
                </span>
                <span className="text-[10px] text-zinc-400">Mês de Referência: {activeMonthPrefix}</span>
              </div>
              <div className="mt-4">
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5">Faturamento Líquido (Pagar.me)</p>
                <span className="text-3xl font-bold text-[#D4AF37] tracking-tight block font-mono">
                  {formatBRL(monthBillingCents)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-t border-zinc-900/60 pt-3 mt-3 text-[9px]">
                <div>
                  <span className="text-zinc-500 block uppercase tracking-wider text-[7px]">Sobra Spa</span>
                  <span className="font-bold text-emerald-400 font-mono block truncate">{formatBRL(monthSpaShareCents)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase tracking-wider text-[7px]">Comissão Equipe</span>
                  <span className="font-bold text-zinc-300 font-mono block truncate">{formatBRL(monthTherapistShareCents)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase tracking-wider text-[7px]">Taxas Retidas</span>
                  <span className="font-bold text-zinc-400 font-mono block truncate">{formatBRL(monthPagarmeFeesCents)}</span>
                </div>
              </div>

              <div className="border-t border-zinc-900/40 pt-2 mt-3 flex items-center justify-between text-[10px]">
                <span className="text-zinc-400">
                  Vol: <strong className="text-white font-mono">{monthCompleted}</strong> concluintes de <strong className="text-zinc-300 font-mono">{monthTotal}</strong>
                </span>
                <span className="font-bold text-emerald-400 font-mono">
                  {monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0}% conv.
                </span>
              </div>
            </div>

          </div>

          {/* SECTION 1.5: NEW ANALYTICAL MODULE (RECHARTS CHART CARD & PERFORMANCE STATS) */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 space-y-6">
            
            {/* Chart Control Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900/80 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Curva de Atendimento &amp; Conversão
                </h3>
                <p className="text-[10px] text-zinc-500">Fluxograma de agendamentos solicitados, concluídos e cancelados no período ativo</p>
              </div>

              {/* Chart Controls & Growth comparison */}
              <div className="flex items-center flex-wrap gap-4">
                
                {/* Growth comparison Badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all duration-300 ${
                  growth.percent > 0 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : growth.percent < 0 
                      ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}>
                  {growth.percent > 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                  ) : growth.percent < 0 ? (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <Percent className="h-3 w-3 text-zinc-500" />
                  )}
                  <span>
                    {growth.percent > 0 ? '+' : ''}{growth.percent}% {growth.label}
                  </span>
                </div>

                {/* Period view selector (Weekly / Monthly toggle buttons) */}
                <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-850">
                  <button 
                    onClick={() => setChartView('weekly')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                      chartView === 'weekly' 
                        ? 'bg-[#D4AF37] text-zinc-950 font-extrabold shadow-sm' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Semana
                  </button>
                  <button 
                    onClick={() => setChartView('monthly')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                      chartView === 'monthly' 
                        ? 'bg-[#D4AF37] text-zinc-950 font-extrabold shadow-sm' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Mês
                  </button>
                </div>

              </div>
            </div>

            {/* Recharts Render Stage */}
            <div className="h-[320px] w-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid stroke="#161616" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#52525b" 
                    fontSize={10} 
                    fontFamily="sans-serif"
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    fontFamily="sans-serif"
                    tickLine={false}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif', paddingTop: '10px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Agendados" 
                    stroke="#D4AF37" 
                    strokeWidth={2}
                    dot={{ r: 3, stroke: '#D4AF37', strokeWidth: 1, fill: '#000' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Concluídos" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ r: 3, stroke: '#10B981', strokeWidth: 1, fill: '#000' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Cancelados" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ r: 3, stroke: '#EF4444', strokeWidth: 1, fill: '#000' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* SECTION 2: ROW FOR SERVICE RANKING & GENERAL TEAM RANKING */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* SERVICES RANKING LIST */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4.5 w-4.5 text-[#D4AF37]" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Serviços Mais Solicitados</h3>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full">
                    Geral
                  </span>
                </div>

                {servicesRanking.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs font-light">
                    Nenhum serviço registrado ou agendado no banco de dados.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {servicesRanking.map((item, index) => (
                      <div 
                        key={item.name} 
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-zinc-500 font-mono w-4">
                            #{index + 1}
                          </span>
                          <div className="truncate">
                            <span className="text-xs font-semibold text-zinc-100 block truncate">{item.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {item.count} {item.count === 1 ? 'atendimento' : 'atendimentos'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-[#D4AF37] block font-mono">
                            {formatBRL(item.totalRevenue)}
                          </span>
                          <span className="text-[8px] uppercase tracking-wider text-zinc-600 block">Faturado</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[9px] text-zinc-500 font-light mt-4 text-left">
                * O ranking acima consolida a somatória histórica geral de solicitações do Spa Experience.
              </div>
            </div>

            {/* TEAM GENERAL RANKING (LEADERBOARD) */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4.5 w-4.5 text-[#D4AF37]" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Performance Geral da Equipe</h3>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full">
                    Mês Ativo
                  </span>
                </div>

                {therapistLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs font-light">
                    Nenhum faturamento gerado para as massoterapeutas no mês de referência.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {therapistLeaderboard.map((item, index) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-zinc-500 font-mono">
                            #{index + 1}
                          </span>
                          <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
                            <img 
                              src={item.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150'} 
                              alt={item.name} 
                              className="h-full w-full"
                              style={getTherapistImageStyle(item)}
                            />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-semibold text-zinc-100 block truncate">{item.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {item.sessionsCount} {item.sessionsCount === 1 ? 'sessão' : 'sessões'} no mês
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-400 block font-mono">
                            {formatBRL(item.totalRevenue)}
                          </span>
                          <span className="text-[8px] uppercase tracking-wider text-zinc-600 block">Gerado Líquido</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[9px] text-zinc-500 font-light mt-4 text-left">
                * Leaderboard ordenado pelo faturamento total de sessões concluídas/pagas gerado exclusivamente no mês de referência.
              </div>
            </div>

          </div>

          {/* SECTION 3: DETAILED INDIVIDUAL PERFORMANCE REPORT MODULE */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[#D4AF37]" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Análise Individual de Performance</h3>
              </div>

              {/* Therapist Selection Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden sm:inline">Selecionar Profissional:</span>
                <select
                  value={selectedTherapistId}
                  onChange={e => setSelectedTherapistId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-bold focus:outline-none focus:border-[#D4AF37]/50 rounded-lg p-2.5 min-w-[180px] cursor-pointer"
                >
                  {therapists.length === 0 ? (
                    <option value="">Nenhuma cadastrada</option>
                  ) : (
                    therapists.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Individual Detailed Card */}
            {!individualReport ? (
              <div className="text-center py-8 text-zinc-500 text-xs font-light">
                Selecione uma profissional acima para detalhar o relatório de performance.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* Summary Box */}
                <div className="md:col-span-5 bg-zinc-900/40 border border-zinc-900/80 rounded-xl p-6 flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[#D4AF37]/40 bg-zinc-950 shrink-0 shadow-lg shadow-[#D4AF37]/10">
                      <img 
                        src={individualReport.therapist.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200'} 
                        alt={individualReport.therapist.name} 
                        className="h-full w-full"
                        style={getTherapistImageStyle(individualReport.therapist)}
                      />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white tracking-wide">{individualReport.therapist.name}</h4>
                      <span className="text-[9px] font-bold text-[#D4AF37] tracking-widest uppercase block mt-1">Colaboradora Spa</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-4">
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-zinc-500 block mb-0.5">Sessões Realizadas</span>
                      <span className="text-base font-bold text-zinc-200 font-mono block">
                        {individualReport.sessionsCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-zinc-500 block mb-0.5">Gerado Líquido (Sessões)</span>
                      <span className="text-base font-bold text-zinc-300 font-mono block">
                        {formatBRL(individualReport.totalRevenue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-[#D4AF37] block mb-0.5">Comissão Massoterapeuta</span>
                      <span className="text-base font-bold text-[#D4AF37] font-mono block">
                        {formatBRL(individualReport.therapistCut)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-emerald-500 block mb-0.5">Sobra Líquida Spa</span>
                      <span className="text-base font-bold text-emerald-400 font-mono block">
                        {formatBRL(individualReport.spaCut)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specific Ranked Services */}
                <div className="md:col-span-7 bg-[#111111]/30 border border-zinc-900 rounded-xl p-6 space-y-4">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">
                      Mix de Serviços Executados
                    </span>
                    <span className="text-[10px] text-zinc-500 block">Ranking das experiências mais oferecidas por ela no mês de referência</span>
                  </div>

                  {individualReport.rankedServices.length === 0 ? (
                    <div className="text-zinc-500 text-xs font-light py-4">
                      Nenhuma massagem executada por esta terapeuta no período selecionado.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {individualReport.rankedServices.map((service, idx) => (
                        <div 
                          key={service.name} 
                          className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/20 border border-zinc-900/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[10px] font-bold text-[#D4AF37] font-mono">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-medium text-zinc-200 truncate">{service.name}</span>
                          </div>
                          <div className="shrink-0">
                            <span className="text-xs font-bold text-zinc-300 font-mono bg-zinc-900 px-2 py-0.5 rounded">
                              {service.count} {service.count === 1 ? 'vez' : 'vezes'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
