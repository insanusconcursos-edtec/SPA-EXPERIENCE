import React from 'react';
import { Service } from '../types';
import { Play, Clock, Sparkles } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
  onClick: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onClick }) => {
  // Convert price cents to readable BRL format
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(service.price / 100);

  return (
    <div
      id={`service-card-${service.id}`}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-lg bg-zinc-950 transition-all duration-500 ease-out hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] border border-zinc-900 hover:border-[#D4AF37]/40"
    >
      {/* Netflix Vertical Ratio: Aspect 2/3 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <img
          src={service.imageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1000'}
          alt={service.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-hover:brightness-[0.75]"
          referrerPolicy="no-referrer"
        />

        {/* Dark to gold/black gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

        {/* Hover Action Highlight */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/35 ring-4 ring-black">
            {service.videoUrl && service.videoUrl.trim().length > 0 ? (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            ) : (
              <Sparkles className="h-6 w-6 text-black" />
            )}
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/85 px-2.5 py-1 text-xs font-semibold text-[#D4AF37] border border-[#D4AF37]/20 backdrop-blur-md">
          <Clock className="h-3 w-3" />
          <span>{service.durationMinutes} min</span>
        </div>
      </div>

      {/* Card Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-flex items-center gap-1 rounded bg-[#D4AF37]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] border border-[#D4AF37]/20">
            <Sparkles className="h-2.5 w-2.5" />
            Premium
          </span>
        </div>
        <h3 className="text-base font-bold tracking-tight text-zinc-100 group-hover:text-[#D4AF37] transition-colors duration-300 font-serif-luxury">
          {service.name}
        </h3>
        <p className="mt-1 text-sm font-semibold text-[#D4AF37]">
          {formattedPrice}
        </p>
      </div>
    </div>
  );
};
