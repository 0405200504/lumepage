'use client';

/**
 * ============================================================================
 * Os dados ESSENCIAIS da página, em uma tela só
 * ============================================================================
 * É o mesmo formulário no último passo da criação e no botão "Meus dados" da
 * tela inicial: foto, nome, marca, profissão, WhatsApp, Instagram, cidade,
 * endereço e horário. Tudo opcional, tudo já pré-preenchido com a conta.
 *
 * Nenhum campo de "texto da página" mora aqui de propósito: a profissional
 * que não quer editar nada não deveria nem ver que existe headline.
 */

import React, { useRef, useState } from 'react';
import { Camera, Loader2, Upload } from 'lucide-react';
import { uploadSiteImage } from './uploadImage';
import { LIMITS } from '@/lib/site/config';

export interface EssentialsValue {
  photoUrl: string;
  professionalName: string;
  studioName: string;
  role: string;
  whatsapp: string;
  instagram: string;
  city: string;
  address: string;
  hours: string;
}

const inputCls =
  'w-full h-11 px-3.5 text-[14px] bg-white border border-n-200 rounded-xl outline-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-colors placeholder:text-n-300';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-n-700 block mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-n-400 block mt-1">{hint}</span>}
    </label>
  );
}

export function EssentialsForm({
  value, onChange, professionalId, roleSuggestions = [], onError, compact,
}: {
  value: EssentialsValue;
  onChange: (next: EssentialsValue) => void;
  professionalId: string;
  /** Profissões sugeridas pelo nicho — um toque e pronto. */
  roleSuggestions?: string[];
  onError: (msg: string) => void;
  /** Esconde endereço/horário (passo de criação: só o indispensável). */
  compact?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const patch = (p: Partial<EssentialsValue>) => onChange({ ...value, ...p });

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const res = await uploadSiteImage(professionalId, file, 'retrato');
    setUploading(false);
    if (res.ok && res.url) patch({ photoUrl: res.url });
    else onError(res.error || 'Não foi possível enviar a foto.');
  };

  return (
    <div className="space-y-5">
      {/* Foto: círculo grande, um toque abre a galeria do celular */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label={value.photoUrl ? 'Trocar foto' : 'Enviar foto'}
          className="relative h-24 w-24 shrink-0 rounded-full overflow-hidden border-2 border-dashed border-n-300 bg-n-50 grid place-items-center hover:border-wine-700 transition-colors cursor-pointer disabled:opacity-60"
        >
          {value.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-7 w-7 text-n-400" />
          )}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
            </span>
          )}
        </button>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-heading">Sua foto</p>
          <p className="text-[11.5px] text-n-500 leading-relaxed mt-0.5">
            Pode ser do seu rosto ou do seu espaço. A gente ajusta o tamanho sozinho.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-wine-700 hover:underline cursor-pointer disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" /> {value.photoUrl ? 'Trocar foto' : 'Escolher foto'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="Seu nome">
          <input className={inputCls} value={value.professionalName} maxLength={LIMITS.name}
            placeholder="Marina Alves" onChange={e => patch({ professionalName: e.target.value })} />
        </Field>
        <Field label="Nome do estúdio ou marca" hint="Se não tiver, repita o seu nome.">
          <input className={inputCls} value={value.studioName} maxLength={LIMITS.name}
            placeholder="Marina Alves Studio" onChange={e => patch({ studioName: e.target.value })} />
        </Field>
      </div>

      <Field label="Sua profissão" hint="Aparece embaixo do nome.">
        {roleSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {roleSuggestions.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => patch({ role: r })}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors cursor-pointer ${
                  value.role === r
                    ? 'bg-wine-700 text-white border-wine-700'
                    : 'bg-white text-n-700 border-n-200 hover:border-wine-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        <input className={inputCls} value={value.role} maxLength={LIMITS.short}
          placeholder="Nail Designer" onChange={e => patch({ role: e.target.value })} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="WhatsApp" hint="Com DDD. Ex.: 11 99999-0000">
          <input className={inputCls} value={value.whatsapp} type="tel" inputMode="numeric" maxLength={20}
            placeholder="11999990000" onChange={e => patch({ whatsapp: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <Field label="Instagram" hint="Só o nome, sem o @.">
          <input className={inputCls} value={value.instagram} maxLength={40}
            placeholder="marinaalvesstudio"
            onChange={e => patch({ instagram: e.target.value.replace(/^@/, '').replace(/\s/g, '') })} />
        </Field>
      </div>

      <Field label="Cidade ou bairro">
        <input className={inputCls} value={value.city} maxLength={LIMITS.short}
          placeholder="Moema, São Paulo" onChange={e => patch({ city: e.target.value })} />
      </Field>

      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Endereço (opcional)" hint="Faz o botão “Como chegar” aparecer.">
            <input className={inputCls} value={value.address} maxLength={LIMITS.short}
              placeholder="Av. Ibirapuera, 1200 — Sala 42" onChange={e => patch({ address: e.target.value })} />
          </Field>
          <Field label="Horário de atendimento (opcional)">
            <input className={inputCls} value={value.hours} maxLength={LIMITS.short}
              placeholder="Seg a sáb, das 9h às 19h" onChange={e => patch({ hours: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  );
}

export default EssentialsForm;
