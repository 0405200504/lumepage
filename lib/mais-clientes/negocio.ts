/**
 * O que o Lume já sabe da profissional e que o formulário NÃO pergunta de
 * novo: serviços e preços, os que mais faturam, a agenda vaga da semana,
 * cidade, WhatsApp e o link de agendamento.
 */

import { dbService } from '@/lib/supabase/db';
import { getFreeCapacity } from '@/lib/appointments/slots';
import { raioPadrao } from './regras';
import type { Professional } from '@/types/database';

export interface ServicoResumo {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  /** Faturamento dos últimos 90 dias (concluídos e confirmados). */
  faturamento_cents: number;
  atendimentos: number;
}

export interface ResumoNegocio {
  servicos: ServicoResumo[];
  /** Os 3 que mais faturam (a sugestão inicial dos serviços em foco). */
  top3: string[];
  agendaVaga: { total: number; dias: { data: string; livres: number }[]; duracaoBase: number };
  cidade: string;
  uf: string;
  raioSugerido: number;
  whatsapp: string;
  instagram: string;
  nome: string;
  linkAgendamento: string;
}

const dataSP = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

export async function resumoNegocio(professionalId: string, appUrl: string): Promise<ResumoNegocio> {
  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - 90 * 864e5);
  const [pro, servicosTodos, agendamentos] = await Promise.all([
    dbService.getProfessionalById(professionalId) as Promise<Professional | null>,
    dbService.getServicesByProfessional(professionalId).catch(() => []),
    dbService.getAppointmentsByProfessionalInRange(professionalId, dataSP(inicio), dataSP(hoje)).catch(() => []),
  ]);

  const ativos = servicosTodos.filter(s => s.is_active);
  const porId = new Map(ativos.map(s => [s.id, s]));
  const fat = new Map<string, { cents: number; n: number }>();
  for (const a of agendamentos) {
    if (a.status !== 'completed' && a.status !== 'confirmed') continue;
    const ids = a.service_ids?.length ? a.service_ids : [a.service_id];
    for (const id of ids) {
      const s = porId.get(id);
      if (!s) continue;
      const atual = fat.get(id) ?? { cents: 0, n: 0 };
      fat.set(id, { cents: atual.cents + s.price_cents, n: atual.n + 1 });
    }
  }

  const servicos: ServicoResumo[] = ativos.map(s => ({
    id: s.id, name: s.name, price_cents: s.price_cents, duration_minutes: s.duration_minutes,
    faturamento_cents: fat.get(s.id)?.cents ?? 0, atendimentos: fat.get(s.id)?.n ?? 0,
  }));
  // Sem histórico ainda, o preço serve de desempate: o serviço mais caro
  // costuma ser o que ela quer vender.
  const top3 = [...servicos]
    .sort((a, b) => b.faturamento_cents - a.faturamento_cents || b.atendimentos - a.atendimentos || b.price_cents - a.price_cents)
    .slice(0, 3)
    .map(s => s.id);

  const duracaoBase = servicos.find(s => s.id === top3[0])?.duration_minutes || 60;
  const datas = Array.from({ length: 7 }, (_, i) => dataSP(new Date(hoje.getTime() + i * 864e5)));
  const capacidade = await getFreeCapacity(professionalId, datas, duracaoBase).catch(() => ({} as Record<string, number>));
  const dias = datas.map(d => ({ data: d, livres: capacidade[d] ?? 0 }));

  const cidade = pro?.city ?? '';
  return {
    servicos,
    top3,
    agendaVaga: { total: dias.reduce((s, d) => s + d.livres, 0), dias, duracaoBase },
    cidade,
    uf: pro?.state ?? '',
    raioSugerido: raioPadrao(cidade),
    whatsapp: pro?.whatsapp ?? '',
    instagram: pro?.instagram ?? '',
    nome: pro?.brand_name || pro?.name || '',
    linkAgendamento: pro?.slug && appUrl ? `${appUrl}/${pro.slug}` : '',
  };
}
