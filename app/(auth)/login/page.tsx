import type { Viewport } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';

// Barras do navegador (Android e iOS antes do 26) no preto da borda do vídeo,
// o mesmo de .login-backdrop em globals.css.
export const viewport: Viewport = { themeColor: '#000000' };

export default function LoginPage() {
  return <AuthCard initialTab="entrar" />;
}
