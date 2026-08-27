import React from 'react';
import type { Tone } from './StatusDot';

/** "HH:MM" → minutos desde a meia-noite. */
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

export interface RulerEvent {
  id: string;
  start: string;   // "14:30"
  end: string;     // "16:00"
  title: string;
  meta?: string;
  tone?: Tone;
}

export interface RulerSlot {
  id: string;
  start: string;
  end: string;
  label?: string;
}

interface TimeRulerProps {
  startHour?: number;
  endHour?: number;
  events?: RulerEvent[];
  /** Vagas livres — desenhadas com contorno TRACEJADO. */
  slots?: RulerSlot[];
  /** "HH:MM". Desenha a linha do agora. Fora da faixa, não desenha. */
  now?: string;
  /** Altura de uma hora, em px. 56 é o piso para caber título + meta. */
  hourHeight?: number;
  className?: string;
}

/** A barra de 3px à esquerda do bloco carrega o status. É a única cor do bloco. */
const BAR: Record<Tone, string> = {
  neutral: 'bg-n-400',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  info:    'bg-info',
  accent:  'bg-wine-700',
  signal:  'bg-[color:var(--color-signal)]',
};

/**
 * ARQUÉTIPO 1 · RÉGUA TEMPORAL.
 *
 * O que esta régua corrige na agenda atual: ela usava linha tracejada IGUAL
 * para hora cheia e meia hora. Marcação sem hierarquia não mede nada — o olho
 * não consegue contar as horas sem ler cada rótulo. E o tracejado, gasto como
 * decoração de grade, perdia o significado que ele carrega no resto do
 * produto (previsto / não confirmado / vazio).
 *
 * Aqui:
 *   · tick de 6px na hora cheia, 3px na meia — hierarquia visível de longe;
 *   · a hairline contínua atravessa só na hora cheia;
 *   · o TRACEJADO ficou reservado ao slot livre, que é literalmente "vazio";
 *   · o bloco de evento é neutro, com uma barra de 3px do status à esquerda —
 *     status colorindo o bloco inteiro transformava a agenda num mosaico;
 *   · a linha do "agora" é --signal, com o horário em mono na ponta. É o
 *     único traço de sinal da tela, e é para ele que o olho vai primeiro.
 */
export const TimeRuler: React.FC<TimeRulerProps> = ({
  startHour = 8,
  endHour = 20,
  events = [],
  slots = [],
  now,
  hourHeight = 56,
  className = '',
}) => {
  const originMin = startHour * 60;
  const totalMin = (endHour - startHour) * 60;
  const H = (totalMin / 60) * hourHeight;
  const yOf = (hhmm: string) => ((toMin(hhmm) - originMin) / 60) * hourHeight;

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const nowMin = now ? toMin(now) : null;
  const nowVisible = nowMin !== null && nowMin >= originMin && nowMin <= originMin + totalMin;

  return (
    <div className={`flex ${className}`}>
      {/* Calha de horas: rótulo em mono, alinhado à direita, encostado na régua. */}
      <div className="w-12 shrink-0 relative overflow-visible" style={{ height: H }}>
        {hours.slice(0, -1).map((h) => (
          <span
            key={h}
            className="mono-micro text-n-400 absolute right-2.5 -translate-y-1/2"
            style={{ top: (h - startHour) * hourHeight }}
          >
            {String(h).padStart(2, '0')}:00
          </span>
        ))}
        {/* O horário do agora troca de lugar com o rótulo da hora: ele é o
            que importa naquele instante. Em signal-ink, não em signal —
            texto de 10px em #F0334F reprova em contraste. */}
        {nowVisible && (
          <span
            className="mono-micro text-[color:var(--color-signal-ink)] absolute right-2 -translate-y-1/2 bg-surface pl-1"
            style={{ top: yOf(now!) }}
          >
            {now}
          </span>
        )}
      </div>

      {/* Área da régua. */}
      <div className="flex-1 relative border-l border-line-strong" style={{ height: H }}>
        {hours.map((h) => {
          const top = (h - startHour) * hourHeight;
          return (
            <React.Fragment key={h}>
              {/* O tick sai PARA FORA do eixo, invadindo a calha — é assim que
                  uma régua marca. Desenhado dentro da área, ele nascia em cima
                  da hairline da hora, na mesma cor, e desaparecia dentro dela:
                  a hierarquia 6/3 existia no CSS e não existia no olho. */}
              <div
                className="absolute h-px bg-n-500"
                style={{ top, left: -6, width: 6 }}
              />
              {/* A hairline que atravessa a área usa --color-grid (n-150), não
                  --color-line (n-200): ela é referência de alinhamento, não
                  marcação. Deixá-la na mesma força do tick anulava a hierarquia
                  — o tick de 6px sumia dentro da linha que ele deveria comandar. */}
              <div
                className="absolute left-0 right-0 h-px"
                style={{ top, background: 'var(--color-grid)' }}
              />
              {/* meia hora: tick de 3px e nenhuma hairline — é o degrau menor */}
              {h < endHour && (
                <div
                  className="absolute h-px bg-[color:var(--color-tick)]"
                  style={{ top: top + hourHeight / 2, left: -3, width: 3 }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Slot livre: contorno TRACEJADO. Tracejado = vazio, em todo o produto. */}
        {slots.map((s) => (
          <div
            key={s.id}
            className="absolute left-2 right-2 rounded-badge line-dashed flex items-center justify-center"
            style={{ top: yOf(s.start), height: yOf(s.end) - yOf(s.start) }}
          >
            <span className="mono-micro text-n-400">{s.label ?? 'Livre'}</span>
          </div>
        ))}

        {/* Bloco de evento: superfície neutra + barra de 3px do status.
            Abaixo de 40px de altura (um atendimento de 30min cabe em 28px) o
            bloco COLAPSA para uma linha: título e horário lado a lado. Sem
            isso a segunda linha era cortada no meio e o horário — o dado que
            importa numa agenda — era justamente o que sumia. */}
        {events.map((e) => {
          const h = yOf(e.end) - yOf(e.start);
          const compact = h < 40;
          return (
            <div
              key={e.id}
              className="absolute left-2 right-2 rounded-badge border border-line bg-surface overflow-hidden flex"
              style={{ top: yOf(e.start), height: h }}
            >
              <span className={`w-[3px] shrink-0 ${BAR[e.tone ?? 'neutral']}`} aria-hidden />
              {compact ? (
                <div className="min-w-0 px-2.5 flex-1 flex items-center gap-2">
                  <p className="text-caption text-heading font-semibold truncate">{e.title}</p>
                  <p className="mono-micro text-n-500 ml-auto shrink-0">{e.start}</p>
                </div>
              ) : (
                <div className="min-w-0 px-2.5 py-1.5">
                  <p className="text-caption text-heading font-semibold truncate">{e.title}</p>
                  <p className="mono-micro text-n-500 truncate">
                    {e.start}–{e.end}{e.meta ? ` · ${e.meta}` : ''}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Linha do agora — o único --signal da tela. */}
        {nowVisible && (
          <div className="absolute left-0 right-0 now-line z-10" style={{ top: yOf(now!) }} />
        )}
      </div>
    </div>
  );
};

export default TimeRuler;
