'use client';

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isChimeEnabled, setChimeEnabled, playAppChime } from '@/lib/ui/appChime';

/**
 * Liga/desliga o som da abertura (components/ui/AppSplash).
 *
 * Mora no rodapé da navegação porque é ali que ficam as coisas da conta, e
 * porque quem quer desligar um som procura menu, não a tela de configurações
 * — que aqui é sobre o negócio (horário, valores, marca), não sobre o
 * aparelho. A preferência é do APARELHO mesmo: fica em localStorage, não no
 * banco. A profissional pode querer silêncio no celular do atendimento e som
 * no computador da recepção.
 *
 * Ligar toca o sino na hora. Isso é de propósito duas vezes: mostra o que
 * foi ligado e, como o clique é um gesto do usuário, destrava o áudio do
 * navegador nesta aba.
 */
export const SplashSoundToggle: React.FC = () => {
  // `null` = ainda não sabe. O valor mora no navegador e só pode ser lido
  // depois da montagem: ler durante o render faria servidor e cliente
  // desenharem estados diferentes e quebraria a hidratação.
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(isChimeEnabled());
  }, []);

  const toggle = () => {
    const next = on === null ? !isChimeEnabled() : !on;
    setOn(next);
    setChimeEnabled(next);
    if (next) playAppChime();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on ?? true}
      title={on === false ? 'Ligar o som de abertura do app' : 'Desligar o som de abertura do app'}
      className="rail-row w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700"
    >
      {on === false ? (
        <VolumeX className="h-5 w-5 shrink-0" aria-hidden />
      ) : (
        <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
      )}
      <span className="flex-1 text-left truncate">Som de abertura</span>
      <span className="text-caption font-semibold text-n-500 shrink-0">
        {on === null ? '' : on ? 'Ligado' : 'Desligado'}
      </span>
    </button>
  );
};

export default SplashSoundToggle;
