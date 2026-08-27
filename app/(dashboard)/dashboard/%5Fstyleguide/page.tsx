import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { StyleguideClient } from './StyleguideClient';

/**
 * `/dashboard/_styleguide`
 *
 * ⚠️ A pasta se chama `%5Fstyleguide`, não `_styleguide`. No App Router uma
 * pasta iniciada por underscore é uma PRIVATE FOLDER: fica fora do
 * roteamento e a URL dá 404. `%5F` é a forma percent-encoded do underscore
 * e é justamente o escape que o Next oferece para criar um segmento que
 * começa com "_". A URL final continua sendo /dashboard/_styleguide.
 *
 * A rota vive dentro do grupo (dashboard), então herda o layout e a
 * exigência de sessão — não é uma página pública.
 */
export const metadata = {
  title: 'Styleguide | Lume',
  robots: { index: false, follow: false },
};

export default async function StyleguidePage() {
  await requireProfessional();
  return <StyleguideClient />;
}
