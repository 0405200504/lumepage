'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, CalendarDays, LogOut, ArrowRight, Store, UserPlus, X, Power, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { ProfMetric, moneyBR } from '@/lib/admin';
import { actAsProfessionalAction, createProfessionalForSalonAction, setProfessionalStatusForSalonAction } from '@/app/actions/salon';

interface SalonPanelProps {
  managerName: string;
  salonName: string;
  metrics: ProfMetric[];
}

export const SalonPanel: React.FC<SalonPanelProps> = ({ managerName, salonName, metrics }) => {
  const router = useRouter();
  const { success, error, info } = useToast();
  const [openingId, setOpeningId] = useState<string | null>(null);

  // Adicionar funcionária
  const [showAdd, setShowAdd] = useState(false);
  const [fName, setFName] = useState(''); const [fBrand, setFBrand] = useState(''); const [fEmail, setFEmail] = useState(''); const [fPhone, setFPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdPass, setCreatedPass] = useState<string | null>(null);

  const totalRevenue = metrics.reduce((s, m) => s + m.revenueCents, 0);
  const totalAppts = metrics.reduce((s, m) => s + m.total, 0);

  const openPanel = async (id: string) => {
    setOpeningId(id);
    try {
      const res = await actAsProfessionalAction(id);
      if (res.success) { info('Abrindo painel...', 'Você está gerenciando esta funcionária.'); router.push('/dashboard'); }
      else { error('Falha', res.error || 'Não foi possível abrir o painel.'); setOpeningId(null); }
    } catch { error('Erro', 'Tente novamente.'); setOpeningId(null); }
  };

  const toggleStatus = async (m: ProfMetric) => {
    const next = m.status === 'active' ? 'paused' : 'active';
    const res = await setProfessionalStatusForSalonAction(m.id, next);
    if (res.success) { success('Atualizado', `Conta ${next === 'active' ? 'ativada' : 'pausada'}.`); router.refresh(); }
    else error('Falha', res.error || 'Erro.');
  };

  const addFuncionaria = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createProfessionalForSalonAction({ name: fName, brandName: fBrand, email: fEmail, whatsapp: fPhone });
      if (res.success) {
        success('Funcionária criada!', `${fBrand} já pode acessar.`);
        setCreatedPass(res.tempPassword || null);
        setFName(''); setFBrand(''); setFEmail(''); setFPhone('');
        router.refresh();
      } else error('Falha', res.error || 'Não foi possível criar.');
    } finally { setSaving(false); }
  };

  const logout = async () => {
    const { logoutAction } = await import('@/app/actions/professional');
    await logoutAction();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-n-25">
      <header className="surface-wine text-white">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LumeLogo variant="light" className="h-7" />
            <span className="hidden sm:inline text-caption font-bold uppercase tracking-[0.2em] text-white/55 border-l border-white/20 pl-3">Gerente de Contas</span>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 text-caption font-bold text-white/70 hover:text-white transition-colors"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-wine-600 text-caption font-semibold uppercase tracking-widest"><Store className="h-3.5 w-3.5" /> {salonName}</div>
            <h1 className="text-h2 md:text-h1 font-semibold text-wine-700 tracking-tight mt-1">Olá, {managerName}!</h1>
            <p className="text-caption text-n-600 mt-1">Gerencie as contas das suas funcionárias e abra o painel de cada uma.</p>
          </div>
          <button onClick={() => { setShowAdd(true); setCreatedPass(null); }} className="inline-flex items-center justify-center gap-2 px-5 py-3 surface-wine text-white text-caption font-bold rounded-2xl shadow-soft hover:opacity-95 transition-ui self-start">
            <UserPlus className="h-4 w-4" /> Adicionar funcionária
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{ label: 'Funcionárias', value: metrics.length, icon: Users }, { label: 'Faturamento total', value: moneyBR(totalRevenue), icon: DollarSign }, { label: 'Agendamentos', value: totalAppts, icon: CalendarDays }].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="card p-5">
                <div className="inline-flex p-2.5 rounded-2xl bg-wine-700/8 text-wine-700 mb-3"><Icon className="h-5 w-5" /></div>
                <p className="text-caption font-bold text-n-600 uppercase tracking-wider">{k.label}</p>
                <p className="text-h2 font-semibold text-ink mt-1">{k.value}</p>
              </div>
            );
          })}
        </div>

        <div>
          <h2 className="text-label font-semibold text-ink tracking-tight mb-3">Funcionárias do grupo</h2>
          {metrics.length === 0 ? (
            <div className="card p-10 text-center">
              <Users className="h-8 w-8 text-wine-200 mx-auto" />
              <p className="text-label text-n-600 mt-3">Nenhuma funcionária ainda.</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-caption font-bold text-wine-700 hover:underline">Adicionar a primeira &rarr;</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((m) => (
                <div key={m.id} className="card p-5 flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl surface-wine text-white flex items-center justify-center font-semibold">{m.brandName.substring(0, 2).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink truncate">{m.brandName}</p>
                      <p className="text-caption text-n-600 truncate">{m.name}</p>
                    </div>
                    <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{m.status === 'active' ? 'Ativa' : 'Pausada'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div><p className="text-label font-semibold text-wine-700">{m.total}</p><p className="text-caption text-n-600 uppercase font-bold">Agend.</p></div>
                    <div><p className="text-label font-semibold text-wine-700">{m.clients}</p><p className="text-caption text-n-600 uppercase font-bold">Clientes</p></div>
                    <div><p className="text-label font-semibold text-wine-700">{moneyBR(m.revenueCents).replace('R$', '').trim()}</p><p className="text-caption text-n-600 uppercase font-bold">Fatur.</p></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => openPanel(m.id)} disabled={openingId === m.id} className="flex-1 inline-flex items-center justify-center gap-2 py-3 surface-wine text-white text-caption font-bold rounded-2xl shadow-soft hover:opacity-95 transition-ui disabled:opacity-60">
                      {openingId === m.id ? 'Abrindo...' : <>Abrir painel <ArrowRight className="h-4 w-4" /></>}
                    </button>
                    <button onClick={() => toggleStatus(m)} title={m.status === 'active' ? 'Pausar conta' : 'Ativar conta'} className={`px-3 rounded-2xl border transition-ui ${m.status === 'active' ? 'border-warning-border text-warning hover:bg-warning-bg' : 'border-success-border text-success hover:bg-success-bg'}`}>
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal adicionar funcionária */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative card w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h2 font-semibold text-ink tracking-tight">Nova funcionária</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>

            {createdPass ? (
              <div className="space-y-3 text-center py-2">
                <div className="h-12 w-12 rounded-2xl bg-success-bg text-success flex items-center justify-center mx-auto"><UserPlus className="h-6 w-6" /></div>
                <p className="text-label font-bold text-ink">Conta criada com sucesso!</p>
                <p className="text-caption text-n-600">Repasse o acesso para a funcionária:</p>
                <div className="bg-n-25 rounded-2xl p-3 text-left text-caption">
                  <p className="text-n-600">E-mail: <strong className="text-ink">{fEmail || 'definido'}</strong></p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-n-600">Senha temporária: <strong className="text-ink font-mono">{createdPass}</strong></span>
                    <button onClick={() => { navigator.clipboard?.writeText(createdPass); info('Copiado', 'Senha na área de transferência.'); }} className="p-1.5 rounded-lg text-wine-700 hover:bg-wine-700/8"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <button onClick={() => { setShowAdd(false); setCreatedPass(null); }} className="w-full py-3 surface-wine text-white text-label font-bold rounded-2xl hover:opacity-95">Concluir</button>
              </div>
            ) : (
              <form onSubmit={addFuncionaria} className="space-y-3">
                <input required value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nome completo" className="w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                <input required value={fBrand} onChange={(e) => setFBrand(e.target.value)} placeholder="Nome da marca / espaço" className="w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                <input required type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="E-mail de login" className="w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                <input required inputMode="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="WhatsApp (com DDD)" className="w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                <p className="text-caption text-n-600">Uma senha temporária será gerada para a funcionária acessar.</p>
                <button type="submit" disabled={saving} className="w-full py-4 surface-wine text-white text-label font-bold rounded-2xl shadow-soft hover:opacity-95 transition-ui disabled:opacity-60">{saving ? 'Criando...' : 'Criar conta da funcionária'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default SalonPanel;
