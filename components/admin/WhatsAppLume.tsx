'use client';

import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { MessageCircle, RefreshCw, Unplug } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { whatsappLumeAction } from '@/app/actions/mais-clientes';
import { button } from './ui';

/** O QR do servidor expira: renova antes. */
const RENOVAR_QR_MS = 20_000;
const CONFERIR_MS = 4_000;

/** Aceita o QR como data URL, base64 de imagem ou o texto cru (vira imagem aqui). */
async function imagemDoQr(qr: string): Promise<string> {
  if (qr.startsWith('data:image')) return qr;
  if (/^(iVBORw0KG|\/9j\/)/.test(qr)) return `data:image/png;base64,${qr}`;
  return QRCode.toDataURL(qr, { width: 260, margin: 1 });
}

/**
 * Número de WhatsApp da Lume (conta interna das calls): é por ele que saem a
 * confirmação e o lembrete das calls de venda. Conecta por QR Code aqui mesmo.
 */
export function WhatsAppLume() {
  const { success, error } = useToast();
  const [status, setStatus] = useState<'carregando' | 'open' | 'desligado' | 'qr'>('carregando');
  const [qr, setQr] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const conferir = useCallback(async () => {
    const r = await whatsappLumeAction('status').catch(() => null);
    if (!r?.success) return null;
    return r.status;
  }, []);

  const pedirQr = useCallback(async () => {
    setOcupado(true);
    try {
      const r = await whatsappLumeAction('conectar');
      if (!r.success) { error('Não deu', r.error); setStatus('desligado'); return; }
      if (r.status === 'open') { setStatus('open'); setQr(null); return; }
      setStatus('qr');
      setCodigo(r.paircode ?? null);
      setQr(r.qrcode ? await imagemDoQr(r.qrcode) : null);
    } finally {
      setOcupado(false);
    }
  }, [error]);

  // Situação ao abrir a tela.
  useEffect(() => {
    let vivo = true;
    conferir().then(s => { if (vivo) setStatus(s === 'open' ? 'open' : 'desligado'); });
    return () => { vivo = false; };
  }, [conferir]);

  // Com o QR na tela: confere se o celular já leu e renova o código antes de expirar.
  useEffect(() => {
    if (status !== 'qr') return;
    const checar = setInterval(async () => {
      if (document.hidden) return;
      if (await conferir() === 'open') {
        setStatus('open'); setQr(null); setCodigo(null);
        success('WhatsApp da Lume conectado', 'As calls passam a receber confirmação e lembrete por este número.');
      }
    }, CONFERIR_MS);
    const renovar = setInterval(() => { if (!document.hidden) void pedirQr(); }, RENOVAR_QR_MS);
    return () => { clearInterval(checar); clearInterval(renovar); };
  }, [status, conferir, pedirQr, success]);

  const desconectar = async () => {
    if (!window.confirm('Desconectar o WhatsApp da Lume? As calls ficam sem confirmação e lembrete até conectar de novo.')) return;
    setOcupado(true);
    const r = await whatsappLumeAction('desconectar').catch(() => null);
    setOcupado(false);
    if (!r?.success) { error('Não deu', r && !r.success ? r.error : 'Tente de novo.'); return; }
    setStatus('desligado');
  };

  return (
    <div className="rounded-chip bg-surface-2 p-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-md">
        <p className="text-body-sm font-semibold text-heading flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-wine-700" /> WhatsApp da Lume
          <span className={`inline-flex items-center gap-1 text-caption font-semibold ${status === 'open' ? 'text-success' : 'text-n-500'}`}>
            <span className={`h-2 w-2 rounded-full ${status === 'open' ? 'bg-success' : 'bg-n-300'}`} />
            {status === 'carregando' ? 'conferindo…' : status === 'open' ? 'conectado' : status === 'qr' ? 'esperando a leitura' : 'desconectado'}
          </span>
        </p>
        <p className="mt-1 text-caption text-n-600">
          Número que manda a confirmação na hora e o lembrete no dia da call. Para conectar: no celular da Lume, abra o WhatsApp →
          Configurações → Aparelhos conectados → Conectar um aparelho, e aponte para o QR Code.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {status === 'open' ? (
            <button type="button" disabled={ocupado} className={button('secondary', 'sm')} onClick={desconectar}>
              <Unplug className="h-3.5 w-3.5" /> Trocar número
            </button>
          ) : status === 'qr' ? (
            <button type="button" disabled={ocupado} className={button('ghost', 'sm')} onClick={() => void pedirQr()}>
              <RefreshCw className="h-3.5 w-3.5" /> Gerar outro QR Code
            </button>
          ) : (
            <button type="button" disabled={ocupado || status === 'carregando'} className={button('primary', 'sm')} onClick={() => void pedirQr()}>
              <MessageCircle className="h-3.5 w-3.5" /> {ocupado ? 'Preparando…' : 'Conectar por QR Code'}
            </button>
          )}
        </div>
      </div>
      {status === 'qr' && (qr || codigo) && (
        <div className="rounded-chip bg-white p-3 shadow-[var(--shadow-sm)] text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt="QR Code para conectar o WhatsApp da Lume" className="h-52 w-52" />}
          {codigo && <p className="mt-2 font-mono text-body font-semibold tracking-widest text-heading">{codigo}</p>}
        </div>
      )}
    </div>
  );
}

export default WhatsAppLume;
