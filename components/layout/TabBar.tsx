'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarRange, Wallet, Contact } from 'lucide-react';

/**
 * Dock do celular — flutuante, escuro, quatro atalhos. Só abaixo de `lg`.
 *
 * Era uma barra branca colada na borda inferior, de ponta a ponta, com um
 * traço de 3px em cima do item ativo e cinco rótulos em caixa alta. Não
 * tinha nada de errado — e nada de memorável. As referências resolvem a
 * mesma função com um objeto FLUTUANTE: uma cápsula escura, descolada da
 * borda, que se lê como controle do aplicativo e não como rodapé do site.
 *
 * O item ativo ABRE numa pílula com ícone + rótulo; os outros ficam só com
 * o ícone. É o melhor dos dois: o visual limpo de um dock de ícones e a
 * clareza de sempre saber onde se está, sem cinco palavras competindo.
 *
 * O dock tem QUATRO posições, não cinco: o botão que abria o menu completo
 * voltou para o topo da tela, como hambúrguer. Um ícone de grade no meio de
 * uma cápsula escura não se anunciava como "menu", e a gaveta lateral com os
 * dezoito destinos não estava sendo encontrada. Aqui ficam só os atalhos do
 * dia a dia — o dock é atalho, não é o índice do produto.
 */
const ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarRange },
  { href: '/dashboard/finance', label: 'Contas', icon: Wallet },
  { href: '/dashboard/clients', label: 'Contatos', icon: Contact },
] as const;

export const TabBar: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 pb-safe pointer-events-none"
    >
      <div className="mx-auto mb-3 w-fit max-w-[calc(100vw-2rem)] pointer-events-auto
        flex items-center gap-1 p-1.5 rounded-full bg-ink-surface shadow-[var(--shadow-lg)]">
        {ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const exact = 'exact' in rest && rest.exact;
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              /* 48px de alvo com folga — a régua do brief é 44. */
              className={`relative flex items-center justify-center gap-2 h-12 rounded-full
                transition-[background-color,color,padding] duration-[var(--dur-base)] ease-[var(--ease-out)]
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white
                ${active
                  ? 'bg-wine-700 text-white px-4'
                  : 'w-12 text-white/55 active:text-white'}`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {active && (
                <span className="text-body-sm font-bold whitespace-nowrap">{label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;
