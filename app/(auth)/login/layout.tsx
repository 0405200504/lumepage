import type { Viewport } from 'next';

// A página é client component e não exporta viewport; o layout faz isso por
// ela. Barras do navegador (Android e iOS antes do 26) no bordô da borda do
// vídeo, o mesmo de .login-backdrop em globals.css.
export const viewport: Viewport = {
  themeColor: '#2d0c17',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
