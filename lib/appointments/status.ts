import { AppointmentStatus } from '@/types/database';

export interface StatusMeta {
  label: string;
  /** classes do selo (acento sutil sobre base off-white/bordô) */
  badge: string;
  /** cor do ponto/indicador */
  dot: string;
  /** preenchimento de bloco no calendário */
  block: string;
}

/**
 * Acentos de status DISCRETOS — bordô e off-white dominam a interface;
 * verde/âmbar/vermelho aparecem apenas em pontos e selos pequenos.
 */
export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending: {
    label: 'Pendente',
    badge: 'bg-[#b07a23]/10 text-[#946218] border border-[#b07a23]/20',
    dot: 'bg-[#b07a23]',
    block: 'bg-[#b07a23]/8 border-[#b07a23]/25 text-[#7a5114]',
  },
  confirmed: {
    label: 'Confirmado',
    badge: 'bg-[#2e7d5b]/10 text-[#226045] border border-[#2e7d5b]/20',
    dot: 'bg-[#2e7d5b]',
    block: 'bg-[#2e7d5b]/8 border-[#2e7d5b]/25 text-[#1f5a40]',
  },
  completed: {
    label: 'Finalizado',
    badge: 'bg-wine-700/8 text-wine-700 border border-wine-700/15',
    dot: 'bg-wine-700',
    block: 'bg-wine-700/8 border-wine-700/20 text-wine-800',
  },
  cancelled: {
    label: 'Cancelado',
    badge: 'bg-gray-150 text-gray-450 border border-gray-250 line-through',
    dot: 'bg-gray-450',
    block: 'bg-gray-150 border-gray-250 text-gray-450 line-through',
  },
  no_show: {
    label: 'Falta',
    badge: 'bg-[#b23a48]/10 text-[#b23a48] border border-[#b23a48]/25',
    dot: 'bg-[#b23a48]',
    block: 'bg-[#b23a48]/8 border-[#b23a48]/25 text-[#8f2c38]',
  },
};

export function statusMeta(status: AppointmentStatus): StatusMeta {
  return STATUS_META[status] || STATUS_META.pending;
}
