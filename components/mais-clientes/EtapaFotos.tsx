'use client';

import React, { useRef, useState, useTransition } from 'react';
import { Camera, CheckCircle2, Circle, ImagePlus, Loader2, Trash2, TriangleAlert, Video, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase/client';
import { enviarFotoAction, removerFotoAction, prepararVideoAction, registrarVideoAction } from '@/app/actions/mais-clientes';
import { SLOTS, slotInfo, fotosMinimasOk } from '@/lib/mais-clientes/regras';
import type { AssetSlot, GrowthAsset } from '@/types/mais-clientes';
import type { PropsEtapa } from './Jornada';
import { prepararFoto } from './imagem';

function SlotFoto({ professionalId, slot, serviceId, asset, onAsset, onRemover }: {
  professionalId: string;
  slot: AssetSlot;
  serviceId: string | null;
  asset?: GrowthAsset;
  onAsset: (a: GrowthAsset) => void;
  onRemover: (id: string) => void;
}) {
  const info = slotInfo(slot);
  const { error } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [autorizado, setAutorizado] = useState(!!asset?.consentimento);
  const [enviando, setEnviando] = useState(false);
  const [removendo, startRemover] = useTransition();

  const escolher = async (file?: File) => {
    if (!file) return;
    setEnviando(true);
    try {
      const { blob, width, height, brilho } = await prepararFoto(file);
      const fd = new FormData();
      fd.append('arquivo', new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
      fd.append('slot', slot);
      if (serviceId) fd.append('service_id', serviceId);
      fd.append('consentimento', String(autorizado));
      fd.append('width', String(width)); fd.append('height', String(height)); fd.append('brilho', String(Math.round(brilho)));
      const res = await enviarFotoAction(professionalId, fd);
      if (!res.success) error('Não deu', res.error); else onAsset(res.asset);
    } catch (e) {
      error('Não deu', e instanceof Error ? e.message : 'Tente outra foto.');
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = '';
    }
  };

  const bloqueado = info.exigeAutorizacao && !autorizado;
  return (
    <div data-slot={slot} data-servico={serviceId ?? undefined} className="rounded-card ring-1 ring-inset ring-line p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-sm font-semibold text-heading">{info.titulo}</p>
        {asset && (asset.qualidade.ok
          ? <span className="text-caption text-success flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Boa</span>
          : <span className="text-caption text-warning flex items-center gap-1"><TriangleAlert className="h-3.5 w-3.5" /> Atenção</span>)}
      </div>
      {asset?.url ? (
        <div className="relative aspect-[4/5] rounded-chip overflow-hidden bg-n-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.url} alt={info.titulo} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : (
        <button type="button" disabled={bloqueado || enviando} onClick={() => input.current?.click()}
          className="aspect-[4/5] rounded-chip border-2 border-dashed border-line-strong grid place-items-center text-center px-4 text-n-500 hover:bg-n-50 disabled:opacity-60 disabled:hover:bg-transparent transition-ui">
          <span className="flex flex-col items-center gap-2">
            {enviando ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-caption font-semibold">{enviando ? 'Enviando…' : bloqueado ? 'Confirme a autorização abaixo' : 'Escolher foto'}</span>
          </span>
        </button>
      )}
      <p className="text-caption text-n-500 leading-snug">{info.dica}</p>
      {asset && !asset.qualidade.ok && asset.qualidade.avisos.map(a => <p key={a} className="text-caption text-warning leading-snug">{a}</p>)}
      {info.exigeAutorizacao && !asset && (
        <label className="flex items-start gap-2 text-caption text-n-700">
          <input type="checkbox" className="mt-0.5 accent-[var(--color-wine-700)]" checked={autorizado} onChange={e => setAutorizado(e.target.checked)} />
          A cliente que aparece autorizou o uso da imagem em anúncios.
        </label>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => escolher(e.target.files?.[0])} />
      {asset && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => input.current?.click()} loading={enviando} leadingIcon={<Camera className="h-4 w-4" />}>Trocar</Button>
          <Button size="sm" variant="ghost" loading={removendo} onClick={() => startRemover(async () => {
            const r = await removerFotoAction(professionalId, asset.id);
            if (r.success) onRemover(asset.id); else error('Não deu', r.error);
          })} leadingIcon={<Trash2 className="h-4 w-4" />}>Remover</Button>
        </div>
      )}
    </div>
  );
}

export function EtapaFotos({ professionalId, programa, setPrograma, negocio, avancar }: PropsEtapa) {
  const { success, error } = useToast();
  const assets = programa.assets;
  const foco = (programa.intake.servicos_foco ?? []).map(id => negocio.servicos.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  const achar = (slot: AssetSlot, serviceId: string | null) => assets.find(a => a.slot === slot && a.service_id === serviceId);
  const onAsset = (novo: GrowthAsset) => setPrograma(p => ({
    ...p,
    assets: [...p.assets.filter(a => !(a.slot === novo.slot && a.service_id === novo.service_id && a.slot !== 'video')), novo],
  }));
  const onRemover = (id: string) => setPrograma(p => ({ ...p, assets: p.assets.filter(a => a.id !== id) }));
  const minimo = fotosMinimasOk(assets, programa.intake);
  const prioritario = negocio.servicos.find(s => s.id === (programa.intake.servico_prioritario ?? foco[0]?.id));

  // Vídeo: vai direto do celular ao Storage pelo link assinado.
  const inputVideo = useRef<HTMLInputElement>(null);
  const [videoAutorizado, setVideoAutorizado] = useState(false);
  const [enviandoVideo, setEnviandoVideo] = useState(false);
  const enviarVideo = async (file?: File) => {
    if (!file) return;
    setEnviandoVideo(true);
    try {
      const prep = await prepararVideoAction(professionalId, { mime: file.type, tamanho: file.size, consentimento: videoAutorizado });
      if (!prep.success) { error('Não deu', prep.error); return; }
      const { error: e } = await supabase.storage.from('lume-growth').uploadToSignedUrl(prep.caminho, prep.token, file, { contentType: file.type });
      if (e) { error('Não deu', 'O envio do vídeo falhou. Tente de novo.'); return; }
      const reg = await registrarVideoAction(professionalId, { caminho: prep.caminho, mime: file.type });
      if (!reg.success) { error('Não deu', reg.error); return; }
      onAsset(reg.asset);
      success('Vídeo enviado', 'Obrigada! Vídeo é o formato que mais roda nos anúncios.');
    } finally {
      setEnviandoVideo(false);
      if (inputVideo.current) inputVideo.current.value = '';
    }
  };
  const videos = assets.filter(a => a.slot === 'video');

  if (!foco.length) {
    return <div className="card p-6 text-body-sm text-n-600">Escolha os serviços na etapa &quot;Seu negócio&quot; primeiro: as fotos de resultado são pedidas por serviço.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6 flex flex-wrap items-start gap-4">
        <span className="grid place-items-center h-10 w-10 rounded-full bg-wine-50 text-wine-700 shrink-0"><ShieldCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-h3 text-heading">Foto real vende mais que arte bonita</h2>
          <p className="mt-1 text-body-sm text-n-600 max-w-3xl">
            Os anúncios que ficam meses no ar mostram resultado de verdade. Por isso a gente só usa as suas fotos, sem filtro e sem retoque,
            e nunca cria resultado com inteligência artificial. Foto com cliente só com a autorização dela.
          </p>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-h3 text-heading">Você e o seu espaço</h2>
        <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-3">
          {(['ela', 'atendendo', 'espaco'] as AssetSlot[]).map(s => (
            <SlotFoto key={s} professionalId={professionalId} slot={s} serviceId={null} asset={achar(s, null)} onAsset={onAsset} onRemover={onRemover} />
          ))}
        </div>
      </section>

      {foco.map(s => (
        <section key={s.id} className="card p-5 sm:p-6">
          <h2 className="text-h3 text-heading">{s.name}</h2>
          <p className="mt-1 text-body-sm text-n-600">Antes e depois da mesma cliente, mesmo ângulo e mesma luz. Se não tiver o antes, mande só o close do resultado.</p>
          <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-3">
            {(['antes', 'depois', 'resultado'] as AssetSlot[]).map(slot => (
              <SlotFoto key={slot} professionalId={professionalId} slot={slot} serviceId={s.id} asset={achar(slot, s.id)} onAsset={onAsset} onRemover={onRemover} />
            ))}
          </div>
        </section>
      ))}

      <section className="card p-5 sm:p-6">
        <h2 className="text-h3 text-heading flex items-center gap-2"><Video className="h-5 w-5 text-wine-700" /> {SLOTS.find(x => x.slot === 'video')!.titulo}</h2>
        <p className="mt-1 text-body-sm text-n-600">{SLOTS.find(x => x.slot === 'video')!.dica}</p>
        {videos.length > 0 && <p className="mt-3 text-body-sm text-success flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {videos.length} vídeo(s) enviado(s)</p>}
        <label className="mt-3 flex items-start gap-2 text-caption text-n-700">
          <input type="checkbox" className="mt-0.5 accent-[var(--color-wine-700)]" checked={videoAutorizado} onChange={e => setVideoAutorizado(e.target.checked)} />
          A cliente que aparece autorizou o uso da imagem em anúncios.
        </label>
        <div className="mt-3">
          <Button variant="secondary" disabled={!videoAutorizado} loading={enviandoVideo} onClick={() => inputVideo.current?.click()} leadingIcon={<Video className="h-4 w-4" />}>Enviar vídeo</Button>
          <input ref={inputVideo} type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={e => enviarVideo(e.target.files?.[0])} />
        </div>
      </section>

      <section className="card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <ul className="space-y-1.5 text-body-sm">
          {[
            ['Uma foto sua', assets.some(a => a.slot === 'ela')],
            ['Você atendendo ou o seu espaço', assets.some(a => a.slot === 'atendendo' || a.slot === 'espaco')],
            [`Um resultado de ${prioritario?.name ?? 'seu serviço principal'}`, minimo || assets.some(a => (a.slot === 'resultado' || a.slot === 'depois') && a.service_id === prioritario?.id)],
          ].map(([t, ok]) => (
            <li key={t as string} className={`flex items-center gap-2 ${ok ? 'text-heading' : 'text-n-500'}`}>
              {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />} {t as string}
            </li>
          ))}
        </ul>
        <Button disabled={!minimo} onClick={avancar}>{minimo ? 'Continuar' : 'Faltam fotos para seguir'}</Button>
      </section>
    </div>
  );
}

export default EtapaFotos;
