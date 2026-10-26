import React from 'react';
import { Service, Therapist } from '../types';
import { X, Clock, DollarSign, Sparkles, User, Play, HelpCircle, CheckCircle } from 'lucide-react';
import { StructuredText } from './StructuredText';
import { getTherapistImageStyle } from '../utils/imageUtils';

interface ServiceModalProps {
  service: Service;
  therapists: Therapist[];
  onClose: () => void;
  onBook: () => void;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ service, therapists, onClose, onBook }) => {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(service.price / 100);

  // Filter therapists who have this service in their specialties
  const qualifiedTherapists = therapists.filter(t => t.specialties.includes(service.id));

  return (
    <div
      id="service-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-4 sm:p-6 flex items-start sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        id="service-modal-container"
        className="relative w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] rounded-xl bg-zinc-950 border border-[#D4AF37]/30 overflow-hidden shadow-gold-glow flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-modal-button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-zinc-400 hover:text-[#D4AF37] border border-zinc-800 hover:border-[#D4AF37]/30 transition-all duration-300"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto flex-1 custom-scrollbar pr-1">
          {/* Left Column: Visual & Video Trailer */}
          <div className="relative bg-zinc-900">
            <div className="relative aspect-video md:aspect-[3/4] w-full overflow-hidden">
              <img
                src={service.imageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1000'}
                alt={service.name}
                className="h-full w-full object-cover brightness-[0.70]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/40" />

              {/* Simulated Cinematic Video Play Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <span className="mb-2 text-xs font-bold tracking-widest text-[#D4AF37] uppercase flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> DEMONSTRAÇÃO CINEMÁTICA
                </span>
                <div className="group flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-[#D4AF37] text-black shadow-xl shadow-[#D4AF37]/20 hover:scale-110 transition-all duration-300">
                  <Play className="h-7 w-7 fill-current ml-1 group-hover:scale-105 transition-transform" />
                </div>
                <p className="mt-4 text-xs text-zinc-400 font-medium max-w-[280px]">
                  Assista à demonstração técnica da terapia (Placeholder de vídeo)
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed content */}
          <div className="p-6 md:p-8 flex flex-col justify-between bg-zinc-950">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-[#D4AF37]/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[#D4AF37] border border-[#D4AF37]/20">
                  Experiência Exclusiva
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-white font-serif-luxury">
                {service.name}
              </h2>
              
              {/* Price and Duration Row */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold border-y border-zinc-900 py-3">
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <Clock className="h-4 w-4" />
                  <span>Duração: {service.durationMinutes} min</span>
                </div>
                <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <HelpCircle className="h-4 w-4" />
                  <span>Preparação: {service.preparationMinutes} min</span>
                </div>
                <div className="h-4 w-px bg-zinc-800" />
                <div className="text-xl font-bold text-white tracking-tight">
                  {formattedPrice}
                </div>
              </div>

              {/* Description */}
              <div className="mt-5">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Sobre a Terapia
                </h4>
                <StructuredText text={service.description} />
              </div>

              {/* Specialized Therapists list */}
              <div className="mt-6">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  Massoterapeutas Qualificadas
                </h4>
                {qualifiedTherapists.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {qualifiedTherapists.map((therapist) => (
                      <div
                        key={therapist.id}
                        className="flex items-center gap-2.5 rounded-lg bg-zinc-900/60 p-2 border border-zinc-850 hover:border-[#D4AF37]/20 transition-all duration-300"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#D4AF37]/40 shadow-sm bg-zinc-900">
                          {therapist.avatarUrl ? (
                            <img
                              src={therapist.avatarUrl}
                              alt={therapist.name}
                              className="h-full w-full object-cover"
                              style={getTherapistImageStyle(therapist)}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-zinc-850 text-[#D4AF37]">
                              <User className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate text-xs font-bold text-zinc-200">
                            {therapist.name}
                          </p>
                          <p className="text-[10px] text-[#D4AF37] font-semibold flex items-center gap-0.5">
                            <CheckCircle className="h-2.5 w-2.5" /> Especialista
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    Nenhuma terapeuta vinculada a este serviço no momento.
                  </p>
                )}
              </div>
            </div>

            {/* CTA Book Action Button */}
            <div className="mt-8 pt-4 border-t border-zinc-900">
              <button
                id="book-now-button"
                onClick={onBook}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/25 hover:from-[#CFB53B] hover:to-[#D4AF37] focus:outline-none transition-all duration-300 active:scale-[0.98]"
              >
                <span>Agendar Esta Sessão</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
