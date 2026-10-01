import React from 'react';

/** Foto de perfil quando existe; senão, iniciais em wine-50 com texto wine-700 —
 *  sem cor aleatória por pessoa. */
export const Avatar: React.FC<{
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ name, src, size = 'md', className = '' }) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const dim =
    size === 'sm' ? 'h-8 w-8 text-caption'
    : size === 'lg' ? 'h-12 w-12 text-h3'
    : size === 'xl' ? 'h-20 w-20 text-h2'
    : 'h-10 w-10 text-label';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`inline-block shrink-0 rounded-full object-cover bg-wine-50 ${dim} ${className}`}
        aria-hidden
      />
    );
  }

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
