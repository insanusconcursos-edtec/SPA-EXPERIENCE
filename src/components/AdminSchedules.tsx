import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Save, 
  Loader2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { BusinessOpeningHours, DaySchedule } from '../types';

const DAYS_OF_WEEK_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

// Pristine default schedule fallback
const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = Array.from({ length: 7 }, (_, index) => ({
  dayOfWeek: index,
  isOpen: index !== 0, // Closed on Sundays by default
  intervals: [{ start: '09:00', end: '19:00' }]
}));

export const AdminSchedules: React.FC = () => {
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_WEEKLY_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load configuration from Firestore
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const configDocRef = doc(db, 'config', 'opening_hours');
        const docSnap = await getDoc(configDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as BusinessOpeningHours;
          if (data.weeklySchedule && data.weeklySchedule.length === 7) {
            setSchedule(data.weeklySchedule);
          }
        }
      } catch (err: any) {
        console.error('Error loading business hours config:', err);
        setError('Falha ao conectar e recuperar os horários de funcionamento do Firestore.');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleToggleDay = (dayIndex: number) => {
    setSchedule(prev => 
      prev.map(day => 
        day.dayOfWeek === dayIndex 
          ? { ...day, isOpen: !day.isOpen } 
          : day
      )
    );
  };

  const handleIntervalChange = (dayIndex: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => 
      prev.map(day => {
        if (day.dayOfWeek === dayIndex) {
          const updatedIntervals = [...day.intervals];
          if (updatedIntervals.length === 0) {
            updatedIntervals.push({ start: '09:00', end: '19:00' });
          }
          updatedIntervals[0] = {
            ...updatedIntervals[0],
            [field]: value
          };
          return {
            ...day,
            intervals: updatedIntervals
          };
        }
        return day;
      })
    );
  };

  const handleSaveSchedule = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const configDocRef = doc(db, 'config', 'opening_hours');
      
      const payload: BusinessOpeningHours = {
        id: 'opening_hours',
        weeklySchedule: schedule,
        updatedAt: serverTimestamp()
      };

      await setDoc(configDocRef, payload);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3500);

    } catch (err: any) {
      console.error('Error saving opening hours:', err);
      setError('Erro ao salvar os novos horários no Firebase Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        <span className="text-sm font-sans tracking-widest text-zinc-500 uppercase">Carregando Agenda de Operação...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase block mb-1">Planejamento Semanal</span>
          <h2 className="text-2xl font-light text-white font-serif-luxury tracking-wide">Horários de Funcionamento</h2>
        </div>
        <button
          onClick={handleSaveSchedule}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/15 transition-all duration-300 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-black" />
              <span>Gravando...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Salvar Planejamento</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-4 text-xs font-sans text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-900 rounded-lg p-4 text-xs font-sans text-emerald-200">
          Planejamento de horários do Spa salvo e ativado no Firestore com sucesso!
        </div>
      )}

      {/* Weekday List Structure */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl divide-y divide-zinc-900/60 overflow-hidden">
        {schedule.map((day) => {
          const dayName = DAYS_OF_WEEK_NAMES[day.dayOfWeek];
          const firstInterval = day.intervals[0] || { start: '09:00', end: '19:00' };

          return (
            <div 
              key={day.dayOfWeek}
              className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors duration-200 ${
                day.isOpen ? 'bg-transparent' : 'bg-zinc-950/40'
              }`}
            >
              {/* Day Label & Toggle */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleToggleDay(day.dayOfWeek)}
                  className="focus:outline-none transition-transform active:scale-95 text-[#D4AF37]"
                  title={day.isOpen ? 'Alterar para Fechado' : 'Alterar para Aberto'}
                >
                  {day.isOpen ? (
                    <ToggleRight className="h-10 w-10 text-[#D4AF37]" />
                  ) : (
                    <ToggleLeft className="h-10 w-10 text-zinc-700" />
                  )}
                </button>
                <div>
                  <h3 className="text-sm font-semibold tracking-wide text-zinc-100 font-sans">{dayName}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-widest block mt-0.5 ${
                    day.isOpen ? 'text-emerald-400' : 'text-zinc-500'
                  }`}>
                    {day.isOpen ? 'Aberto para Atendimentos' : 'Fechado / Recesso'}
                  </span>
                </div>
              </div>

              {/* Time Inputs */}
              {day.isOpen ? (
                <div className="flex items-center gap-3 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Início</span>
                    <input 
                      type="time" 
                      value={firstInterval.start}
                      onChange={e => handleIntervalChange(day.dayOfWeek, 'start', e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg px-3 py-2 text-xs text-zinc-100 font-bold"
                    />
                  </div>
                  
                  <span className="text-zinc-600 text-xs font-semibold px-1">às</span>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Término</span>
                    <input 
                      type="time" 
                      value={firstInterval.end}
                      onChange={e => handleIntervalChange(day.dayOfWeek, 'end', e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg px-3 py-2 text-xs text-zinc-100 font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-zinc-500 italic font-sans py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <span>Sem turnos de atendimento previstos para este dia.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
