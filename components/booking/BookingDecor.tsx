'use client';

import React from 'react';
import { Sparkles, Star, Flower2, Heart } from 'lucide-react';
import { BookingTheme, normalizeTheme } from '@/lib/booking-theme';

interface BookingDecorProps {
  theme?: string | null;
  color: string; // cor secundária da marca
}

// Posições delicadas e espalhadas das decorações no cabeçalho
const SPOTS = [
  { top: '12%', left: '8%', size: 16, op: 0.5, rot: -15 },
  { top: '62%', left: '15%', size: 11, op: 0.35, rot: 10 },
  { top: '20%', left: '86%', size: 20, op: 0.55, rot: 12 },
  { top: '70%', left: '78%', size: 13, op: 0.4, rot: -8 },
  { top: '40%', left: '50%', size: 10, op: 0.25, rot: 0 },
  { top: '82%', left: '45%', size: 14, op: 0.3, rot: 18 },
];

const ICONS: Record<Exclude<BookingTheme, 'none'>, React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>> = {
  sparkles: Sparkles,
  stars: Star,
  flowers: Flower2,
  hearts: Heart,
};

/** Elementos decorativos delicados (estrelas, brilhos, flores...) no cabeçalho do agendamento. */
export const BookingDecor: React.FC<BookingDecorProps> = ({ theme, color }) => {
  const t = normalizeTheme(theme);
  if (t === 'none') return null;
  const Icon = ICONS[t];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {SPOTS.map((s, i) => (
        <Icon
          key={i}
          strokeWidth={1.5}
          className="absolute animate-pulse-soft"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            color,
            opacity: s.op,
            transform: `rotate(${s.rot}deg)`,
            fill: t === 'stars' || t === 'hearts' ? color : 'none',
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
};

export default BookingDecor;
