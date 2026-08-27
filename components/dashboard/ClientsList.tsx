'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Client, Appointment } from '@/types/database';
import { MessageCircle, History, X, Cake, UserPlus, Upload, FileSpreadsheet } from 'lucide-react';
import { statusMeta } from '@/lib/appointments/status';
import { buildWhatsappLink, formatDateBR } from '@/lib/whatsapp';
import { useToast } from '../ui/Toast';
import { Portal } from '../ui/Portal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { PageHeader } from '../ui/PageHeader';
import { SearchField } from '../ui/SearchField';
import { Segmented } from '../ui/Segmented';
import { TechTable } from '../ui/TechTable';
import { StatusLabel } from '../ui/StatusDot';
import { EmptyState } from '../ui/EmptyState';
import { MonoLabel, MonoValue } from '../ui/Mono';
import {
  createClientAction, importClientsAction, deleteClientsAction, deleteAllClientsAction, updateClientNotesAction,
  getTrashedClientsAction, restoreClientsAction, purgeClientsAction,
} from '@/app/actions/crm';
import { Trash2, RotateCcw } from 'lucide-react';

interface ClientsListProps {
  professionalId: string;
  initialClients: Client[];
  appointments: Appointment[];
}

const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');
const DAYS_AWAY = 45; // limiar de "cliente sumida"

// Normaliza cabeçalho (sem acento, minúsculo)
const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface ParsedRow { name: string; whatsapp: string; email?: string; birthday?: string; }

/** Converte texto CSV (vírgula ou ponto-e-vírgula) em linhas de cliente. */
function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delim = (lines[0].match(/;/g)?.length || 0) >= (lines[0].match(/,/g)?.length || 0) ? ';' : ',';
  const split = (l: string) => l.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));

  const header = split(lines[0]).map(norm);
  const findIdx = (...keys: string[]) => header.findIndex(h => keys.some(k => h.includes(k)));
  let iName = findIdx('nome', 'name', 'cliente');
  let iPhone = findIdx('whatsapp', 'telefone', 'celular', 'fone', 'phone');
  let iEmail = findIdx('email', 'e-mail');
  let iBday = findIdx('nascimento', 'aniversario', 'birthday', 'nasc');

  let start = 1;
  // Sem cabeçalho reconhecível → assume ordem: nome, whatsapp, email, nascimento
  if (iName === -1 && iPhone === -1) { iName = 0; iPhone = 1; iEmail = 2; iBday = 3; start = 0; }

  const rows: ParsedRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const c = split(lines[i]);
    const name = (iName >= 0 ? c[iName] : c[0]) || '';
    const whatsapp = (iPhone >= 0 ? c[iPhone] : c[1]) || '';
    if (!name && !whatsapp) continue;
    rows.push({
      name, whatsapp,
      email: iEmail >= 0 ? c[iEmail] : undefined,
      birthday: iBday >= 0 ? normalizeDate(c[iBday]) : undefined,
    });
  }
  return rows;
}

/** Aceita 2026-05-01 ou 01/05/2026 → YYYY-MM-DD. */
function normalizeDate(v?: string): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return undefined;
}

interface ClientStats {
  total: number;
  completed: number;
  noShows: number;
  cancelled: number;
  lastVisitISO: string | null;
  daysSince: number | null;
  history: Appointment[];
}

export const ClientsList: React.FC<ClientsListProps> = ({ professionalId, initialClients, appointments }) => {
  const router = useRouter();
  const { success, error, info } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'away' | 'birthday' | 'frequency'>('all');
  const [detail, setDetail] = useState<Client | null>(null);

  // Ficha técnica / observações da cliente
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  useEffect(() => {
    if (detail) setNoteDraft(notesById[detail.id] ?? detail.notes ?? '');
  }, [detail, notesById]);

  const saveNote = async () => {
    if (!detail) return;
    setSavingNote(true);
    try {
      const res = await updateClientNotesAction(professionalId, detail.id, noteDraft);
      if (res.success) {
        setNotesById(prev => ({ ...prev, [detail.id]: noteDraft }));
        success('Ficha salva', 'As observações da cliente foram atualizadas.');
      } else {
        error('Erro', res.error || 'Não foi possível salvar a ficha.');
      }
    } catch {
      error('Erro', 'Falha ao salvar a ficha.');
    } finally {
      setSavingNote(false);
    }
  };

  // Edição em lote
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelected(new Set());

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    setBulkBusy(true);
    try {
      const res = await deleteClientsAction(professionalId, ids);
      if (res.success) {
        success('Movido(s) para a lixeira', `${res.count} cliente(s) — pode restaurar.`, {
          actionLabel: 'Desfazer',
          onAction: async () => { await restoreClientsAction(professionalId, ids); router.refresh(); },
        });
        clearSel(); router.refresh();
      } else error('Falha', res.error || 'Não foi possível excluir.');
    } finally { setBulkBusy(false); }
  };

  const deleteAll = async () => {
    setBulkBusy(true);
    try {
      const res = await deleteAllClientsAction(professionalId);
      if (res.success) { success('Movidos para a lixeira', 'Todos os clientes foram para a lixeira (restaurável).'); clearSel(); setConfirmDeleteAll(false); router.refresh(); }
      else error('Falha', res.error || 'Não foi possível excluir.');
    } finally { setBulkBusy(false); }
  };

  // Lixeira de clientes
  const [showTrash, setShowTrash] = useState(false);
  const [trashedClients, setTrashedClients] = useState<Client[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashBusyId, setTrashBusyId] = useState<string | null>(null);

  const openTrash = async () => {
    setShowTrash(true);
    setTrashLoading(true);
    const items = await getTrashedClientsAction(professionalId).catch(() => [] as Client[]);
    setTrashedClients(items);
    setTrashLoading(false);
  };

  const restoreOne = async (id: string) => {
    setTrashBusyId(id);
    const res = await restoreClientsAction(professionalId, [id]);
    setTrashBusyId(null);
    if (res.success) {
      setTrashedClients(prev => prev.filter(c => c.id !== id));
      success('Restaurada!', 'A cliente voltou para a lista.');
      router.refresh();
    } else error('Falha', res.error || 'Não foi possível restaurar.');
  };

  const purgeOne = async (id: string) => {
    if (!confirm('Excluir DEFINITIVAMENTE esta cliente? Não dá pra desfazer.')) return;
    setTrashBusyId(id);
    const res = await purgeClientsAction(professionalId, [id]);
    setTrashBusyId(null);
    if (res.success) {
      setTrashedClients(prev => prev.filter(c => c.id !== id));
      success('Excluída', 'Removida definitivamente.');
    } else error('Falha', res.error || 'Não foi possível excluir.');
  };

  // Cadastro manual
  const [showAdd, setShowAdd] = useState(false);
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fBday, setFBday] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Importação
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createClientAction(professionalId, { name: fName, whatsapp: fPhone, email: fEmail, birthday: fBday || undefined, notes: fNotes || undefined });
      if (res.success) {
        success('Cliente cadastrada!', `${fName} foi adicionada à sua carteira.`);
        setShowAdd(false); setFName(''); setFPhone(''); setFEmail(''); setFBday(''); setFNotes('');
        router.refresh();
      } else error('Falha', res.error || 'Não foi possível cadastrar.');
    } finally { setSaving(false); }
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) { error('Arquivo vazio', 'Não encontramos clientes válidas no arquivo.'); return; }
      setImportPreview(rows);
      info('Pré-visualização pronta', `${rows.length} cliente(s) detectada(s). Confira e confirme.`);
    } catch {
      error('Erro ao ler', 'Não foi possível ler o arquivo. Use um CSV.');
    }
  };

  const confirmImport = async () => {
    setImporting(true);
    try {
      const res = await importClientsAction(professionalId, importPreview);
      if (res.success) {
        success('Importação concluída!', `${res.imported} adicionada(s)${res.skipped ? `, ${res.skipped} ignorada(s)` : ''}.`);
        setShowImport(false); setImportPreview([]);
        router.refresh();
      } else error('Falha', res.error || 'Não foi possível importar.');
    } finally { setImporting(false); }
  };

  const todayISO = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth() + 1;

  // Estatísticas por cliente (indexadas pelo whatsapp normalizado)
  const statsByPhone = useMemo(() => {
    const map: Record<string, ClientStats> = {};
    for (const a of appointments) {
      const key = onlyDigits(a.client_whatsapp);
      const s = (map[key] ||= { total: 0, completed: 0, noShows: 0, cancelled: 0, lastVisitISO: null, daysSince: null, history: [] });
      s.history.push(a);
      if (a.status === 'cancelled') s.cancelled++;
      else s.total++;
      if (a.status === 'completed') s.completed++;
      if (a.status === 'no_show') s.noShows++;
      if (['completed', 'confirmed'].includes(a.status)) {
        if (!s.lastVisitISO || a.date > s.lastVisitISO) s.lastVisitISO = a.date;
      }
    }
    for (const k in map) {
      const s = map[k];
      s.history.sort((x, y) => `${y.date}${y.start_time}`.localeCompare(`${x.date}${x.start_time}`));
      if (s.lastVisitISO) {
        s.daysSince = Math.floor((Date.parse(todayISO) - Date.parse(s.lastVisitISO)) / 86400000);
      }
    }
    return map;
  }, [appointments, todayISO]);

  const getStats = (c: Client): ClientStats =>
    statsByPhone[onlyDigits(c.whatsapp)] || { total: c.total_appointments || 0, completed: 0, noShows: 0, cancelled: 0, lastVisitISO: c.last_appointment_at, daysSince: null, history: [] };

  const isAway = (s: ClientStats) => s.daysSince !== null && s.daysSince >= DAYS_AWAY;
  const birthdayMonth = (c: Client) => c.birthday ? parseInt(c.birthday.split('-')[1], 10) : null;

  const awayCount = initialClients.filter(c => isAway(getStats(c))).length;
  const birthdayCount = initialClients.filter(c => birthdayMonth(c) === currentMonth).length;

  const filteredClients = initialClients.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whatsapp.includes(searchTerm) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'away') return isAway(getStats(c));
    if (filter === 'birthday') return birthdayMonth(c) === currentMonth;
    if (filter === 'frequency') return true; // mostra todos, mas vai ordenar por frequência
    return true;
  });

  // Ordena por frequência quando o filtro é 'frequency'
  const sortedClients = useMemo(() => {
    if (filter === 'frequency') {
      return [...filteredClients].sort((a, b) => {
        const sa = getStats(a);
        const sb = getStats(b);
        return sb.completed - sa.completed;
      });
    }
    return filteredClients;
  }, [filteredClients, filter]);

  /** Confiabilidade vira TOM, não pílula: o ponto de status carrega o
   *  significado e o rótulo fica em mono. Eram três retângulos pastel
   *  diferentes (menta, vinho translúcido, salmão) numa lista de 153 linhas. */
  const reliability = (s: ClientStats): { label: string; tone: 'success' | 'accent' | 'danger' } | null => {
    const base = s.total + s.noShows;
    if (base < 2) return null;
    const ratio = s.noShows / base;
    if (ratio === 0) return { label: 'Pontual', tone: 'success' };
    if (ratio <= 0.25) return { label: 'Confiável', tone: 'accent' };
    return { label: 'Faltas', tone: 'danger' };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        trail={[
          'Contatos',
          `${initialClients.length} cadastrados`,
          awayCount > 0 ? `${awayCount} sem retorno` : null,
          birthdayCount > 0 ? `${birthdayCount} fazem aniversário` : null,
        ]}
        title="Contatos"
        actions={
          <>
            <Button variant="ghost" size="md" onClick={openTrash} leadingIcon={<Trash2 className="h-[18px] w-[18px]" />}>
              <span className="hidden sm:inline">Lixeira</span>
            </Button>
            <Button variant="secondary" size="md" onClick={() => setShowImport(true)} leadingIcon={<Upload className="h-[18px] w-[18px]" />}>
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button size="md" onClick={() => setShowAdd(true)} leadingIcon={<UserPlus className="h-[18px] w-[18px]" />}>
              Novo contato
            </Button>
          </>
        }
      />

      {/* Busca + recortes. As sub-abas eram quatro pílulas com contador dentro
          de outra pílula; viraram um segmented control retangular, e a
          contagem subiu para a trilha mono do header, onde ela é lida uma vez
          em vez de repetida em cada aba. */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="flex-1 min-w-[14rem] max-w-sm"
          label="Buscar contato"
          placeholder="Nome, WhatsApp ou e-mail"
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <Segmented
          ariaLabel="Recorte da carteira"
          value={filter}
          onChange={setFilter}
          items={[
            { key: 'all', label: 'Todos' },
            { key: 'birthday', label: 'Aniversário' },
            { key: 'frequency', label: 'Frequência' },
            { key: 'away', label: 'Sem retorno' },
          ]}
        />
      </div>

      {/* Barra de seleção: só existe quando há seleção. Antes ela ficava
          permanente na tela dizendo "Edição em lote" com um "Excluir todos"
          vermelho sempre à vista — uma ação irreversível a um clique de
          distância, o dia inteiro. */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border border-line-strong rounded-surface bg-n-25 px-4 py-2.5">
          <MonoLabel className="!text-wine-700">{selected.size} selecionado(s)</MonoLabel>
          <button onClick={clearSel} className="text-caption text-n-600 hover:text-ink underline">
            Limpar seleção
          </button>
          <Button
            variant="destructive"
            size="sm"
            onClick={bulkDelete}
            disabled={bulkBusy}
            className="ml-auto"
            leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Excluir {selected.size}
          </Button>
        </div>
      )}

      <Card pad="p-0" className="overflow-hidden">
        <TechTable
          rows={sortedClients}
          rowKey={(c) => c.id}
          empty={
            <EmptyState
              framed={false}
              title={filter === 'all' ? 'Nenhum contato cadastrado' : 'Nenhum contato neste recorte'}
              description={
                filter === 'all'
                  ? 'Adicione a primeira cliente ou importe sua lista de um arquivo CSV.'
                  : 'Nenhuma cliente corresponde à busca ou ao recorte selecionado.'
              }
              actionText={filter === 'all' ? 'Novo contato' : undefined}
              onAction={filter === 'all' ? () => setShowAdd(true) : undefined}
            />
          }
          columns={[
            {
              key: 'sel',
              header: '',
              width: '1%',
              className: 'whitespace-nowrap',
              cell: (c) => (
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${c.name}`}
                  checked={selected.has(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSel(c.id)}
                  className="h-4 w-4 rounded-badge border-n-300 accent-wine-700 cursor-pointer"
                />
              ),
            },
            {
              key: 'name',
              header: 'Contato',
              width: '100%',
              sortValue: (c) => c.name,
              cell: (c) => {
                const st = getStats(c);
                const rel = reliability(st);
                return (
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Avatar QUADRADO de raio 4 — o círculo era o último
                          rounded-full que não é ponto de status. */}
                      <span className="h-6 w-6 shrink-0 rounded-badge border border-line bg-n-50 inline-flex items-center justify-center mono-micro text-n-600">
                        {c.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="text-ink truncate">{c.name}</span>
                      {birthdayMonth(c) === currentMonth && (
                        <Cake className="h-3.5 w-3.5 text-wine-700 shrink-0" aria-label="Aniversário neste mês" />
                      )}
                      {rel && <StatusLabel tone={rel.tone}>{rel.label}</StatusLabel>}
                    </div>
                    {c.email && <p className="text-caption text-n-500 truncate pl-8">{c.email}</p>}
                  </div>
                );
              },
            },
            {
              key: 'whatsapp',
              header: 'WhatsApp',
              className: 'whitespace-nowrap',
              hideOnMobile: true,
              sortValue: (c) => c.whatsapp,
              cell: (c) => <MonoValue className="text-body-sm text-ink">{c.whatsapp}</MonoValue>,
            },
            {
              key: 'visits',
              header: 'Visitas',
              num: true,
              className: 'whitespace-nowrap',
              sortValue: (c) => getStats(c).total,
              cell: (c) => {
                const st = getStats(c);
                /* Visitas e faltas empilhadas, não lado a lado: em linha
                   "3 1 FALTA" cola dois números de significados opostos e o
                   olho lê "31". Empilhado, a coluna continua sendo uma coluna
                   de números alinhados à direita. */
                return (
                  <span className="inline-flex flex-col items-end">
                    <span className="mono text-body-sm text-ink">{st.total}</span>
                    {st.noShows > 0 && (
                      <span className="mono-micro text-danger">
                        {st.noShows} falta{st.noShows > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                );
              },
            },
            {
              key: 'last',
              header: 'Última visita',
              num: true,
              className: 'whitespace-nowrap',
              sortValue: (c) => getStats(c).lastVisitISO ?? '',
              cell: (c) => {
                const st = getStats(c);
                if (!st.lastVisitISO) return <span className="mono-micro text-n-400">NUNCA</span>;
                const away = isAway(st);
                return (
                  <span className="inline-flex flex-col items-end">
                    <MonoValue className="text-body-sm">{formatDateBR(st.lastVisitISO)}</MonoValue>
                    {st.daysSince !== null && (
                      <span className={`mono-micro ${away ? 'text-danger' : 'text-n-500'}`}>
                        há {st.daysSince} dias
                      </span>
                    )}
                  </span>
                );
              },
            },
          ]}
          onRowClick={(c) => setDetail(c)}
          mobileRow={(c) => {
            const st = getStats(c);
            const away = isAway(st);
            return (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${c.name}`}
                    checked={selected.has(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSel(c.id)}
                    className="h-4 w-4 shrink-0 rounded-badge border-n-300 accent-wine-700"
                  />
                  <span className="text-body-sm text-heading truncate flex-1">{c.name}</span>
                  {birthdayMonth(c) === currentMonth && <Cake className="h-3.5 w-3.5 text-wine-700 shrink-0" aria-hidden />}
                </div>
                <div className="flex items-center gap-2 mt-1 pl-6">
                  <MonoValue className="text-micro text-n-500">{c.whatsapp}</MonoValue>
                  <span className="text-n-300" aria-hidden>·</span>
                  <MonoValue className="text-micro text-n-500">{st.total} VISITAS</MonoValue>
                  {away && (
                    <>
                      <span className="text-n-300" aria-hidden>·</span>
                      <StatusLabel tone="danger">Sem retorno</StatusLabel>
                    </>
                  )}
                </div>
              </>
            );
          }}
          actions={(c) => {
            const away = isAway(getStats(c));
            return (
              <>
                <Button
                  variant="ghost" size="sm" iconOnly aria-label={`Ficha de ${c.name}`}
                  onClick={(e) => { e.stopPropagation(); setDetail(c); }}
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="sm" iconOnly aria-label={`Falar com ${c.name} no WhatsApp`}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      buildWhatsappLink(
                        c.whatsapp,
                        away ? `Oi, ${c.name.split(' ')[0]}! Senti sua falta por aqui 💛 Que tal agendar um horário?` : '',
                      ),
                      '_blank',
                    );
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </>
            );
          }}
        />
      </Card>

      {/* "Excluir todos" saiu da barra permanente e virou uma ação discreta no
          rodapé da lista: continua acessível, deixa de ficar a um clique de
          distância o tempo todo. */}
      {initialClients.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setConfirmDeleteAll(true)}
            className="text-caption text-n-500 hover:text-danger underline transition-ui"
          >
            Excluir todos os contatos
          </button>
        </div>
      )}

      {/* Ficha do contato — painel lateral.
          O cabeçalho perdeu a superfície vinho: um bloco de marca de 140px no
          topo de um painel de dados empurrava as três métricas para baixo da
          dobra e não informava nada. Agora é trilha mono + nome, e o vinho
          reaparece só onde marca estado. */}
      {detail && (() => {
        const s = getStats(detail);
        const rel = reliability(s);
        return (
          <Portal>
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 sheet-backdrop" onClick={() => setDetail(null)} />
            <aside className="relative w-full max-w-md h-full bg-surface border-l border-line shadow-lg flex flex-col animate-slide-right">
              <header className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <MonoLabel as="p">Ficha do contato</MonoLabel>
                  <h3 className="text-h3 text-heading mt-1 truncate">{detail.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <MonoValue className="text-caption text-n-600">{detail.whatsapp}</MonoValue>
                    {detail.email && <span className="text-caption text-n-500 truncate">{detail.email}</span>}
                    {detail.birthday && (
                      <span className="inline-flex items-center gap-1.5">
                        <Cake className="h-3 w-3 text-wine-700" aria-hidden />
                        <MonoValue className="text-micro text-n-600">{formatDateBR(detail.birthday)}</MonoValue>
                      </span>
                    )}
                    {rel && <StatusLabel tone={rel.tone}>{rel.label}</StatusLabel>}
                  </div>
                </div>
                <button
                  onClick={() => setDetail(null)}
                  aria-label="Fechar ficha"
                  className="shrink-0 h-9 w-9 -mt-1 -mr-1 inline-flex items-center justify-center rounded-chip text-n-500 hover:bg-n-100 hover:text-heading transition-ui"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </header>

              {/* Três índices divididos por hairline — o mesmo arquétipo do
                  painel de índices, em miniatura. Antes eram três caixas
                  cinzas de raio 16 com gap entre elas. */}
              <div className="grid grid-cols-3 border-b border-line">
                {([['Visitas', s.total], ['Concluídos', s.completed], ['Faltas', s.noShows]] as const).map(([k, v], i) => (
                  <div key={k} className={`px-4 py-3 ${i > 0 ? 'border-l border-line' : ''}`}>
                    <MonoLabel as="p">{k}</MonoLabel>
                    <p className={`mono text-h3 mt-1 leading-none ${k === 'Faltas' && v > 0 ? 'text-danger' : 'text-heading'}`}>
                      {v}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto scroll-touch p-5 space-y-6">
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <MonoLabel>Observações</MonoLabel>
                    <Button size="sm" onClick={saveNote} loading={savingNote}>Salvar</Button>
                  </div>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={5}
                    placeholder="Preferências, cuidados especiais, produtos usados, alergias/sensibilidades, informações para os próximos atendimentos…"
                    className="field-input resize-y"
                  />
                  <p className="text-caption text-n-500 mt-1.5">
                    Fica salva nesta cliente. Para observações de um atendimento específico, use as notas do agendamento.
                  </p>
                </section>

                <section>
                  <MonoLabel as="p" className="mb-2">Histórico de atendimentos</MonoLabel>
                  {s.history.length === 0 ? (
                    <p className="text-caption text-n-500 py-8 text-center line-dashed rounded-surface">
                      Sem agendamentos registrados.
                    </p>
                  ) : (
                    /* Linhas divididas por hairline de ponta a ponta, no lugar
                       de um cartão de raio 16 por atendimento. */
                    <div className="-mx-5">
                      {s.history.map((a) => {
                        const m = statusMeta(a.status);
                        return (
                          <div
                            key={a.id}
                            className="px-5 py-2.5 border-b border-line last:border-b-0 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <MonoValue className="text-body-sm text-ink">
                                {formatDateBR(a.date)} · {a.start_time.substring(0, 5)}
                              </MonoValue>
                              <p className="text-caption text-n-500 truncate">{a.service?.name}</p>
                            </div>
                            <StatusLabel tone={m.tone ?? 'neutral'}>{m.label}</StatusLabel>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <footer className="border-t border-line px-5 py-3 safe-sheet">
                <Button
                  className="w-full"
                  onClick={() => window.open(buildWhatsappLink(detail.whatsapp, ''), '_blank')}
                  leadingIcon={<MessageCircle className="h-[18px] w-[18px]" />}
                >
                  Falar no WhatsApp
                </Button>
              </footer>
            </aside>
          </div>
          </Portal>
        );
      })()}

      {/* Excluir TODOS — ação irreversível, então o botão de confirmação é
          destrutivo e o número aparece por extenso no texto. */}
      <Modal
        open={confirmDeleteAll}
        onClose={() => setConfirmDeleteAll(false)}
        busy={bulkBusy}
        trail={['Contatos', 'Ação irreversível']}
        title="Excluir todos os contatos"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteAll(false)} disabled={bulkBusy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteAll} loading={bulkBusy}>
              Excluir todos
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-ink leading-relaxed">
          Isso remove <strong className="text-danger">todos os {initialClients.length} contatos</strong> da
          sua carteira. O histórico de agendamentos é mantido, mas os contatos somem.
        </p>
        <p className="mono-micro text-danger mt-3">Esta ação não pode ser desfeita</p>
      </Modal>

      {/* Adicionar contato */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        busy={saving}
        trail={['Contatos', 'Novo']}
        title="Adicionar contato"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="client-form" loading={saving}>Cadastrar</Button>
          </>
        }
      >
        <form id="client-form" onSubmit={addClient} className="space-y-4">
          <Field
            label="Nome"
            required
            inputProps={{ value: fName, onChange: (e) => setFName(e.target.value), placeholder: 'Ex.: Marina Alves', autoFocus: true }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="WhatsApp"
              required
              inputProps={{ value: fPhone, onChange: (e) => setFPhone(e.target.value), inputMode: 'tel', placeholder: '11999999999' }}
            />
            <Field
              label="Aniversário"
              inputProps={{ type: 'date', value: fBday, onChange: (e) => setFBday(e.target.value) }}
            />
          </div>
          <Field
            label="E-mail"
            hint="Opcional."
            inputProps={{ type: 'email', value: fEmail, onChange: (e) => setFEmail(e.target.value), placeholder: 'cliente@email.com' }}
          />
          <Field label="Observações" hint="Preferências, cuidados especiais, alergias, produtos usados. Opcional.">
            <textarea
              rows={3}
              className="field-input resize-y"
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
            />
          </Field>
        </form>
      </Modal>

      {/* Importar CSV. A zona de soltura é TRACEJADA — no sistema novo o
          tracejado significa vazio/à espera, e é exatamente o que ela é. */}
      <Modal
        open={showImport}
        onClose={() => { setShowImport(false); setImportPreview([]); }}
        busy={importing}
        trail={['Contatos', 'Importar']}
        title="Importar lista"
        footer={
          importPreview.length > 0 ? (
            <>
              <Button variant="secondary" onClick={() => setImportPreview([])} disabled={importing}>
                Trocar arquivo
              </Button>
              <Button onClick={confirmImport} loading={importing}>
                Importar {importPreview.length}
              </Button>
            </>
          ) : undefined
        }
      >
        <p className="text-body-sm text-n-600 mb-4">
          Envie um arquivo <strong className="text-ink">CSV</strong> com as colunas{' '}
          <MonoValue className="text-caption text-ink">nome, whatsapp, email, nascimento</MonoValue>.
          Aceita planilhas exportadas como CSV, com vírgula ou ponto-e-vírgula.
        </p>

        {importPreview.length === 0 ? (
          <label className="flex flex-col items-center justify-center gap-2 line-dashed rounded-surface py-12 cursor-pointer hover:bg-n-25 transition-ui">
            <FileSpreadsheet className="h-[22px] w-[22px] text-n-400" aria-hidden />
            <span className="text-body-sm font-semibold text-wine-700">Selecionar arquivo CSV</span>
            <MonoLabel>Clique para escolher</MonoLabel>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </label>
        ) : (
          <>
            <MonoLabel as="p" className="mb-2">{importPreview.length} contato(s) detectado(s)</MonoLabel>
            <div className="max-h-56 overflow-y-auto scroll-touch border border-line rounded-surface">
              {importPreview.slice(0, 50).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-3 h-11 border-b border-line last:border-b-0"
                >
                  <span className="text-body-sm text-ink truncate">
                    {r.name || <em className="text-danger">sem nome</em>}
                  </span>
                  <MonoValue className="text-caption text-n-500 shrink-0">{r.whatsapp || '—'}</MonoValue>
                </div>
              ))}
              {importPreview.length > 50 && (
                <p className="px-3 py-2 mono-micro text-n-500">
                  +{importPreview.length - 50} não exibidos
                </p>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Lixeira */}
      <Modal
        open={showTrash}
        onClose={() => setShowTrash(false)}
        trail={['Contatos', 'Lixeira']}
        title="Contatos excluídos"
      >
        {trashLoading ? (
          <p className="text-body-sm text-n-500 py-8 text-center">Carregando…</p>
        ) : trashedClients.length === 0 ? (
          <EmptyState
            title="A lixeira está vazia"
            description="Contatos excluídos aparecem aqui e podem ser restaurados."
          />
        ) : (
          <div className="-mx-4 sm:-mx-5">
            {trashedClients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 border-b border-line last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-body-sm text-ink truncate">{c.name}</p>
                  <MonoValue className="text-micro text-n-500">{c.whatsapp}</MonoValue>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm" variant="secondary" onClick={() => restoreOne(c.id)} disabled={trashBusyId === c.id}
                    leadingIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  >
                    Restaurar
                  </Button>
                  <Button
                    size="sm" variant="ghost" iconOnly aria-label={`Excluir ${c.name} definitivamente`}
                    onClick={() => purgeOne(c.id)} disabled={trashBusyId === c.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

    </div>
  );
};
export default ClientsList;
