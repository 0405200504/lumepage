'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarRange, Wallet, Contact, Menu } from 'lucide-react';
import { OPEN_NAV_EVENT } from './Sidebar';

/**
 * Barra de abas do celular — 5 itens, e só abaixo de `lg`.
 *
 * O que ela corrige: no mobile a navegação inteira vivia atrás de um
 * hambúrguer no topo. Vinte destinos escondidos num botão de 40px no canto
 * mais distante do polegar, e nenhuma pista de onde a profissional estava.
 * Uma barra fixa no rodapé põe os cinco destinos reais do dia a dia ao
 * alcance do dedo e resolve, de graça, a indicação de posição.
 *
 * "Mais" abre a gaveta com o menu completo — o hambúrguer não some, muda de
 * lugar: sai do topo (onde ninguém alcança) e vira o quinto item daqui.
 *
 * O indicador é um traço de 3px na ARESTA SUPERIOR do item ativo, não uma
 * cápsula preenchida: mesma gramática do segmented control.
 */
const ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarRange },
  { href: '/dashboard/finance', label: 'Financeiro', icon: Wallet },
  { href: '/dashboard/clients', label: 'Contatos', icon: Contact },
] as const;

export const TabBar: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface pb-safe"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const exact = 'exact' in rest && rest.exact;
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                /* min-h-14 garante o alvo de toque de 44px com folga para o
                   rótulo — a régua do brief é 44, e um item de tab bar com
                   ícone + texto precisa de mais que o mínimo. */
                className={`relative flex flex-col items-center justify-center gap-1 min-h-14 transition-ui
                  focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700
                  ${active ? 'text-wine-700' : 'text-n-500'}`}
              >
                {active && (
                  <span className="absolute top-0 inset-x-3 h-[3px] bg-wine-700" aria-hidden />
                )}
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                <span className="mono-micro">{label}</span>
              </Link>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_NAV_EVENT))}
            aria-label="Abrir menu completo"
            className="w-full relative flex flex-col items-center justify-center gap-1 min-h-14 text-n-500 transition-ui
              focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700"
          >
            <Menu className="h-[18px] w-[18px]" aria-hidden />
            <span className="mono-micro">Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default TabBar;
