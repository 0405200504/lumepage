'use client';

import React from 'react';
import Link from 'next/link';
import {
  DollarSign, Calendar, Users, Activity, Clock, UserPlus, ArrowRight,
  TrendingUp, TrendingDown, Crown, BarChart3, Database, AlertTriangle,
  Bot, MessageSquareWarning, Wifi, WifiOff, Sparkles
} from 'lucide-react';
import { ProfMetric, MonthPoint, StatusCounts, NetworkOps, moneyBR } from '@/lib/admin';
import { statusMeta } from '@/lib/appointments/status';
import { formatDateBR } from '@/lib/whatsapp';
import { AppointmentStatus } from '@/types/database';

interface Totals {
  revenueCents: number; monthRevenueCents: number; appointments: number;
  clients: number; professionals: number; activeProfessionals: number; pending: number;
}
interface RecentItem { id: string; client: string; service: string; date: string; time: string; status: AppointmentStatus; professional: string; }
interface StorageStats { dbSizeBytes: number; tables: { name: string; bytes: number }[]; }

interface AdminOverviewProps {
  adminName: string;
  totals: Totals;
  metrics: ProfMetric[];
  series: MonthPoint[];
  status: StatusCounts;
  recent: RecentItem[];
  storage?: StorageStats | null;
  ops?: NetworkOps | null;
}

/** Variação percentual entre dois períodos (para as setas de crescimento). */
function pctDelta(current: number, previous: number): { pct: number; up: boolean } {
  if (previous === 0) return { pct: current > 0 ? 100 : 0, up: current >= 0 };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

// Limite do plano Free do Supabase (500 MB).
const SUPABASE_FREE_LIMIT_BYTES = 500 * 1024 * 1024;
function formatBytes(b: number): string {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

const STATUS_LABEL: Record<keyof StatusCounts, string> = {
  pending: 'Pendentes', confirmed: 'Confirmados', completed: 'Finalizados', cancelled: 'Cancelados', no_show: 'Faltas',
};

export const AdminOverview: React.FC<AdminOverviewProps> = ({ adminName, totals, metrics, series, status, recent, storage, ops }) => {
  const maxCount = Math.max(1, ...series.map(s => s.count));
  const maxRevenue = Math.max(1, ...metrics.map(m => m.revenueCents));
  const totalStatus = Object.values(status).reduce((a, b) => a + b, 0) || 1;

  // Armazenamento do banco (% do plano Free de 500 MB).
  const storagePct = storage ? Math.min(100, (storage.dbSizeBytes / SUPABASE_FREE_LIMIT_BYTES) * 100) : 0;
  const storageLevel = storagePct >= 90 ? 'crit' : storagePct >= 75 ? 'warn' : 'ok';
  const storageBar = storageLevel === 'crit' ? 'bg-red-500' : storageLevel === 'warn' ? 'bg-amber-500' : 'bg-emerald-500';
  const storageText = storageLevel === 'crit' ? 'text-red-600' : storageLevel === 'warn' ? 'text-amber-600' : 'text-emerald-600';
  const maxTableBytes = storage ? Math.max(1, ...storage.tables.map(t => t.bytes)) : 1;

  const kpis = [
    { label: 'Faturamento total', value: moneyBR(totals.revenueCents), icon: DollarSign, hint: 'Toda a rede (confirmados + concluídos)' },
    { label: 'Faturamento do mês', value: moneyBR(totals.monthRevenueCents), icon: TrendingUp, hint: 'Mês atual' },
    { label: 'Agendamentos', value: totals.appointments, icon: Calendar, hint: 'Ativos na rede' },
    { label: 'Profissionais ativas', value: `${totals.activeProfessionals}/${totals.professionals}`, icon: Activity, hint: 'Em operação' },
    { label: 'Clientes na rede', value: totals.clients, icon: Users, hint: 'Total cadastradas' },
    { label: 'Pendentes', value: totals.pending, icon: Clock, hint: 'Aguardando aprovação' },
  ];

  return (
    <div className="space-y-7 select-none animate-fade-up">
      {/* Banner */}
      <div className="surface-wine text-white p-7 md:p-9 rounded-4xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative overflow-hidden ring-hairline">
        <div className="space-y-2 z-10">
          <span className="text-[10px] font-black uppercase text-wine-200 tracking-[0.2em]">Central da Plataforma</span>
          <h3 className="text-xl md:text-2xl font-black tracking-tight">Olá, {adminName}!</h3>
          <p className="text-xs text-white/65 max-w-md leading-relaxed">
            Monitore o crescimento da rede Lume: faturamento, agendamentos e desempenho de cada profissional.
          </p>
        </div>
        <Link href="/admin/professionals/new" className="z-10 inline-flex items-center gap-2 px-5 py-3.5 bg-white text-wine-700 text-xs font-bold rounded-2xl shadow-soft hover:opacity-95 transition-all-custom shrink-0">
          <UserPlus className="h-4 w-4" /> Cadastrar Profissional
        </Link>
        <div className="absolute right-0 top-0 h-48 w-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4 sm:p-5">
              <div className="inline-flex p-2.5 rounded-2xl bg-wine-700/8 text-wine-700 mb-3"><Icon className="h-5 w-5" /></div>
              <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{k.label}</p>
              <p className="text-lg sm:text-xl font-black text-ink mt-1 leading-none">{k.value}</p>
              <p className="text-[10px] text-gray-450 font-semibold mt-1.5 hidden sm:block leading-tight">{k.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Armazenamento do banco (Supabase) */}
      {storage ? (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex p-2.5 rounded-2xl bg-wine-700/8 text-wine-700"><Database className="h-5 w-5" /></div>
              <div>
                <h3 className="text-base font-black text-ink tracking-tight">Armazenamento do banco</h3>
                <p className="text-xs text-gray-450 mt-0.5">Plano Free do Supabase · limite de 500 MB</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-xl font-black leading-none ${storageText}`}>{storagePct.toFixed(1)}%</p>
              <p className="text-[10px] text-gray-450 font-semibold mt-1">{formatBytes(storage.dbSizeBytes)} de 500 MB</p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="h-3 rounded-full bg-cream overflow-hidden">
            <div className={`h-full rounded-full transition-all ${storageBar}`} style={{ width: `${Math.max(1.5, storagePct)}%` }} />
          </div>

          {storageLevel !== 'ok' && (
            <div className={`flex items-start gap-2 text-xs rounded-2xl p-3 ${storageLevel === 'crit' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {storageLevel === 'crit'
                  ? 'Espaço quase no limite! Faça o upgrade para o Supabase Pro (8 GB) o quanto antes para o sistema não parar.'
                  : 'O banco já passou de 75% do limite gratuito. Comece a planejar o upgrade para o Supabase Pro.'}
              </p>
            </div>
          )}

          {/* Maiores tabelas (o que mais ocupa espaço) */}
          {storage.tables.length > 0 && (
            <div className="pt-1 space-y-2">
              <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">O que mais ocupa espaço</p>
              {storage.tables.slice(0, 5).map((t) => (
                <div key={t.name}>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-ink truncate">{t.name}</span>
                    <span className="text-gray-450 shrink-0">{formatBytes(t.bytes)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-cream overflow-hidden">
                    <div className="h-full rounded-full bg-wine-400" style={{ width: `${Math.max(3, (t.bytes / maxTableBytes) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-5 flex items-start gap-2.5 text-xs text-gray-500">
          <Database className="h-4 w-4 shrink-0 mt-0.5 text-wine-400" />
          <p className="leading-relaxed">
            Para ver o uso de armazenamento do banco, rode <span className="font-bold">supabase/migration_v21_admin_stats.sql</span> no Supabase.
          </p>
        </div>
      )}

      {/* ===== Operação & Saúde da Rede ===== */}
      {ops && (() => {
        const profDelta = pctDelta(ops.newProfsThisMonth, ops.newProfsLastMonth);
        const apptDelta = pctDelta(ops.apptsThisMonth, ops.apptsLastMonth);
        const opCards = [
          { label: 'Novas profissionais (mês)', value: ops.newProfsThisMonth, delta: profDelta, icon: UserPlus, hint: `${ops.newProfsLastMonth} no mês passado` },
          { label: 'Agendamentos (mês)', value: ops.apptsThisMonth, delta: apptDelta, icon: Calendar, hint: `${ops.apptsLastMonth} no mês passado` },
          { label: 'Conversas pendentes', value: ops.pendingConversations, delta: null, icon: MessageSquareWarning, hint: 'Clientes esperando atendimento humano', alert: ops.pendingConversations > 0 },
          { label: 'Automáticas hoje', value: ops.automatedSentToday, delta: null, icon: Bot, hint: `${ops.automatedSentMonth} no mês` },
          { label: 'Mensagens de IA (mês)', value: ops.automatedSentMonth, delta: null, icon: Sparkles, hint: 'Proxy de uso/custo OpenAI' },
          { label: 'Bot configurado', value: `${ops.withBotConfigured}/${ops.totalProfessionals}`, delta: null, icon: Wifi, hint: `${ops.withAutomationsOn} com automações ligadas` },
        ];
        return (
          <div className="space-y-4">
            <h3 className="text-base font-black text-ink tracking-tight">Operação & saúde da rede</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              {opCards.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className={`card p-4 ${c.alert ? 'ring-1 ring-amber-300 bg-amber-50/40' : ''}`}>
                    <div className={`inline-flex p-2.5 rounded-2xl mb-3 ${c.alert ? 'bg-amber-500/15 text-amber-600' : 'bg-wine-700/8 text-wine-700'}`}><Icon className="h-5 w-5" /></div>
                    <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{c.label}</p>
                    <div className="flex items-end gap-1.5 mt-1">
                      <p className="text-lg sm:text-xl font-black text-ink leading-none">{c.value}</p>
                      {c.delta && (
                        <span className={`inline-flex items-center text-[10px] font-bold ${c.delta.up ? 'text-emerald-600' : 'text-red-500'}`}>
                          {c.delta.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{c.delta.pct}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-450 font-semibold mt-1.5 hidden sm:block leading-tight">{c.hint}</p>
                  </div>
                );
              })}
            </div>

            {/* Saúde do bot por profissional */}
            <div className="card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-ink tracking-tight">Automações por profissional</h3>
                <span className="text-[10px] text-gray-450 font-semibold">{ops.botHealth.filter(b => !b.configured).length} sem bot configurado</span>
              </div>
              {ops.botHealth.length === 0 ? (
                <p className="text-xs text-gray-450 py-4 text-center">Nenhuma profissional cadastrada.</p>
              ) : (
                <div className="divide-y divide-gray-150 max-h-80 overflow-y-auto -mx-2">
                  {ops.botHealth.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 px-2 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {b.configured
                          ? <Wifi className="h-4 w-4 text-emerald-500 shrink-0" />
                          : <WifiOff className="h-4 w-4 text-gray-300 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink truncate">{b.brandName}</p>
                          <p className="text-[10px] text-gray-450">
                            {b.configured ? (b.automationsOn ? 'automações ligadas' : 'automações desligadas') : 'WhatsApp não configurado'}
                            {' · '}última: {timeAgo(b.lastFiredAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-wine-700 leading-none">{b.sentToday}</p>
                        <p className="text-[9px] text-gray-450 font-semibold uppercase tracking-wide">hoje</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de agendamentos por mês */}
        <div className="card p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-ink tracking-tight">Agendamentos por mês</h3>
              <p className="text-xs text-gray-450 mt-0.5">Últimos 6 meses · toda a rede</p>
            </div>
            <BarChart3 className="h-5 w-5 text-wine-400" />
          </div>
          <div className="flex items-end justify-between gap-3 h-44 pt-4">
            {series.map((s) => (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-black text-wine-700">{s.count}</span>
                <div className="w-full surface-wine rounded-t-lg transition-all" style={{ height: `${(s.count / maxCount) * 100}%`, minHeight: s.count ? '6px' : '2px', opacity: s.count ? 1 : 0.25 }} />
                <span className="text-[10px] font-bold text-gray-450 capitalize">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição de status */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-black text-ink tracking-tight">Distribuição de status</h3>
          <div className="space-y-3">
            {(Object.keys(STATUS_LABEL) as (keyof StatusCounts)[]).map((key) => {
              const m = statusMeta(key as AppointmentStatus);
              const val = status[key];
              const pct = Math.round((val / totalStatus) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="inline-flex items-center gap-1.5 text-ink"><span className={`h-2 w-2 rounded-full ${m.dot}`} />{STATUS_LABEL[key]}</span>
                    <span className="text-gray-450">{val} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-cream overflow-hidden">
                    <div className={`h-full rounded-full ${m.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top profissionais */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-ink tracking-tight">Top profissionais</h3>
            <Link href="/admin/professionals" className="text-[11px] font-bold text-wine-700 hover:underline flex items-center gap-1">Ver todas <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {metrics.length === 0 ? (
            <p className="text-xs text-gray-450 py-6 text-center">Nenhuma profissional cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {metrics.slice(0, 5).map((m, i) => (
                <Link key={m.id} href={`/admin/professionals/${m.id}`} className="block group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-ink truncate flex items-center gap-1.5">
                      {i === 0 && <Crown className="h-3.5 w-3.5 text-wine-500" />}
                      {m.brandName}
                    </span>
                    <span className="font-black text-wine-700 shrink-0">{moneyBR(m.revenueCents)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-cream overflow-hidden">
                    <div className="h-full rounded-full surface-wine group-hover:opacity-90" style={{ width: `${Math.max(4, (m.revenueCents / maxRevenue) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-450 mt-1">{m.total} agend. · {m.clients} clientes · último: {m.lastAppointmentDate ? formatDateBR(m.lastAppointmentDate) : '—'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Atividade recente */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-ink tracking-tight">Atividade recente</h3>
            <Link href="/admin/appointments" className="text-[11px] font-bold text-wine-700 hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-gray-450 py-6 text-center">Nenhum agendamento ainda.</p>
          ) : (
            <div className="divide-y divide-gray-150">
              {recent.map((r) => {
                const m = statusMeta(r.status);
                return (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{r.client} <span className="text-gray-450 font-normal">· {r.professional}</span></p>
                      <p className="text-[10px] text-gray-450 truncate">{r.service} · {formatDateBR(r.date)} {r.time.substring(0, 5)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${m.badge}`}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminOverview;
