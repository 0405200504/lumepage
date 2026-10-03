import type { Viewport } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';

// Mesmo preto do login (app/(auth)/login/page.tsx).
export const viewport: Viewport = { themeColor: '#000000' };

/** Pedir o link de senha nova: o cartão de entrada aberto na aba "Recuperar senha". */
export default function ForgotPasswordPage() {
  return <AuthCard initialTab="recuperar" />;
}
