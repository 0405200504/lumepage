'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvailabilityRule } from '@/types/database';
import { Save } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { PageHeader } from '../ui/PageHeader';
import { updateAvailabilityAction } from '@/app/actions/professional';

interface AvailabilityEditorProps {
  initialRules: AvailabilityRule[];
  professionalId: string;
}

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

export const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({
  initialRules,
  professionalId
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mapear regras iniciais indexadas por dia da semana para facilitar manipulação
  const getInitialRuleState = (weekday: number) => {
    const found = initialRules.find(r => r.weekday === weekday);
    if (found) {
      return {
        is_active: found.is_active,
        start_time: found.start_time.substring(0, 5),
        end_time: found.end_time.substring(0, 5),
        has_break: !!found.break_start && !!found.break_end,
        break_start: found.break_start ? found.break_start.substring(0, 5) : '12:00',
        break_end: found.break_end ? found.break_end.substring(0, 5) : '13:00',
        slot_interval_minutes: found.slot_interval_minutes || 30,
        buffer_minutes: found.buffer_minutes || 15
      };
    }

    return {
      is_active: weekday !== 0, // Domingo inativo por padrão
      start_time: '09:00',
      end_time: '18:00',
      has_break: true,
      break_start: '12:00',
      break_end: '13:00',
      slot_interval_minutes: 30,
      buffer_minutes: 15
    };
  };

  // Estados de formulário para os 7 dias da semana
  const [rulesState, setRulesState] = useState<Record<number, ReturnType<typeof getInitialRuleState>>>(() => {
    const state: any = {};
    [1, 2, 3, 4, 5, 6, 0].forEach(d => {
      state[d] = getInitialRuleState(d);
    });
    return state;
  });

  const handleChange = (weekday: number, field: string, value: any) => {
    setRulesState(prev => ({
      ...prev,
      [weekday]: {
        ...prev[weekday],
        [field]: value
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Formatar regras para envio
      const formattedRules = WEEKDAYS.map(day => {
        const state = rulesState[day.value];
        return {
          professional_id: professionalId,
          weekday: day.value,
          start_time: `${state.start_time}:00`,
          end_time: `${state.end_time}:00`,
          break_start: state.has_break ? `${state.break_start}:00` : null,
          break_end: state.has_break ? `${state.break_end}:00` : null,
          slot_interval_minutes: state.slot_interval_minutes,
          buffer_minutes: state.buffer_minutes,
          is_active: state.is_active
        };
      });

      const res = await updateAvailabilityAction(professionalId, formattedRules);
      if (res.success) {
        success('Salvo!', 'Configurações de horários de expediente salvas com sucesso.');
        router.refresh();
      } else {
        error('Falha', res.error || 'Erro ao salvar expediente.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu um erro ao enviar dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 select-none max-w-4xl">
      <PageHeader
        trail={['Expediente', `${Object.values(rulesState).filter(r => r.is_active).length} dia(s) ativo(s)`]}
        title="Horários de expediente"
        description="Em quais dias você atende e em que faixas. O intervalo de almoço é bloqueado automaticamente na página pública."
      />

      {/* Lista de Dias */}
      <div className="card overflow-hidden divide-y divide-line">
        {WEEKDAYS.map((day) => {
          const state = rulesState[day.value];
          return (
            <div 
              key={day.value}
              /* Dia inativo não fica translúcido: `opacity-60` apagava também
                 o rótulo e o horário, que continuam sendo informação. Ele fica
                 sobre n-25, e o interruptor conta o resto. */
              className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-ui ${
                state.is_active ? 'bg-surface' : 'bg-n-25'
              }`}
            >
              {/* Nome do dia / Ativar */}
              <div className="flex items-center gap-3 min-w-[200px]">
                <input
                  type="checkbox"
                  id={`active-${day.value}`}
                  checked={state.is_active}
                  onChange={(e) => handleChange(day.value, 'is_active', e.target.checked)}
                  className="h-5 w-5 rounded-badge border-n-300 accent-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 cursor-pointer"
                />
                <label 
                  htmlFor={`active-${day.value}`} 
                  className="text-body-sm font-semibold text-heading cursor-pointer"
                >
                  {day.label}
                </label>
              </div>

              {state.is_active ? (
                <div className="flex-1 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-6 text-caption text-n-700">
                  {/* Expediente */}
                  <div className="flex items-center gap-2">
                    <span className="mono-micro text-n-500">Expediente</span>
                    <input
                      type="time"
                      required
                      value={state.start_time}
                      onChange={(e) => handleChange(day.value, 'start_time', e.target.value)}
                      className="field-input mono w-[6.5rem] text-center"
                    />
                    <span className="text-n-600">às</span>
                    <input
                      type="time"
                      required
                      value={state.end_time}
                      onChange={(e) => handleChange(day.value, 'end_time', e.target.value)}
                      className="field-input mono w-[6.5rem] text-center"
                    />
                  </div>

                  {/* Intervalo / Almoço */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id={`break-${day.value}`}
                        checked={state.has_break}
                        onChange={(e) => handleChange(day.value, 'has_break', e.target.checked)}
                        className="h-4 w-4 rounded-badge border-n-300 accent-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 cursor-pointer"
                      />
                      <label htmlFor={`break-${day.value}`} className="mono-micro text-n-500 cursor-pointer">
                        Intervalo
                      </label>
                    </div>

                    {state.has_break && (
                      <div className="flex items-center gap-2 pl-6 sm:pl-0">
                        <input
                          type="time"
                          required={state.has_break}
                          value={state.break_start}
                          onChange={(e) => handleChange(day.value, 'break_start', e.target.value)}
                          className="field-input mono w-[6.5rem] text-center"
                        />
                        <span className="text-n-600">às</span>
                        <input
                          type="time"
                          required={state.has_break}
                          value={state.break_end}
                          onChange={(e) => handleChange(day.value, 'break_end', e.target.value)}
                          className="field-input mono w-[6.5rem] text-center"
                        />
                      </div>
                    )}
                  </div>

                  {/* Buffer / Intervalo entre slots */}
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <span className="font-semibold text-n-400">Buffer entre atendimentos:</span>
                    <select
                      value={state.buffer_minutes}
                      onChange={(e) => handleChange(day.value, 'buffer_minutes', parseInt(e.target.value, 10))}
                      className="px-2.5 py-1.5 bg-white border border-n-200 rounded-xl"
                    >
                      <option value={0}>Sem buffer</option>
                      <option value={5}>5 min</option>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-caption text-n-400 font-semibold italic py-1">
                  Não atende neste dia da semana.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end pt-4 border-t border-n-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-6 py-3.5 bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold rounded-2xl shadow-md transition-colors cursor-pointer"
        >
          <Save className="h-4.5 w-4.5" />
          <span>{isSubmitting ? 'Salvando...' : 'Salvar Expediente'}</span>
        </button>
      </div>
    </form>
  );
};
export default AvailabilityEditor;
