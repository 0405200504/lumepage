import { redirect } from 'next/navigation';
import { authService } from '@/lib/auth/auth';

export default async function HomePage() {
  const session = await authService.getCurrentUser();

  // Tudo começa a partir da tela de login.
  if (session) {
    redirect(session.role === 'super_admin' ? '/admin' : '/dashboard');
  }

  redirect('/login');
}
