'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Menu, Search } from 'lucide-react';
import { OPEN_ADMIN_NAV_EVENT, OPEN_ADMIN_SEARCH_EVENT } from './AdminSidebar';

/**
 * Cabeçalho da tela do admin.
 *
 * Era uma faixa fixa de duas linhas: trilha de navegação, busca, alternador de
 * densidade, alternador de tema, sino, chip de identidade — e só então o título.
 * Sobrou o que uma tela precisa: título, uma linha de contexto e as ações da
 * própria tela. Busca e identidade moram na barra lateral; tema foi para
 * Sistema › Configurações; densidade deixou de existir.
 *
 * Telas de detalhe recebem `backHref` e ganham a seta de volta acima do título,
 * no lugar da trilha.
 */
interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function AdminTopbar({ title, subtitle, actions, backHref, backLabel = 'Voltar' }: Props) {
  return (
    <header className="pt-4 lg:pt-7 pb-5 lg:pb-6 flex flex-wrap items-start gap-x-4 gap-y-3 select-none">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_ADMIN_NAV_EVENT))}
        aria-label="Abrir menu de navegação"
        className="lg:hidden icon-chip h-11 w-11 -ml-1.5 shrink-0 mt-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-1 text-caption font-semibold text-n-500 hover:text-heading transition-ui mb-1.5">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {backLabel}
          </Link>
        )}
        <h1 className="text-h2 text-heading truncate">{title}</h1>
        {subtitle && <p className="text-caption text-n-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
        {actions}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_ADMIN_SEARCH_EVENT))}
          aria-label="Buscar"
          className="lg:hidden icon-chip h-10 w-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
        >
          <Search className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
    </header>
  );
}

export default AdminTopbar;
