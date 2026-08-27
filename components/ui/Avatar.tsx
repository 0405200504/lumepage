import React from 'react';

/** Iniciais em wine-50 com texto wine-700 — sem foto, sem cor aleatória por pessoa. */
export const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  name,
  size = 'md',
  className = '',
}) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const dim = size === 'sm' ? 'h-8 w-8 text-caption' : size === 'lg' ? 'h-12 w-12 text-h3' : 'h-10 w-10 text-label';
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full bg-wine-50 text-wine-700 font-semibold ${dim} ${className}`}
      aria-hidden
    >
      {initials || '·'}
    </span>
  );
};

export default Avatar;
