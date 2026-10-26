import React from 'react';

interface StructuredTextProps {
  text: string;
  className?: string;
}

export const StructuredText: React.FC<StructuredTextProps> = ({ text, className = "text-sm text-zinc-300 font-medium leading-relaxed" }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className={`space-y-2 whitespace-pre-line ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        let content = trimmed;

        if (isBullet) {
          content = trimmed.replace(/^[•-]\s*/, '');
        }

        // Standardize both markdown ** and html <strong> tags
        const normalized = content
          .replace(/<strong>/g, '**')
          .replace(/<\/strong>/g, '**');

        const parts = normalized.split('**');
        const parsed = parts.map((part, partIdx) => {
          if (partIdx % 2 === 1) {
            return (
              <strong key={partIdx} className="text-[#D4AF37] font-bold">
                {part}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5 my-1 text-left">
              <span className="text-[#D4AF37] shrink-0 font-extrabold mt-1">•</span>
              <span className="flex-1 text-zinc-300">{parsed}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-left">
            {parsed}
          </p>
        );
      })}
    </div>
  );
};
