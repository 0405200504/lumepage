'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface ModernStatCardProps {
  label: string;
  value: string | React.ReactNode;
  subtitle?: string;
  badge?: string;
  variant?: 'dark' | 'light';
  onClick?: () => void;
  className?: string;
}

/**
 * Card de Métrica de Alta Precisão (estilo referência "Your Sales Analysis").
 * Suporta variante escura (dark hero) e clara (crisp white) com botão de ação circular ↗ no topo direito.
 */
export const ModernStatCard: React.FC<ModernStatCardProps> = ({
  label,
  value,
  subtitle,
  badge,
  variant = 'light',
  onClick,
  className = '',
}) => {
  const isDark = variant === 'dark';

  return (
    <div
      onClick={onClick}
      className={`relative p-6 sm:p-7 rounded-[26px] transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isDark
          ? 'bg-n-950 text-white shadow-lg border border-white/10 hover:border-white/20'
          : 'bg-surface text-heading shadow-sm border border-line/60 hover:border-wine-300 hover:shadow-md'
      } ${className}`}
    >
      {/* Top Header: Label + Circular Arrow Button */}
      <div className="flex items-start justify-between gap-4">
        <span className={`text-caption font-semibold tracking-wide ${isDark ? 'text-n-300' : 'text-n-500'}`}>
          {label}
        </span>

        {onClick && (
          <button
            type="button"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              isDark
                ? 'bg-white/10 text-white group-hover:bg-white group-hover:text-n-950 group-hover:scale-110'
                : 'bg-surface-2 text-n-600 group-hover:bg-wine-700 group-hover:text-white group-hover:scale-110'
            }`}
            aria-label={`Ver detalhes de ${label}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Big Number */}
      <div className="my-4">
        <p className={`text-h1 sm:text-display font-bold num tracking-tight leading-none ${
          isDark ? 'text-white' : 'text-heading'
        }`}>
          {value}
        </p>
      </div>

      {/* Footer / Subtitle */}
      {(subtitle || badge) && (
        <div className="flex items-center gap-2 pt-2">
          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-micro font-bold ${
              isDark ? 'bg-white/15 text-white' : 'bg-wine-50 text-wine-700'
            }`}>
              {badge}
            </span>
          )}
          {subtitle && (
            <span className={`text-micro truncate ${isDark ? 'text-n-400' : 'text-n-500'}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ModernStatCard;
