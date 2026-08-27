'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { logoutAction } from '@/app/actions/professional';

/** Única saída do paywall: sair da conta. */
export function SairButton() {
  const router = useRouter();
  const { error } = useToast();

  const handleLogout = async () => {
    try {
      await logoutAction();
      router.push('/login');
    } catch {
      error('Erro', 'Não foi possível sair da conta.');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="tap inline-flex items-center gap-1.5 rounded-full border border-grafite/15 bg-lp-cream px-3.5 py-1.5 text-caption font-semibold uppercase tracking-[0.15em] text-grafite/50 transition-colors hover:border-bordo hover:text-bordo"
    >
      <LogOut className="h-3 w-3" />
      <span>Sair</span>
    </button>
  );
}
