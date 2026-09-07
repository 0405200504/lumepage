'use client';

/**
 * ============================================================================
 * "Falta o quê?" — roteiro da página
 * ============================================================================
 * O editor tem onze abas; esta lista é o que transforma isso em um caminho.
 * Mostra o quanto já está pronto, o que ainda falta e leva ao lugar certo com
 * um clique — cada item explica POR QUE importa, porque "adicione depoimentos"
 * sem motivo é só mais uma tarefa a ignorar.
 */

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Circle, Sparkles } from 'lucide-react';
import type { ChecklistItem, ChecklistResult, ChecklistTab } from '@/lib/site/checklist';

function Item({ item, onGo }: { item: ChecklistItem; onGo: (tab: ChecklistTab) => void }) {
  return (
    <button
      type="button"
      onClick={() => onGo(item.tab)}
      className="w-full flex items-start gap-2.5 text-left px-2.5 py-2 rounded-xl hover:bg-n-50 transition-colors cursor-pointer group"
    >
      <span
        className={`mt-0.5 h-4 w-4 rounded-full grid place-items-center shrink-0 ${
          item.done ? 'bg-success text-white' : 'border border-n-300 text-transparent'
        }`}
      >
        {item.done ? <Check className="h-2.5 w-2.5" /> : <Circle className="h-2 w-2" />}
      </span>
      <span className="min-w-0">
        <span className={`text-[12px] font-semibold block leading-snug ${item.done ? 'text-n-400 line-through' : 'text-heading'}`}>
          {item.label}
        </span>
        {!item.done && (
          <span className="text-[10px] text-n-500 block leading-snug mt-0.5">{item.why}</span>
        )}
      </span>
      {!item.done && (
        <span className="ml-auto shrink-0 text-[10px] font-bold text-wine-700 opacity-0 group-hover:opacity-100 transition-opacity self-center">
          Ir →
        </span>
      )}
    </button>
  );
}

export function ProgressChecklist({ result, onGo }: {
  result: ChecklistResult;
  onGo: (tab: ChecklistTab) => void;
}) {
  const [open, setOpen] = useState(false);
  const pending = result.items.filter(x => !x.done);
  const ready = result.missingEssential.length === 0;

  // Fechada, a lista mostra só as três pendências mais urgentes: essenciais
  // primeiro. Aberta, mostra tudo, inclusive o que já está feito (é o que dá a
  // sensação de progresso).
  const preview = [...result.missingEssential, ...pending.filter(x => x.essential === false)].slice(0, 3);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-heading flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-wine-700" />
            {ready
              ? pending.length === 0 ? 'Sua página está completa 🎉' : 'Sua página já pode ir ao ar'
              : 'Vamos terminar sua página'}
          </h3>
          <p className="text-[11px] text-n-500 mt-0.5">
            {ready
              ? pending.length === 0
                ? 'Todos os itens preenchidos. Publique e cole o link na bio.'
                : `Faltam ${pending.length} item${pending.length > 1 ? 's' : ''} opcional${pending.length > 1 ? 'is' : ''} para ela ficar completa.`
              : `Falta${result.missingEssential.length > 1 ? 'm' : ''} ${result.missingEssential.length} item${result.missingEssential.length > 1 ? 's' : ''} essencia${result.missingEssential.length > 1 ? 'is' : 'l'}.`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[20px] font-black text-heading tabular-nums leading-none">{result.percent}%</span>
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-n-400 mt-0.5">pronta</span>
        </div>
      </div>

      <div className="h-2 w-full bg-n-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${ready ? 'bg-success' : 'bg-wine-700'}`}
          style={{ width: `${result.percent}%` }}
        />
      </div>

      {pending.length > 0 && !open && (
        <div className="space-y-0.5">
          {preview.map(item => <Item key={item.id} item={item} onGo={onGo} />)}
        </div>
      )}

      {open && (
        <div className="space-y-3">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-n-400 px-2.5 mb-1">
              Essencial
            </h4>
            <div className="space-y-0.5">
              {result.essential.map(item => <Item key={item.id} item={item} onGo={onGo} />)}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-n-400 px-2.5 mb-1">
              Deixa a página mais completa
            </h4>
            <div className="space-y-0.5">
              {result.extras.map(item => <Item key={item.id} item={item} onGo={onGo} />)}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full inline-flex items-center justify-center gap-1 text-[11px] font-bold text-n-600 hover:text-wine-700 py-1 cursor-pointer transition-colors"
      >
        {open ? <>Fechar a lista <ChevronUp className="h-3.5 w-3.5" /></> : <>Ver a lista completa <ChevronDown className="h-3.5 w-3.5" /></>}
      </button>
    </div>
  );
}

export default ProgressChecklist;
