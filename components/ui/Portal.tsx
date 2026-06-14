'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renderiza o conteúdo diretamente no <body>, fora de qualquer ancestral com
 * transform/filter (ex.: animações como animate-fade-up), que quebrariam o
 * position: fixed de modais — fazendo o popup aparecer no lugar errado.
 */
export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

export default Portal;
