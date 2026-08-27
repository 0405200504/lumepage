'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileDown, Loader2, ClipboardList } from 'lucide-react';
import { submitAnamnesisAction } from '@/app/actions/anamnesis';
import type { AnamnesisQuestion, AnamnesisDesign, AnamnesisAnswer } from '@/types/database';

interface Props {
  token: string;
  brandName: string;
  formTitle: string;
  clientName: string;
  questions: AnamnesisQuestion[];
  design: AnamnesisDesign;
}

/**
 * Formulário público de preenchimento da ficha de anamnese (celular-first).
 * A cliente responde, assina digitando o nome e recebe o PDF no WhatsApp.
 */
export const AnamnesisFillForm: React.FC<Props> = ({ token, brandName, formTitle, clientName, questions, design }) => {
  const accent = design?.accent || '#8c2438';
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [signature, setSignature] = useState(clientName || '');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ pdfSentToClient: boolean } | null>(null);

  const answeredCount = useMemo(
    () => questions.filter(q => {
      const v = answers[q.id];
      return v !== undefined && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '');
    }).length,
    [answers, questions]
  );

  const setAnswer = (id: string, value: string | string[]) =>
    setAnswers(prev => ({ ...prev, [id]: value }));

  const toggleMulti = (id: string, option: string) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
      return { ...prev, [id]: next };
    });
  };

  const handleSubmit = async () => {
    setError(null);
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      const empty = v === undefined || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
      if (empty) {
        setError(`Responda a pergunta obrigatória: "${q.label}"`);
        document.getElementById(`anamnesis-q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    if (!signature.trim()) { setError('Digite seu nome completo na assinatura.'); return; }
    if (!agreed) { setError('Confirme que as informações são verdadeiras.'); return; }

    setSubmitting(true);
    try {
      const payload: AnamnesisAnswer[] = questions
        .filter(q => answers[q.id] !== undefined)
        .map(q => ({ questionId: q.id, answer: answers[q.id] }));
      const res = await submitAnamnesisAction(token, {
        answers: payload,
        signature: signature.trim(),
        clientName: signature.trim(),
      });
      if (res.success) setDone({ pdfSentToClient: !!res.pdfSentToClient });
      else setError(res.error || 'Não foi possível enviar. Tente novamente.');
    } catch {
      setError('Não foi possível enviar. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-n-200 shadow-xl text-center flex flex-col items-center">
        <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: `${accent}14`, color: accent }}>
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-h3 font-semibold text-n-900 tracking-tight">Ficha enviada com sucesso! 💛</h2>
        <p className="mt-2 text-caption text-n-500 leading-relaxed max-w-sm">
          {done.pdfSentToClient
            ? `Prontinho! ${brandName} já recebeu suas respostas e uma cópia em PDF foi enviada para o seu WhatsApp.`
            : `Prontinho! ${brandName} já recebeu suas respostas. Você pode baixar a sua cópia em PDF abaixo.`}
        </p>
        <a
          href={`/api/anamnese/${token}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-white text-caption font-bold rounded-xl shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          <FileDown className="h-4 w-4" />
          Baixar minha ficha em PDF
        </a>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-3 bg-n-50 border border-n-200 rounded-xl text-label text-n-900 placeholder:text-n-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 transition-ui';
  const focusRing = { ['--tw-ring-color' as string]: `${accent}55` } as React.CSSProperties;

  return (
    <div className="bg-white rounded-3xl border border-n-200 shadow-xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 sm:px-8 pt-8 pb-6" style={{ backgroundColor: `${accent}0d` }}>
        {design?.showLogo !== false && (
          <p className="text-caption font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>{brandName}</p>
        )}
        <div className="mt-2 flex items-start gap-3">
          <span className="mt-0.5 p-2 rounded-xl text-white shrink-0" style={{ backgroundColor: accent }}>
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-h2 font-semibold text-n-900 tracking-tight leading-snug">{formTitle}</h1>
            <p className="mt-1 text-caption text-n-500 leading-relaxed">
              {clientName ? `Oi, ${clientName.split(' ')[0]}! ` : ''}Responda com calma — essas informações deixam seu atendimento mais seguro e personalizado.
            </p>
          </div>
        </div>
        {/* Progresso */}
        <div className="mt-5">
          <div className="h-1.5 rounded-full bg-white overflow-hidden">
            <div
              className="h-full rounded-full transition-ui duration-300"
              style={{ width: `${Math.round((answeredCount / Math.max(questions.length, 1)) * 100)}%`, backgroundColor: accent }}
            />
          </div>
          <p className="mt-1.5 text-caption font-semibold text-n-400">{answeredCount} de {questions.length} respondidas</p>
        </div>
      </div>

      {/* Perguntas */}
      <div className="px-6 sm:px-8 py-6 space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} id={`anamnesis-q-${q.id}`}>
            <label className="block text-caption font-bold text-n-800 leading-snug mb-2">
              <span className="mr-1.5 text-caption font-semibold" style={{ color: accent }}>{i + 1}.</span>
              {q.label}
              {q.required && <span className="ml-1 text-danger">*</span>}
            </label>

            {q.type === 'text' && (
              <input
                type="text" maxLength={300}
                className={inputClass} style={focusRing}
                placeholder="Sua resposta"
                value={(answers[q.id] as string) || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
              />
            )}

            {q.type === 'textarea' && (
              <textarea
                rows={3} maxLength={4000}
                className={`${inputClass} resize-y`} style={focusRing}
                placeholder="Sua resposta"
                value={(answers[q.id] as string) || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
              />
            )}

            {q.type === 'number' && (
              <input
                type="number" inputMode="numeric"
                className={inputClass} style={focusRing}
                placeholder="0"
                value={(answers[q.id] as string) || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
              />
            )}

            {q.type === 'date' && (
              <input
                type="date"
                className={inputClass} style={focusRing}
                value={(answers[q.id] as string) || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
              />
            )}

            {q.type === 'yesno' && (
              <div className="flex gap-2">
                {['Sim', 'Não'].map(opt => {
                  const active = answers[q.id] === opt;
                  return (
                    <button
                      key={opt} type="button"
                      onClick={() => setAnswer(q.id, opt)}
                      className={`flex-1 py-3 rounded-xl text-label font-bold border transition-colors ${
                        active ? 'text-white border-transparent' : 'bg-n-50 text-n-600 border-n-200 hover:border-n-300'
                      }`}
                      style={active ? { backgroundColor: accent } : undefined}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'select' && (
              <div className="flex flex-wrap gap-2">
                {(q.options || []).map(opt => {
                  const active = answers[q.id] === opt;
                  return (
                    <button
                      key={opt} type="button"
                      onClick={() => setAnswer(q.id, opt)}
                      className={`px-4 py-2.5 rounded-xl text-caption font-bold border transition-colors ${
                        active ? 'text-white border-transparent' : 'bg-n-50 text-n-600 border-n-200 hover:border-n-300'
                      }`}
                      style={active ? { backgroundColor: accent } : undefined}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'multiselect' && (
              <div className="flex flex-wrap gap-2">
                {(q.options || []).map(opt => {
                  const active = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt);
                  return (
                    <button
                      key={opt} type="button"
                      onClick={() => toggleMulti(q.id, opt)}
                      className={`px-4 py-2.5 rounded-xl text-caption font-bold border transition-colors ${
                        active ? 'text-white border-transparent' : 'bg-n-50 text-n-600 border-n-200 hover:border-n-300'
                      }`}
                      style={active ? { backgroundColor: accent } : undefined}
                    >
                      {active ? '✓ ' : ''}{opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assinatura + envio */}
      <div className="px-6 sm:px-8 pb-8 pt-2 border-t border-n-50">
        <label className="block text-caption font-bold text-n-800 mt-5 mb-2">
          Assinatura (digite seu nome completo) <span className="text-danger">*</span>
        </label>
        <input
          type="text" maxLength={120}
          className={inputClass} style={{ ...focusRing, fontFamily: 'cursive' }}
          placeholder="Seu nome completo"
          value={signature}
          onChange={e => setSignature(e.target.value)}
        />
        <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-current"
            style={{ accentColor: accent }}
          />
          <span className="text-caption text-n-500 leading-relaxed">
            Declaro que as informações prestadas são verdadeiras e de minha responsabilidade.
          </span>
        </label>

        {error && (
          <p className="mt-4 text-caption font-semibold text-danger bg-danger-bg border border-danger-border rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-5 w-full py-4 rounded-2xl text-white text-label font-semibold tracking-tight shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: accent }}
        >
          {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>) : 'Enviar minha ficha ✨'}
        </button>
      </div>
    </div>
  );
};
