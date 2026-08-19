import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProfessionalAgenda } from '@/lib/admin/professional-detail';
import { brl, formatDateBR } from '@/lib/format';

/**
 * Calendário do mês da profissional, renderizado com os componentes do admin —
 * mesmo banco, sem iframe e sem sessão de suporte. Somente leitura por construção:
 * não há uma única ação de escrita nesta árvore.
 */

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const STATUS_DOT: Record<string, string> = {
  pending: 'var(--color-warn)',
  confirmed: 'var(--color-accent-link)',
  completed: 'var(--color-ok)',
  no_show: 'var(--color-bad)',
  cancelled: 'var(--color-faint)',
};

export function AgendaMonth({ agenda, basePath }: { agenda: ProfessionalAgenda; basePath: string }) {
  const [y, m] = agenda.month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  // Semana começa na segunda (getDay: 0 = domingo).
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const byDate = new Map(agenda.days.map(d => [d.date, d]));
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${agenda.month}-${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <div className="space-y-4">
      <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
        <Link href={`${basePath}&month=${agenda.prevMonth}`} scroll={false} aria-label="Mês anterior"
          className="inline-flex items-center justify-center h-8 w-8 rounded-[4px] border border-line text-muted hover:text-ink hover:bg-surface-2">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
        <h2 className="text-sm font-bold text-ink capitalize min-w-[10rem]">{agenda.label}</h2>
        <Link href={`${basePath}&month=${agenda.nextMonth}`} scroll={false} aria-label="Próximo mês"
          className="inline-flex items-center justify-center h-8 w-8 rounded-[4px] border border-line text-muted hover:text-ink hover:bg-surface-2">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>

        <span className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <span className="text-muted">
            <strong className="text-ink tabular-nums text-sm">{agenda.totals.appointments}</strong> atendimento(s)
          </span>
          <span className="text-muted">
            <strong className="text-ink tabular-nums text-sm">{brl(agenda.totals.revenueCents)}</strong> no mês
          </span>
          {agenda.totals.busiestDate && (
            <span className="text-muted">dia mais cheio: <strong className="text-ink tabular-nums">{formatDateBR(agenda.totals.busiestDate)}</strong></span>
          )}
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 bg-surface-2 border-b border-line">
          {WEEKDAYS.map(d => (
            <span key={d} className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted text-center">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-[6.5rem] border-b border-r border-line/60 bg-surface-2/30" />;
            const day = byDate.get(date);
            const isToday = date === todayKey;
            return (
              <div key={date} className={`min-h-[6.5rem] border-b border-r border-line/60 p-1.5 ${isToday ? 'bg-accent-soft/60' : ''}`}>
                <span className={`block text-[11px] tabular-nums mb-1 ${isToday ? 'font-bold text-accent-link' : 'text-muted'}`}>
                  {Number(date.slice(-2))}
                </span>
                <ul className="space-y-0.5">
                  {(day?.items ?? []).slice(0, 4).map(a => (
                    <li key={a.id} className="flex items-center gap-1 text-[10px] leading-tight" title={`${a.start} · ${a.clientName} · ${a.serviceName} · ${brl(a.priceCents)}`}>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[a.status] ?? 'var(--color-faint)' }} aria-hidden />
                      <span className="tabular-nums text-muted shrink-0">{a.start}</span>
                      <span className={`truncate ${a.status === 'cancelled' ? 'line-through text-faint' : 'text-ink'}`}>{a.clientName}</span>
                    </li>
                  ))}
                  {day && day.items.length > 4 && (
                    <li className="text-[10px] font-bold text-muted">+{day.items.length - 4} mais</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted">
        Somente leitura. Para mexer na agenda dela, use <strong className="text-ink">Entrar como · editar</strong> —
        assim a alteração fica registrada no nome de quem a fez.
      </p>
    </div>
  );
}

export default AgendaMonth;
