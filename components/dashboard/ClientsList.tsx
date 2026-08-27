'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Client, Appointment } from '@/types/database';
import {
  Search, MessageCircle, History, X, Clock, AlertTriangle,
  Cake, TrendingDown, ShieldCheck, Sparkles, UserPlus, Upload, FileSpreadsheet, BarChart3, Contact
} from 'lucide-react';
import { statusMeta } from '@/lib/appointments/status';
import { buildWhatsappLink, formatDateBR } from '@/lib/whatsapp';
import { useToast } from '../ui/Toast';
import { Portal } from '../ui/Portal';
import { QuickAddFab } from '../ui/QuickAddFab';
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

  const reliability = (s: ClientStats) => {
    const base = s.total + s.noShows;
    if (base < 2) return null;
    const ratio = s.noShows / base;
    if (ratio === 0) return { label: 'Pontual', cls: 'bg-success-bg text-success border-success-border', icon: ShieldCheck };
    if (ratio <= 0.25) return { label: 'Confiável', cls: 'bg-wine-700/8 text-wine-700 border-wine-700/15', icon: ShieldCheck };
    return { label: 'Atenção: faltas', cls: 'bg-danger-bg text-danger border-danger-border', icon: AlertTriangle };
  };

  return (
    <div className="space-y-6 select-none animate-fade-up">
      {/* Sub-abas de navegação */}
      <div className="flex items-center gap-1 bg-surface border border-n-200 rounded-2xl p-1 shadow-soft overflow-x-auto scrollbar-none">
        {[
          { key: 'all' as const, label: 'Todos', icon: Contact, count: initialClients.length },
          { key: 'birthday' as const, label: 'Aniversariantes', icon: Cake, count: birthdayCount },
          { key: 'frequency' as const, label: 'Frequência', icon: BarChart3, count: undefined },
          { key: 'away' as const, label: 'Sem retorno', icon: TrendingDown, count: awayCount },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(active && tab.key !== 'all' ? 'all' : tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-caption font-bold whitespace-nowrap transition-ui ${
                active
                  ? 'bg-wine-700 text-white shadow-soft'
                  : 'text-n-600 hover:bg-n-50 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  active ? 'bg-white/20 text-white' : 'bg-n-200 text-n-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 card p-4 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-n-600" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, whatsapp, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 bg-n-50 border border-n-200 rounded-xl text-label placeholder-n-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
          />
        </div>
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')} className="text-caption font-bold text-wine-500 hover:underline whitespace-nowrap">
            Limpar filtro
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={openTrash} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-surface border border-n-200 text-n-600 text-caption font-bold rounded-xl hover:bg-n-50 transition-ui whitespace-nowrap">
            <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Lixeira</span>
          </button>
          <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-surface border border-n-200 text-wine-700 text-caption font-bold rounded-xl hover:bg-n-50 transition-ui whitespace-nowrap">
            <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Importar lista</span>
          </button>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 surface-wine text-white text-caption font-bold rounded-xl shadow-soft hover:opacity-95 transition-ui whitespace-nowrap">
            <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Adicionar contato</span>
          </button>
        </div>
      </div>

      <QuickAddFab actions={[
        { label: 'Adicionar contato', icon: UserPlus, onClick: () => setShowAdd(true) },
        { label: 'Importar lista', icon: Upload, onClick: () => setShowImport(true) },
      ]} />

      {/* Barra de ações em lote */}
      {sortedClients.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 card p-3">
          <span className="text-caption font-bold text-ink">
            {selected.size > 0 ? `${selected.size} selecionado(s)` : 'Edição em lote'}
          </span>
          {selected.size > 0 && (
            <>
              <button onClick={clearSel} className="text-caption font-bold text-n-600 hover:underline">Limpar seleção</button>
              <button onClick={bulkDelete} disabled={bulkBusy} className="inline-flex items-center gap-1.5 px-3 py-2 bg-danger text-white text-caption font-bold rounded-xl hover:opacity-95 disabled:opacity-60">
                <Trash2 className="h-3.5 w-3.5" /> Excluir selecionados ({selected.size})
              </button>
            </>
          )}
          <button onClick={() => setConfirmDeleteAll(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 border border-danger-border text-danger text-caption font-bold rounded-xl hover:bg-danger-bg">
            <Trash2 className="h-3.5 w-3.5" /> Excluir todos
          </button>
        </div>
      )}

      {/* Cards (mobile) */}
      <div className="lg:hidden space-y-3">
        {sortedClients.length > 0 ? (
          sortedClients.map((client) => {
            const s = getStats(client);
            const rel = reliability(s);
            const away = isAway(s);
            return (
              <div key={client.id} className={`card p-4 transition-colors ${selected.has(client.id) ? 'ring-2 ring-wine-700/25' : ''}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${client.name}`}
                    checked={selected.has(client.id)}
                    onChange={() => toggleSel(client.id)}
                    className="h-5 w-5 mt-0.5 rounded border-n-300 text-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 cursor-pointer accent-wine-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-ink truncate">{client.name}</p>
                      {away && <span className="text-caption font-bold text-danger bg-danger-bg border border-danger-border rounded-full px-1.5 py-0.5">Sumida</span>}
                      {birthdayMonth(client) === currentMonth && <Cake className="h-3.5 w-3.5 text-wine-500" />}
                    </div>
                    <a href={buildWhatsappLink(client.whatsapp, '')} target="_blank" rel="noreferrer" className="text-caption font-semibold text-n-600 mt-0.5 inline-block">{client.whatsapp}</a>
                    {client.email && <p className="text-caption text-n-600 truncate">{client.email}</p>}

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="font-bold text-wine-700 bg-wine-700/8 px-2 py-0.5 rounded-full text-caption">{s.total} visitas</span>
                      {s.noShows > 0 && (
                        <span className="font-bold text-danger bg-danger-bg px-2 py-0.5 rounded-full text-caption">{s.noShows} falta{s.noShows > 1 ? 's' : ''}</span>
                      )}
                      {rel && (
                        <span className={`inline-flex items-center gap-1 text-caption font-bold rounded-full px-1.5 py-0.5 border ${rel.cls}`}>
                          <rel.icon className="h-2.5 w-2.5" /> {rel.label}
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-n-600 mt-1.5">
                      Última visita: {s.lastVisitISO ? `${formatDateBR(s.lastVisitISO)}${s.daysSince !== null ? ` · há ${s.daysSince} dias` : ''}` : 'Nunca'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-n-200">
                  <button onClick={() => setDetail(client)} className="tap flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-n-25 border border-n-200 text-wine-700 text-caption font-bold rounded-xl">
                    <History className="h-4 w-4" /> Histórico
                  </button>
                  <button
                    onClick={() => window.open(buildWhatsappLink(client.whatsapp, away ? `Oi, ${client.name.split(' ')[0]}! Senti sua falta por aqui 💛 Que tal agendar um horário?` : ''), '_blank')}
                    className="tap flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-success-bg text-success text-caption font-bold rounded-xl border border-success-border"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card py-12 text-center text-caption text-n-600">
            {filter === 'all' ? 'Nenhum contato cadastrado ainda.' : 'Nenhum contato neste filtro.'}
          </div>
        )}
      </div>

      {/* Tabela (desktop) */}
      <div className="hidden lg:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-n-200 text-left">
            <thead className="bg-n-50 text-caption font-semibold text-n-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={sortedClients.length > 0 && sortedClients.every(c => selected.has(c.id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(sortedClients.map(c => c.id)) : new Set())}
                    className="h-4 w-4 rounded border-n-300 text-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 cursor-pointer accent-wine-700"
                  />
                </th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4">Visitas / Faltas</th>
                <th className="px-6 py-4">Última Visita</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-n-200 text-label text-ink">
              {sortedClients.length > 0 ? (
                sortedClients.map((client) => {
                  const s = getStats(client);
                  const rel = reliability(s);
                  const away = isAway(s);
                  return (
                    <tr key={client.id} className={`transition-colors ${selected.has(client.id) ? 'bg-wine-50' : 'hover:bg-n-50/50'}`}>
                      <td className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${client.name}`}
                          checked={selected.has(client.id)}
                          onChange={() => toggleSel(client.id)}
                          className="h-4 w-4 rounded border-n-300 text-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 cursor-pointer accent-wine-700"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-ink">{client.name}</p>
                          {away && <span className="text-caption font-bold text-danger bg-danger-bg border border-danger-border rounded-full px-1.5 py-0.5">Sumida</span>}
                          {birthdayMonth(client) === currentMonth && <Cake className="h-3.5 w-3.5 text-wine-500" />}
                        </div>
                        {client.email && <p className="text-caption text-n-600 mt-0.5">{client.email}</p>}
                        {rel && (
                          <span className={`mt-1 inline-flex items-center gap-1 text-caption font-bold rounded-full px-1.5 py-0.5 border ${rel.cls}`}>
                            <rel.icon className="h-2.5 w-2.5" /> {rel.label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-ink">{client.whatsapp}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-wine-700 bg-wine-700/8 px-2.5 py-0.5 rounded-full text-caption">{s.total} visitas</span>
                        {s.noShows > 0 && (
                          <span className="ml-1.5 font-bold text-danger bg-danger-bg px-2 py-0.5 rounded-full text-caption">{s.noShows} falta{s.noShows > 1 ? 's' : ''}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-caption font-semibold text-n-600">
                        {s.lastVisitISO ? (
                          <>
                            {formatDateBR(s.lastVisitISO)}
                            {s.daysSince !== null && <span className="block text-caption text-n-600/70">há {s.daysSince} dias</span>}
                          </>
                        ) : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setDetail(client)} title="Ver histórico" className="p-2 hover:bg-n-50 text-n-600 hover:text-wine-700 rounded-xl transition-ui border border-n-200">
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => window.open(buildWhatsappLink(client.whatsapp, away ? `Oi, ${client.name.split(' ')[0]}! Senti sua falta por aqui 💛 Que tal agendar um horário?` : ''), '_blank')}
                            title="Falar no WhatsApp"
                            className="p-2 hover:bg-success-bg text-success rounded-xl transition-ui border border-n-200"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-caption text-n-600">
                    {filter === 'all' ? 'Nenhum contato cadastrado ainda.' : 'Nenhum contato neste filtro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de histórico */}
      {detail && (() => {
        const s = getStats(detail);
        return (
          <Portal>
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setDetail(null)} />
            <aside className="relative w-full max-w-md h-full bg-surface shadow-glow flex flex-col animate-slide-right">
              <div className="surface-wine text-white p-6 flex items-start justify-between">
                <div>
                  <p className="text-caption font-bold uppercase tracking-[0.18em] text-white/55">Ficha do contato</p>
                  <h3 className="text-h2 mt-1">{detail.name}</h3>
                  <p className="text-caption text-white/70 mt-0.5">{detail.whatsapp}{detail.email ? ` · ${detail.email}` : ''}</p>
                  {detail.birthday && (
                    <span className="mt-2 inline-flex items-center gap-1.5 text-caption font-bold bg-white/12 rounded-full px-2.5 py-1">
                      <Cake className="h-3 w-3" /> Nasc.: {formatDateBR(detail.birthday)}
                    </span>
                  )}
                </div>
                <button onClick={() => setDetail(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-3 gap-2 p-5 border-b border-n-200">
                {[['Visitas', s.total], ['Finalizados', s.completed], ['Faltas', s.noShows]].map(([k, v]) => (
                  <div key={k as string} className="text-center bg-n-50 rounded-2xl py-3">
                    <p className="text-h2 font-semibold text-wine-700">{v as number}</p>
                    <p className="text-caption font-bold text-n-600 uppercase tracking-wider">{k as string}</p>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Ficha técnica / observações da cliente */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-caption font-bold text-n-600 uppercase tracking-wider">Ficha do contato</p>
                    <button
                      onClick={saveNote}
                      disabled={savingNote}
                      className="tap text-caption font-bold text-white bg-wine-700 hover:bg-wine-800 rounded-lg px-3 py-1.5 disabled:opacity-60 transition-ui"
                    >
                      {savingNote ? 'Salvando…' : 'Salvar ficha'}
                    </button>
                  </div>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={5}
                    placeholder="Observações gerais, preferências, cuidados especiais, produtos usados, alergias/sensibilidades, informações para os próximos atendimentos…"
                    className="block w-full px-3 py-2.5 bg-n-50 border border-n-200 rounded-xl text-label leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 resize-y"
                  />
                  <span className="text-caption text-n-400 mt-1 block">
                    Fica salva nesta cliente. Para observações de um atendimento específico, use as notas do agendamento.
                  </span>
                </div>

                <p className="text-caption font-bold text-n-600 uppercase tracking-wider">Histórico de atendimentos</p>
                {s.history.length === 0 ? (
                  <p className="text-caption text-n-600 py-8 text-center">Sem agendamentos registrados.</p>
                ) : s.history.map((a) => {
                  const m = statusMeta(a.status);
                  return (
                    <div key={a.id} className="rounded-2xl border border-n-200 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-caption font-bold text-ink flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-n-600" /> {formatDateBR(a.date)} · {a.start_time.substring(0, 5)}
                        </p>
                        <p className="text-caption text-n-600 mt-0.5">{a.service?.name}</p>
                      </div>
                      <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
          </Portal>
        );
      })()}

      {/* Modal: excluir TODOS os clientes */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => !bulkBusy && setConfirmDeleteAll(false)} />
          <div className="relative card p-6 max-w-md w-full z-10 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-danger-bg text-danger"><Trash2 className="h-5 w-5" /></div>
              <h3 className="text-h2 text-ink tracking-tight">Excluir todos os clientes</h3>
            </div>
            <p className="text-caption text-n-600 leading-relaxed">
              Isso remove <strong className="text-danger">todos os {initialClients.length} clientes</strong> da sua carteira. O histórico de agendamentos é mantido, mas os contatos somem. <strong>Esta ação é irreversível.</strong>
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setConfirmDeleteAll(false)} disabled={bulkBusy} className="px-4 py-2 border border-n-200 rounded-xl text-caption font-bold text-n-600 hover:bg-n-50">Cancelar</button>
              <button onClick={deleteAll} disabled={bulkBusy} className="px-4 py-2 bg-danger text-white text-caption font-bold rounded-xl hover:opacity-95 disabled:opacity-60">
                {bulkBusy ? 'Excluindo...' : 'Sim, excluir todos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar cliente manualmente */}
      {showAdd && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative card w-full max-w-md rounded-3xl p-6 z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h2 text-ink tracking-tight">Adicionar cliente</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={addClient} className="space-y-3">
              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Nome *</label>
                <input required value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ex: Marina Alves"
                  className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">WhatsApp *</label>
                  <input required inputMode="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="11999999999"
                    className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                </div>
                <div>
                  <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Aniversário</label>
                  <input type="date" value={fBday} onChange={(e) => setFBday(e.target.value)}
                    className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                </div>
              </div>
              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">E-mail (opcional)</label>
                <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="cliente@email.com"
                  className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
              </div>
              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Ficha técnica / observações (opcional)</label>
                <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={3}
                  placeholder="Preferências, cuidados especiais, alergias/sensibilidades, produtos usados…"
                  className="block w-full px-3 py-2.5 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 resize-y" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-4 surface-wine text-white text-label font-bold rounded-2xl shadow-soft hover:opacity-95 transition-ui disabled:opacity-60">
                {saving ? 'Salvando...' : 'Cadastrar cliente'}
              </button>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* Modal: Importar lista (CSV) */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => { setShowImport(false); setImportPreview([]); }} />
          <div className="relative card w-full sm:max-w-lg mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-h2 text-ink tracking-tight">Importar lista de clientes</h3>
              <button onClick={() => { setShowImport(false); setImportPreview([]); }} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-caption text-n-600 mb-4">
              Envie um arquivo <strong>CSV</strong> com as colunas <em>nome, whatsapp, email, nascimento</em>.
              Aceita também planilhas exportadas como CSV (separador vírgula ou ponto-e-vírgula).
            </p>

            {importPreview.length === 0 ? (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-n-300 rounded-2xl py-10 cursor-pointer hover:bg-n-50/50 transition-colors">
                <FileSpreadsheet className="h-8 w-8 text-wine-300" />
                <span className="text-label font-bold text-wine-700">Selecionar arquivo CSV</span>
                <span className="text-caption text-n-600">Clique para escolher</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
              </label>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-caption font-bold text-ink">{importPreview.length} cliente(s) detectada(s)</span>
                  <button onClick={() => setImportPreview([])} className="text-caption font-bold text-wine-500 hover:underline">Trocar arquivo</button>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-n-200 divide-y divide-n-200">
                  {importPreview.slice(0, 50).map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-caption">
                      <span className="font-semibold text-ink truncate">{r.name || <em className="text-danger">sem nome</em>}</span>
                      <span className="text-n-600 shrink-0">{r.whatsapp || '—'}</span>
                    </div>
                  ))}
                  {importPreview.length > 50 && <p className="px-3 py-2 text-caption text-n-600">+{importPreview.length - 50} não exibidas…</p>}
                </div>
                <button onClick={confirmImport} disabled={importing} className="mt-4 w-full py-4 surface-wine text-white text-label font-bold rounded-2xl shadow-soft hover:opacity-95 transition-ui disabled:opacity-60">
                  {importing ? 'Importando...' : `Importar ${importPreview.length} cliente(s)`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Lixeira de clientes */}
      {showTrash && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setShowTrash(false)} />
          <div className="relative card w-full sm:max-w-lg mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto safe-sheet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h2 text-ink tracking-tight">Lixeira de clientes</h3>
              <button onClick={() => setShowTrash(false)} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>

            {trashLoading ? (
              <p className="text-label text-n-600 py-8 text-center">Carregando…</p>
            ) : trashedClients.length === 0 ? (
              <p className="text-label text-n-600 py-8 text-center">A lixeira está vazia.</p>
            ) : (
              <div className="space-y-2">
                {trashedClients.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 bg-n-50 border border-n-200 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-label font-bold text-ink truncate">{c.name}</p>
                      <p className="text-caption text-n-600 truncate">{c.whatsapp}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => restoreOne(c.id)} disabled={trashBusyId === c.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success text-white text-caption font-bold hover:opacity-95 disabled:opacity-50">
                        <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                      </button>
                      <button onClick={() => purgeOne(c.id)} disabled={trashBusyId === c.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-n-200 text-danger text-caption font-bold hover:bg-white disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
};
export default ClientsList;
