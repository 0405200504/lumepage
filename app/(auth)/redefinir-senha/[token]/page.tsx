import React from 'react';
import Link from 'next/link';
import { peekAccessToken } from '@/lib/access-tokens';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { LumeLogo } from '@/components/ui/LumeLogo';

export const metadata = { title: 'Criar nova senha | Lume' };
export const dynamic = 'force-dynamic';

/**
 * Tela de nova senha, aberta pelo link de redefinição (1h, uso único).
 * A validade é conferida aqui SEM queimar o token — quem queima é a troca de senha,
 * então um link aberto e abandonado continua valendo até expirar.
 */
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await peekAccessToken(token, 'reset');

  return (
    <div
      className="min-h-screen min-h-dvh flex flex-col justify-center items-center px-4 py-20 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 90% at 85% -10%, rgba(140,36,56,0.5) 0%, transparent 55%), radial-gradient(110% 90% at 0% 110%, rgba(80,11,24,0.55) 0%, transparent 50%), linear-gradient(160deg, #26040a 0%, #1a0409 55%, #120207 100%)',
      }}
    >
      <div className="max-w-md w-full z-10">
        <div className="flex flex-col items-center mb-6">
          <LumeLogo variant="light" className="h-12 text-white mb-5" />
          <h1 className="text-2xl font-black text-white tracking-tight">Criar uma nova senha</h1>
          <p className="text-xs text-white/55 mt-1.5">Você escolhe. Ninguém da Lume vê o que você digitar aqui.</p>
        </div>

        <div className="card-elevated p-7 md:p-9">
          {check.ok ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm font-bold text-ink">{check.error}</p>
              <p className="text-xs text-muted">
                Links de redefinição valem uma hora e só funcionam uma vez — é o que impede
                que alguém reaproveite o seu.
              </p>
              <Link href="/login" className="inline-block w-full py-3.5 surface-wine text-white text-sm font-bold rounded-2xl">
                Voltar para o login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
