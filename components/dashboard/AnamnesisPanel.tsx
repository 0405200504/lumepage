'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Plus, Send, Pencil, Trash2, ArrowLeft, ArrowUp, ArrowDown,
  Copy, FileDown, ExternalLink, Search, CheckCircle2, Clock, Loader2,
  Sparkles, FilePlus2, MessageCircle, LinkIcon, Palette
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import {
  createAnamnesisFormAction, updateAnamnesisFormAction, deleteAnamnesisFormAction,
  sendAnamnesisAction, deleteAnamnesisResponseAction,
} from '@/app/actions/anamnesis';
import { ANAMNESIS_TEMPLATES, cloneTemplateQuestions, newQuestionId } from '@/lib/anamnesis/templates';
import type { AnamnesisForm, AnamnesisResponse, AnamnesisQuestion, AnamnesisQuestionType, AnamnesisDesign, Client } from '@/types/database';

interface Props {
  professionalId: string;
  initialForms: AnamnesisForm[];
  initialResponses: AnamnesisResponse[];
  clients: Client[];
  whatsappConnected: boolean;
}

const TYPE_LABEL: Record<AnamnesisQuestionType, string> = {
  text: 'Resposta curta',
  textarea: 'Resposta longa',
  yesno: 'Sim / Não',
  select: 'Escolha única',
  multiselect: 'Múltipla escolha',
  date: 'Data',
  number: 'Número',
};

const ACCENT_SWATCHES = ['#8c2438', '#c05e3c', '#d16d8a', '#7c5cbf', '#2f7d5d', '#3b6ea5', '#b08830', '#232323'];

interface BuilderState {
  formId: string | null;
  title: string;
  description: string;
  questions: AnamnesisQuestion[];
  design: AnamnesisDesign;
}

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export const AnamnesisPanel: React.FC<Props> = ({
  professionalId, initialForms, initialResponses, clients, whatsappConnected,
}) => {
  const router = useRouter();
  const { success, error } = useToast();

  const [forms, setForms] = useState(initialForms);
  const [responses, setResponses] = useState(initialResponses);
  // Sincroniza quando o servidor re-renderiza (router.refresh) — padrão
  // "derived state" do React: reconcilia durante o render, sem useEffect.
  const [prevInitial, setPrevInitial] = useState({ forms: initialForms, responses: initialResponses });
  if (prevInitial.forms !== initialForms || prevInitial.responses !== initialResponses) {
    setPrevInitial({ forms: initialForms, responses: initialResponses });
    setForms(initialForms);
    setResponses(initialResponses);
  }

  const [tab, setTab] = useState<'fichas' | 'respostas'>('fichas');
  const [builder, setBuilder] = useState<BuilderState | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendTarget, setSendTarget] = useState<AnamnesisForm | null>(null);
  const [formToDelete, setFormToDelete] = useState<AnamnesisForm | null>(null);
  const [responseToDelete, setResponseToDelete] = useState<AnamnesisResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pendingCount = responses.filter(r => r.status === 'pending').length;

  // ===================== BUILDER =====================

  const startBlank = () => {
    setShowTemplates(false);
    setBuilder({
      formId: null,
      title: '',
      description: '',
      questions: [{ id: newQuestionId(), label: '', type: 'text', required: false }],
      design: { accent: '#8c2438', showLogo: true },
    });
  };

  const startFromTemplate = (templateId: string) => {
    const template = ANAMNESIS_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setShowTemplates(false);
    setBuilder({
      formId: null,
      title: template.name,
      description: template.description,
      questions: cloneTemplateQuestions(template.questions),
      design: { accent: '#8c2438', showLogo: true },
    });
  };

  const startEdit = (form: AnamnesisForm) => {
    setBuilder({
      formId: form.id,
      title: form.title,
      description: form.description || '',
      questions: form.questions.map(q => ({ ...q, options: q.options ? [...q.options] : undefined })),
      design: { accent: form.design?.accent || '#8c2438', showLogo: form.design?.showLogo !== false },
    });
  };

  const patchQuestion = (id: string, patch: Partial<AnamnesisQuestion>) => {
    setBuilder(b => b && ({ ...b, questions: b.questions.map(q => q.id === id ? { ...q, ...patch } : q) }));
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setBuilder(b => {
      if (!b) return b;
      const target = index + dir;
      if (target < 0 || target >= b.questions.length) return b;
      const questions = [...b.questions];
      [questions[index], questions[target]] = [questions[target], questions[index]];
      return { ...b, questions };
    });
  };

  const removeQuestion = (id: string) => {
    setBuilder(b => b && ({ ...b, questions: b.questions.filter(q => q.id !== id) }));
  };

  const addQuestion = () => {
    setBuilder(b => b && ({
      ...b,
      questions: [...b.questions, { id: newQuestionId(), label: '', type: 'text', required: false }],
    }));
  };

  const saveForm = async () => {
    if (!builder) return;
    const questions = builder.questions.filter(q => q.label.trim());
    if (!builder.title.trim()) { error('Falta o nome', 'Dê um nome para a ficha.'); return; }
    if (questions.length === 0) { error('Ficha vazia', 'Escreva pelo menos uma pergunta.'); return; }
    setSaving(true);
    try {
      const payload = {
        title: builder.title,
        description: builder.description,
        questions,
        design: builder.design,
      };
      const res = builder.formId
        ? await updateAnamnesisFormAction(professionalId, builder.formId, payload)
        : await createAnamnesisFormAction(professionalId, payload);
      if (res.success) {
        success('Ficha salva!', builder.formId ? 'As alterações foram salvas.' : 'Sua ficha está pronta para ser enviada às clientes.');
        setBuilder(null);
        router.refresh();
      } else {
        error('Não foi possível salvar', res.error || 'Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteForm = async () => {
    if (!formToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteAnamnesisFormAction(professionalId, formToDelete.id);
      if (res.success) {
        setForms(prev => prev.filter(f => f.id !== formToDelete.id));
        success('Ficha excluída', 'O modelo foi removido. As respostas já recebidas foram removidas junto.');
        router.refresh();
      } else {
        error('Não foi possível excluir', res.error || 'Tente novamente.');
      }
    } finally {
      setDeleting(false);
      setFormToDelete(null);
    }
  };

  const confirmDeleteResponse = async () => {
    if (!responseToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteAnamnesisResponseAction(professionalId, responseToDelete.id);
      if (res.success) {
        setResponses(prev => prev.filter(r => r.id !== responseToDelete.id));
        success('Resposta excluída', 'O registro foi removido.');
        router.refresh();
      } else {
        error('Não foi possível excluir', res.error || 'Tente novamente.');
      }
    } finally {
      setDeleting(false);
      setResponseToDelete(null);
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/ficha/${token}`);
      success('Link copiado!', 'Cole no WhatsApp da cliente ou onde preferir.');
    } catch {
      error('Não foi possível copiar', 'Copie manualmente pela barra de endereço.');
    }
  };

  // ===================== RENDER: BUILDER =====================

  if (builder) {
    const accent = builder.design.accent || '#8c2438';
    return (
      <div className="space-y-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setBuilder(null)}
            className="tap inline-flex items-center gap-2 text-xs font-bold text-gray-450 hover:text-heading transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para as fichas
          </button>
          <button
            onClick={saveForm}
            disabled={saving}
            className="tap px-5 py-2.5 surface-wine text-white text-xs font-bold rounded-xl shadow-soft hover:shadow-glow transition-all-custom disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {builder.formId ? 'Salvar alterações' : 'Salvar ficha'}
          </button>
        </div>

        {/* Nome e descrição */}
        <Card>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-450 mb-1.5">Nome da ficha</label>
          <input
            type="text" maxLength={120}
            className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm font-semibold text-heading outline-none focus:ring-2 focus:ring-wine-500/25"
            placeholder='Ex.: "Anamnese Facial", "Ficha de Cílios"...'
            value={builder.title}
            onChange={e => setBuilder(b => b && ({ ...b, title: e.target.value }))}
          />
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-450 mt-4 mb-1.5">Descrição (opcional)</label>
          <textarea
            rows={2} maxLength={500}
            className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-heading outline-none focus:ring-2 focus:ring-wine-500/25 resize-y"
            placeholder="Uma frase curta explicando para que serve esta ficha."
            value={builder.description}
            onChange={e => setBuilder(b => b && ({ ...b, description: e.target.value }))}
          />
        </Card>

        {/* Design */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-wine-700" />
            <h3 className="text-sm font-bold text-heading">Design do link e do PDF</h3>
          </div>
          <p className="text-[11px] text-gray-450 mb-3">Cor de destaque que a cliente vê ao preencher — e que colore o PDF final.</p>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_SWATCHES.map(color => (
              <button
                key={color}
                onClick={() => setBuilder(b => b && ({ ...b, design: { ...b.design, accent: color } }))}
                className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${accent === color ? 'border-heading scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
                aria-label={`Cor ${color}`}
              />
            ))}
            <label className="ml-1 inline-flex items-center gap-2 text-[11px] font-semibold text-gray-450 cursor-pointer">
              <input
                type="color"
                value={accent}
                onChange={e => setBuilder(b => b && ({ ...b, design: { ...b.design, accent: e.target.value } }))}
                className="h-9 w-9 rounded-full border border-line cursor-pointer bg-transparent"
              />
              Personalizada
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={builder.design.showLogo !== false}
              onChange={e => setBuilder(b => b && ({ ...b, design: { ...b.design, showLogo: e.target.checked } }))}
              className="h-4 w-4 rounded"
              style={{ accentColor: accent }}
            />
            <span className="text-xs font-semibold text-gray-450">Mostrar o nome da minha marca no topo da ficha</span>
          </label>
        </Card>

        {/* Perguntas */}
        <div className="space-y-3">
          {builder.questions.map((q, i) => (
            <Card key={q.id} pad="p-4">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-7 w-7 shrink-0 rounded-lg text-white text-xs font-black flex items-center justify-center"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-3">
                  <input
                    type="text" maxLength={400}
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-semibold text-heading outline-none focus:ring-2 focus:ring-wine-500/25"
                    placeholder="Escreva a pergunta..."
                    value={q.label}
                    onChange={e => patchQuestion(q.id, { label: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={q.type}
                      onChange={e => {
                        const type = e.target.value as AnamnesisQuestionType;
                        patchQuestion(q.id, {
                          type,
                          options: ['select', 'multiselect'].includes(type) ? (q.options?.length ? q.options : ['Opção 1', 'Opção 2']) : undefined,
                        });
                      }}
                      className="px-3 py-2 bg-surface-2 border border-line rounded-lg text-xs font-bold text-heading outline-none cursor-pointer"
                    >
                      {(Object.keys(TYPE_LABEL) as AnamnesisQuestionType[]).map(t => (
                        <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                      ))}
                    </select>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-450 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!q.required}
                        onChange={e => patchQuestion(q.id, { required: e.target.checked })}
                        className="h-3.5 w-3.5 rounded"
                        style={{ accentColor: accent }}
                      />
                      Obrigatória
                    </label>
                  </div>
                  {['select', 'multiselect'].includes(q.type) && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-450 mb-1">Opções (uma por linha)</label>
                      <textarea
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-xl text-xs text-heading outline-none focus:ring-2 focus:ring-wine-500/25 resize-y"
                        value={(q.options || []).join('\n')}
                        onChange={e => patchQuestion(q.id, { options: e.target.value.split('\n') })}
                        onBlur={e => patchQuestion(q.id, { options: e.target.value.split('\n').map(o => o.trim()).filter(Boolean) })}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="tap p-1.5 text-gray-400 hover:text-heading disabled:opacity-30 rounded-lg hover:bg-surface-2" aria-label="Mover para cima">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => moveQuestion(i, 1)} disabled={i === builder.questions.length - 1} className="tap p-1.5 text-gray-400 hover:text-heading disabled:opacity-30 rounded-lg hover:bg-surface-2" aria-label="Mover para baixo">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => removeQuestion(q.id)} className="tap p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" aria-label="Excluir pergunta">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}

          <button
            onClick={addQuestion}
            className="tap w-full py-3.5 border-2 border-dashed border-line rounded-2xl text-xs font-bold text-gray-450 hover:text-wine-700 hover:border-wine-500/40 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Adicionar pergunta
          </button>
        </div>
      </div>
    );
  }

  // ===================== RENDER: LISTAS =====================

  return (
    <div className="space-y-5 pb-24">
      {/* Tabs + ação principal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-surface-2 border border-line rounded-2xl">
          <button
            onClick={() => setTab('fichas')}
            className={`tap px-4 py-2 rounded-xl text-xs font-bold transition-colors ${tab === 'fichas' ? 'bg-white text-heading shadow-soft' : 'text-gray-450'}`}
          >
            Minhas fichas ({forms.length})
          </button>
          <button
            onClick={() => setTab('respostas')}
            className={`tap px-4 py-2 rounded-xl text-xs font-bold transition-colors ${tab === 'respostas' ? 'bg-white text-heading shadow-soft' : 'text-gray-450'}`}
          >
            Respostas ({responses.length}){pendingCount > 0 && <span className="ml-1.5 text-[10px] font-black text-amber-600">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>}
          </button>
        </div>
        <button
          onClick={() => setShowTemplates(true)}
          className="tap px-4 py-2.5 surface-wine text-white text-xs font-bold rounded-xl shadow-soft hover:shadow-glow transition-all-custom inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Nova ficha
        </button>
      </div>

      {!whatsappConnected && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed">
          <strong>WhatsApp não conectado:</strong> os links e PDFs serão gerados normalmente, mas o envio automático pelo seu número fica desativado.
          Você ainda pode enviar o link manualmente (botão do WhatsApp) — para automatizar, conecte seu WhatsApp em <em>WhatsApp</em>.
        </div>
      )}

      {tab === 'fichas' && (
        forms.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="Nenhuma ficha de anamnese ainda"
            description="Crie sua primeira ficha a partir de um modelo pronto do mercado ou monte a sua do zero — e envie por link para as clientes responderem no celular."
            actionText="Criar minha primeira ficha"
            onAction={() => setShowTemplates(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {forms.map(form => {
              const answered = responses.filter(r => r.form_id === form.id && r.status === 'completed').length;
              return (
                <Card key={form.id} pad="p-5" className="flex flex-col">
                  <div className="flex items-start gap-3">
                    <span className="p-2.5 rounded-xl text-white shrink-0" style={{ backgroundColor: form.design?.accent || '#8c2438' }}>
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-heading truncate" title={form.title}>{form.title}</h3>
                      <p className="text-[11px] text-gray-450 mt-0.5 line-clamp-2">{form.description || `${form.questions.length} perguntas`}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-gray-450 uppercase tracking-wide">
                    <span>{form.questions.length} perguntas</span>
                    <span>·</span>
                    <span>{answered} respondida{answered !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-line flex items-center gap-2">
                    <button
                      onClick={() => setSendTarget(form)}
                      className="tap flex-1 py-2.5 surface-wine text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 hover:shadow-glow transition-all-custom"
                    >
                      <Send className="h-3.5 w-3.5" /> Enviar
                    </button>
                    <button
                      onClick={() => startEdit(form)}
                      className="tap p-2.5 text-gray-450 hover:text-heading border border-line rounded-xl hover:bg-surface-2 transition-colors"
                      aria-label="Editar ficha"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setFormToDelete(form)}
                      className="tap p-2.5 text-gray-450 hover:text-red-600 border border-line rounded-xl hover:bg-red-50 transition-colors"
                      aria-label="Excluir ficha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === 'respostas' && (
        responses.length === 0 ? (
          <EmptyState
            icon={<FilePlus2 className="h-7 w-7" />}
            title="Nenhuma ficha enviada ainda"
            description="Quando você enviar uma ficha para uma cliente, o link e o status do preenchimento aparecem aqui — com o PDF pronto assim que ela responder."
          />
        ) : (
          <div className="space-y-2.5">
            {responses.map(r => (
              <Card key={r.id} pad="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-heading truncate">{r.client_name || 'Cliente'}</h4>
                      {r.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Preenchida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          <Clock className="h-3 w-3" /> Aguardando
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-450 mt-0.5 truncate">
                      {r.form_title} · enviada {formatDateTime(r.created_at)}
                      {r.completed_at ? ` · respondida ${formatDateTime(r.completed_at)}` : ''}
                      {r.pdf_sent_at ? ' · PDF no WhatsApp ✓' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.status === 'completed' ? (
                      <a
                        href={`/api/anamnese/${r.token}/pdf`}
                        target="_blank" rel="noopener noreferrer"
                        className="tap px-3 py-2 text-xs font-bold text-wine-700 border border-wine-700/25 rounded-xl hover:bg-wine-500/5 transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileDown className="h-3.5 w-3.5" /> PDF
                      </a>
                    ) : (
                      <>
                        <button
                          onClick={() => copyLink(r.token)}
                          className="tap px-3 py-2 text-xs font-bold text-gray-450 border border-line rounded-xl hover:bg-surface-2 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copiar link
                        </button>
                        <a
                          href={`/ficha/${r.token}`}
                          target="_blank" rel="noopener noreferrer"
                          className="tap p-2 text-gray-450 border border-line rounded-xl hover:bg-surface-2 transition-colors"
                          aria-label="Abrir link da ficha"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => setResponseToDelete(r)}
                      className="tap p-2 text-gray-400 hover:text-red-600 border border-line rounded-xl hover:bg-red-50 transition-colors"
                      aria-label="Excluir resposta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Modal: escolher modelo */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-[#1a0e12]/60" onClick={() => setShowTemplates(false)} />
          <div className="relative w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8">
            <h3 className="text-lg font-black text-heading tracking-tight">Como você quer começar?</h3>
            <p className="text-xs text-gray-450 mt-1">Escolha um modelo pronto do mercado (você pode editar tudo depois) ou monte do zero.</p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={startBlank}
                className="tap text-left p-4 border-2 border-dashed border-line rounded-2xl hover:border-wine-500/40 transition-colors group"
              >
                <span className="inline-flex p-2.5 bg-surface-2 text-wine-700 rounded-xl group-hover:bg-wine-500/10 transition-colors">
                  <FilePlus2 className="h-5 w-5" />
                </span>
                <h4 className="mt-3 text-sm font-bold text-heading">Começar do zero</h4>
                <p className="mt-1 text-[11px] text-gray-450 leading-relaxed">Monte sua ficha pergunta por pergunta, com os tipos de resposta e o design que quiser.</p>
              </button>
              {ANAMNESIS_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => startFromTemplate(t.id)}
                  className="tap text-left p-4 border border-line rounded-2xl hover:border-wine-500/40 hover:shadow-soft transition-all-custom group"
                >
                  <span className="inline-flex p-2.5 bg-wine-500/8 text-wine-700 rounded-xl">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <h4 className="mt-3 text-sm font-bold text-heading">{t.name}</h4>
                  <p className="mt-1 text-[11px] text-gray-450 leading-relaxed line-clamp-2">{t.description}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-gray-400">{t.questions.length} perguntas</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: enviar para a cliente */}
      {sendTarget && (
        <SendModal
          professionalId={professionalId}
          form={sendTarget}
          clients={clients}
          whatsappConnected={whatsappConnected}
          onClose={() => setSendTarget(null)}
          onSent={() => router.refresh()}
        />
      )}

      <ConfirmDialog
        isOpen={!!formToDelete}
        title="Excluir esta ficha?"
        description={`"${formToDelete?.title}" será excluída junto com todas as respostas já recebidas dela. Essa ação não pode ser desfeita.`}
        confirmText="Excluir ficha"
        isLoading={deleting}
        onConfirm={confirmDeleteForm}
        onCancel={() => setFormToDelete(null)}
      />
      <ConfirmDialog
        isOpen={!!responseToDelete}
        title="Excluir esta resposta?"
        description={`A ficha de ${responseToDelete?.client_name || 'cliente'} será removida${responseToDelete?.status === 'pending' ? ' e o link enviado deixará de funcionar' : ''}. Essa ação não pode ser desfeita.`}
        confirmText="Excluir"
        isLoading={deleting}
        onConfirm={confirmDeleteResponse}
        onCancel={() => setResponseToDelete(null)}
      />
    </div>
  );
};

// ===================== MODAL DE ENVIO =====================

interface SendModalProps {
  professionalId: string;
  form: AnamnesisForm;
  clients: Client[];
  whatsappConnected: boolean;
  onClose: () => void;
  onSent: () => void;
}

const SendModal: React.FC<SendModalProps> = ({ professionalId, form, clients, whatsappConnected, onClose, onSent }) => {
  const { success, error } = useToast();
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ link: string; sentViaBot: boolean; waLink: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 6);
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.whatsapp.includes(q.replace(/\D/g, '') || '—')).slice(0, 6);
  }, [clients, query]);

  const pickClient = (c: Client) => {
    setClientId(c.id);
    setName(c.name);
    setWhatsapp(c.whatsapp);
    setQuery(c.name);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await sendAnamnesisAction(professionalId, {
        formId: form.id,
        clientId,
        clientName: name,
        clientWhatsapp: whatsapp,
      });
      if (res.success && res.link) {
        setResult({ link: res.link, sentViaBot: !!res.sentViaBot, waLink: res.waLink || '' });
        onSent();
        if (res.sentViaBot) success('Enviado no WhatsApp! 💛', `${name.split(' ')[0]} já recebeu o link da ficha pelo seu número conectado.`);
      } else {
        error('Não foi possível enviar', res.error || 'Tente novamente.');
      }
    } finally {
      setSending(false);
    }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); success('Link copiado!', 'Cole onde preferir.'); }
    catch { error('Não foi possível copiar', 'Selecione o link e copie manualmente.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-[#1a0e12]/60" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8">
        {!result ? (
          <>
            <h3 className="text-lg font-black text-heading tracking-tight">Enviar &quot;{form.title}&quot;</h3>
            <p className="text-xs text-gray-450 mt-1">
              Um link único e seguro é gerado para a cliente responder pelo celular.
              {whatsappConnected ? ' O link é enviado automaticamente pelo seu WhatsApp conectado.' : ''}
            </p>

            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-450 mt-5 mb-1.5">Buscar nos contatos</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-heading outline-none focus:ring-2 focus:ring-wine-500/25"
                placeholder="Digite o nome da cliente..."
                value={query}
                onChange={e => { setQuery(e.target.value); setClientId(null); }}
              />
            </div>
            {query.trim() && !clientId && filtered.length > 0 && (
              <div className="mt-2 border border-line rounded-xl divide-y divide-line overflow-hidden">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => pickClient(c)}
                    className="tap w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    <span className="font-semibold text-heading">{c.name}</span>
                    <span className="ml-2 text-[11px] text-gray-450">{c.whatsapp}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-450 mb-1.5">Nome da cliente</label>
                <input
                  type="text" maxLength={120}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-heading outline-none focus:ring-2 focus:ring-wine-500/25"
                  placeholder="Nome completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-450 mb-1.5">WhatsApp (com DDD)</label>
                <input
                  type="tel" maxLength={20}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-heading outline-none focus:ring-2 focus:ring-wine-500/25"
                  placeholder="(11) 99999-9999"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="tap px-4 py-3 text-xs font-bold text-gray-450 border border-line rounded-xl hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !name.trim() || whatsapp.replace(/\D/g, '').length < 10}
                className="tap flex-1 py-3 surface-wine text-white text-xs font-bold rounded-xl shadow-soft hover:shadow-glow transition-all-custom disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Gerar link e enviar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-heading tracking-tight">
                {result.sentViaBot ? 'Link enviado no WhatsApp! 💛' : 'Link da ficha gerado!'}
              </h3>
              <p className="text-xs text-gray-450 mt-1 leading-relaxed max-w-sm">
                {result.sentViaBot
                  ? `${name.split(' ')[0]} recebeu o link pelo seu número conectado. Quando ela terminar, o PDF chega automático no WhatsApp dela e fica disponível aqui.`
                  : 'Envie o link para a cliente pelo botão abaixo. Quando ela terminar de responder, o PDF fica disponível na aba Respostas.'}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 bg-surface-2 border border-line rounded-xl px-3.5 py-3">
              <LinkIcon className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="flex-1 text-[11px] text-gray-600 truncate">{result.link}</span>
              <button onClick={() => copy(result.link)} className="tap p-1.5 text-gray-450 hover:text-heading rounded-lg" aria-label="Copiar link">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              {!result.sentViaBot && (
                <a
                  href={result.waLink}
                  target="_blank" rel="noopener noreferrer"
                  className="tap flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" /> Enviar pelo WhatsApp
                </a>
              )}
              <button
                onClick={onClose}
                className={`tap py-3 text-xs font-bold rounded-xl transition-colors ${result.sentViaBot ? 'flex-1 surface-wine text-white' : 'px-5 text-gray-450 border border-line hover:bg-surface-2'}`}
              >
                Concluir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnamnesisPanel;
