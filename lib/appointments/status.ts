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
  /** preenchimento de bloco no calendário */
  block: string;
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
    badge: 'bg-warning-bg text-warning border border-warning-border',
    dot: 'bg-warning',
    block: 'bg-warning-bg border-warning-border text-warning',
  },
  confirmed: {
    label: 'Confirmado',
    tone: 'success',
    badge: 'bg-success-bg text-success border border-success-border',
    dot: 'bg-success',
    block: 'bg-success-bg border-success-border text-success',
  },
  completed: {
    label: 'Finalizado',
    tone: 'info',
    badge: 'bg-info-bg text-info border border-info-border',
    dot: 'bg-info',
    block: 'bg-info-bg border-info-border text-info',
  },
  cancelled: {
    label: 'Cancelado',
    tone: 'neutral',
    badge: 'bg-n-100 text-n-500 border border-n-200 line-through',
    dot: 'bg-n-400',
    block: 'bg-n-100 border-n-200 text-n-500 line-through',
  },
  no_show: {
    label: 'Falta',
    tone: 'danger',
    badge: 'bg-danger-bg text-danger border border-danger-border',
    dot: 'bg-danger',
    block: 'bg-danger-bg border-danger-border text-danger',
  },
};

export function statusMeta(status: AppointmentStatus): StatusMeta {
  return STATUS_META[status] || STATUS_META.pending;
}
