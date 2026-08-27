import { AppointmentStatus } from '@/types/database';

/** Tons semânticos do design system (components/ui/StatusPill). */
export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusMeta {
  label: string;
  /** Tom semântico — é o que a StatusPill consome. */
  tone: StatusTone;
  /** classes do selo (compatibilidade com telas que ainda montam o selo à mão) */
  badge: string;
  /** cor do ponto/indicador */
  dot: string;
  /**
   * Superfície do bloco no calendário. É a MESMA para todos os status, de
   * propósito: com um fundo pastel por status, um dia cheio virava um mosaico
   * de menta, âmbar, azul e salmão em que nada se destacava porque tudo
   * gritava. Quem carrega o status agora é `bar` — 3px na aresta esquerda.
   */
  block: string;
  /** Barra de 3px à esquerda do bloco. É aqui que a cor do status vive. */
  bar: string;
}

/**
 * Status usa as cores SEMÂNTICAS, nunca a escala wine-*.
 *
 * O motivo é concreto: vinho é a cor do botão primário. Enquanto "Finalizado"
 * também era vinho, o selo do atendimento e o botão de confirmar disputavam o
 * mesmo significado na mesma tela. E o "Falta", em vinho-avermelhado, era
 * indistinguível do primário — clicar em cancelar parecia confirmar.
 */
export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending: {
    label: 'Pendente',
    tone: 'warning',
    badge: 'border border-line text-warning',
    dot: 'bg-warning',
    block: 'bg-surface border-line text-ink',
    bar: 'bg-warning',
  },
  confirmed: {
    label: 'Confirmado',
    tone: 'success',
    badge: 'border border-line text-success',
    dot: 'bg-success',
    block: 'bg-surface border-line text-ink',
    bar: 'bg-success',
  },
  completed: {
    label: 'Finalizado',
    tone: 'info',
    badge: 'border border-line text-info',
    dot: 'bg-info',
    block: 'bg-surface border-line text-ink',
    bar: 'bg-info',
  },
  cancelled: {
    label: 'Cancelado',
    tone: 'neutral',
    badge: 'border border-line text-n-500 line-through',
    dot: 'bg-n-400',
    block: 'bg-n-25 border-line text-n-500 line-through',
    bar: 'bg-n-400',
  },
  no_show: {
    label: 'Falta',
    tone: 'danger',
    badge: 'border border-line text-danger',
    dot: 'bg-danger',
    block: 'bg-surface border-line text-ink',
    bar: 'bg-danger',
  },
};

export function statusMeta(status: AppointmentStatus): StatusMeta {
  return STATUS_META[status] || STATUS_META.pending;
}
