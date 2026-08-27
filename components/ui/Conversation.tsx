import React from 'react';

/**
 * ARQUÉTIPO 5 · CONVERSA.
 *
 * A decisão de desenho que carrega a linguagem inteira aqui é o CANTO RETO.
 * A bolha usa raio 10 em três cantos e um canto a 90° do lado do autor —
 * o inferior-direito nas minhas mensagens, o inferior-esquerdo nas dela.
 * É o mesmo raciocínio do chanfro: um único canto quebrado dá direção e
 * autoria sem precisar de setinha, de cor diferente ou de avatar repetido
 * em cada linha. E resolve, de graça, o problema de saber quem falou numa
 * sequência longa de mensagens do mesmo lado.
 *
 * Bolha da profissional em wine-700; da cliente em superfície neutra com
 * hairline. Nada de duas cores saturadas se enfrentando.
 */
export const Bubble: React.FC<{
  /** true = mensagem da profissional (direita, vinho). */
  mine?: boolean;
  children: React.ReactNode;
  /** "14:32" — sempre em mono 10px. */
  time: string;
  /** Ex.: "entregue", "lida". Só nas minhas. */
  status?: string;
  className?: string;
}> = ({ mine, children, time, status, className = '' }) => (
  <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${className}`}>
    <div
      className={[
        'max-w-[78%] px-3 py-2 rounded-surface',
        mine
          ? 'bg-wine-700 text-white rounded-br-none'
          : 'bg-surface border border-line text-ink rounded-bl-none',
      ].join(' ')}
    >
      <p className="text-body-sm whitespace-pre-wrap break-words">{children}</p>
      <p
        className={`mono-micro mt-1 text-right ${
          mine ? 'text-wine-200' : 'text-n-400'
        }`}
      >
        {time}
        {status && <span className="ml-1.5">{status}</span>}
      </p>
    </div>
  </div>
);

/**
 * Divisória de data: uma hairline atravessando com o rótulo no MEIO.
 * O rótulo centralizado sobre a linha é o gesto que separa "conversa" de
 * "lista de mensagens" — ele marca o dia sem inserir um cartão no fluxo.
 */
export const DateDivider: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = '',
}) => (
  <div className={`flex items-center gap-3 ${className}`} role="separator">
    <span className="h-px flex-1 bg-line" />
    <span className="mono-micro text-n-500 whitespace-nowrap">{children}</span>
    <span className="h-px flex-1 bg-line" />
  </div>
);

/**
 * Composer: hairline SUPERIOR e mais nada — sem card, sem sombra, sem raio
 * grande. Ele não é um objeto flutuando sobre a conversa; é o rodapé dela,
 * e a linha de 1px é o que separa os dois.
 */
export const Composer: React.FC<{
  placeholder?: string;
  /** Ação à direita (enviar). */
  action?: React.ReactNode;
  /** Ações à esquerda (anexo, áudio). */
  leading?: React.ReactNode;
  /** Puxa a hairline para fora do padding do card, de ponta a ponta.
   *  Passe o mesmo valor do padding do container (padrão: o do Card). */
  bleed?: string;
  className?: string;
}> = ({
  placeholder = 'Escreva uma mensagem…',
  action,
  leading,
  bleed = '-mx-4 sm:-mx-5 px-4 sm:px-5',
  className = '',
}) => (
  <div className={`border-t border-line pt-3 mt-auto flex items-center gap-2 ${bleed} ${className}`}>
    {leading}
    {/* `min-w-0` é obrigatório: `.field-input` tem width:100% e, dentro de um
        flex item, isso vira uma largura MÍNIMA que empurra o botão de enviar
        para fora do card. O sintoma é o botão aparecer cortado na borda. */}
    <input className="field-input flex-1 min-w-0" placeholder={placeholder} />
    <span className="shrink-0">{action}</span>
  </div>
);

/** Casca da conversa: só organiza o empilhamento e o espaçamento. */
export const Thread: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = '',
}) => <div className={`flex flex-col gap-2 ${className}`}>{children}</div>;

export default Bubble;
