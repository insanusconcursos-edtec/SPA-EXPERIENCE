import React from 'react';
import { Sparkles } from 'lucide-react';

interface AdminPlaceholderProps {
  title: string;
}

export const AdminPlaceholder: React.FC<AdminPlaceholderProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-12 w-12 rounded-xl border border-zinc-900 bg-zinc-950 flex items-center justify-center text-[#D4AF37] shadow-gold-premium mb-5">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-light font-serif-luxury tracking-wide text-zinc-300 capitalize">
        {title}
      </h3>
      <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed">
        Esta seção está em fase de modelagem de dados e será conectada à base do Firebase nas próximas atualizações.
      </p>
    </div>
  );
};
