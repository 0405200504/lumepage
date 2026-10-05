'use client';

/**
 * Criativos nos moldes vencedores da Biblioteca de Anúncios (anúncios que
 * estão há meses no ar no nicho). Cada molde é um template: troca a foto real
 * dela e a copy da oferta aprovada, mantém layout, cores e formato.
 *
 * As fotos entram como estão (sem filtro e sem retoque). Nenhuma imagem é
 * gerada por IA aqui.
 */

import React, { useRef, useState } from 'react';
import { Playfair_Display, Great_Vibes, Montserrat } from 'next/font/google';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { precoDoAnuncio } from '@/lib/mais-clientes/regras';
import type { GrowthAsset, OfertaPlano } from '@/types/mais-clientes';

const serifa = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--cr-serifa' });
const script = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--cr-script' });
const sans = Montserrat({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--cr-sans' });
const FONTES = `${serifa.variable} ${script.variable} ${sans.variable}`;
const F = { serifa: 'var(--cr-serifa), serif', script: 'var(--cr-script), cursive', sans: 'var(--cr-sans), sans-serif' };

export interface DadosCriativo {
  oferta: OfertaPlano;
  cidade: string;
  uf: string;
  instagram: string;
  fotos: { ela?: string; atendendo?: string; espaco?: string; antes?: string; depois?: string; resultado?: string };
}

type Molde = {
  id: string;
  nome: string;
  origem: string;
  w: number;
  h: number;
  /** Fotos de que o molde precisa para ser fiel. */
  precisa: (keyof DadosCriativo['fotos'])[][];
  render: (d: DadosCriativo) => React.ReactNode;
};

const capa = (url?: string): React.CSSProperties => ({ backgroundImage: url ? `url(${url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' });

export const MOLDES: Molde[] = [
  {
    id: 'antes-depois-cidade', nome: 'Antes e depois + cidade', origem: '846 dias no ar · extensão de cílios', w: 1080, h: 1920,
    precisa: [['antes', 'depois']],
    render: d => (
      <div style={{ position: 'relative', width: 1080, height: 1920, background: '#16120f', fontFamily: F.sans, color: '#fff', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: -40, ...capa(d.fotos.espaco || d.fotos.ela || d.fotos.depois), filter: 'blur(22px) brightness(.35) saturate(.6)' }} />
        <p style={{ position: 'absolute', top: 150, width: '100%', textAlign: 'center', fontFamily: F.serifa, fontWeight: 600, fontSize: d.cidade.length > 10 ? 140 : 170, letterSpacing: '.01em' }}>{d.cidade.toUpperCase()}</p>
        <p style={{ position: 'absolute', top: 390, width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 52, letterSpacing: '.12em', lineHeight: 1.25, padding: '0 60px' }}>{d.oferta.servico.toUpperCase()}</p>
        {(['antes', 'depois'] as const).map((k, i) => (
          <React.Fragment key={k}>
            <div style={{ position: 'absolute', [i ? 'right' : 'left']: 60, top: i ? 1210 : 640, width: 800, height: 440, borderRadius: 56, border: '4px solid rgba(255,255,255,.85)', boxShadow: '0 30px 70px rgba(0,0,0,.45)', ...capa(d.fotos[k]) }} />
            <p style={{ position: 'absolute', [i ? 'right' : 'left']: 80, top: i ? 1675 : 1105, fontWeight: 800, fontSize: 58, letterSpacing: '.08em', textShadow: '0 4px 18px rgba(0,0,0,.6)' }}>{k.toUpperCase()}</p>
          </React.Fragment>
        ))}
        {d.instagram && <p style={{ position: 'absolute', bottom: 70, width: '100%', textAlign: 'center', fontWeight: 600, fontSize: 34, color: 'rgba(255,255,255,.85)' }}>{d.instagram}</p>}
      </div>
    ),
  },
  {
    id: 'dourado-preco', nome: 'Preto e dourado com selo de preço', origem: '9 versões em 100 dias · design de sobrancelha', w: 1080, h: 1350,
    precisa: [['atendendo'], ['ela'], ['resultado']],
    render: d => {
      // Nome de uma palavra só ("Nanofios"): a linha de cima vira a cidade, sem repetir o serviço.
      const palavras = d.oferta.servico.split(' ');
      const primeira = palavras.length > 1 ? palavras[0] : d.cidade;
      const resto = palavras.length > 1 ? palavras.slice(1) : palavras;
      return (
        <div style={{ position: 'relative', width: 1080, height: 1350, background: '#0d0b09', fontFamily: F.sans, color: '#f3e7d3', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 820, height: 1080, ...capa(d.fotos.atendendo || d.fotos.resultado || d.fotos.ela) }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(13,11,9,0) 30%,rgba(13,11,9,.85) 62%,#0d0b09 78%),linear-gradient(180deg,rgba(13,11,9,0) 58%,#0d0b09 80%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 78% 46%,rgba(214,169,94,.28),transparent 32%)' }} />
          <p style={{ position: 'absolute', right: 70, top: 64, fontFamily: F.serifa, fontWeight: 500, fontSize: 44, letterSpacing: '.2em' }}>{primeira.toUpperCase()}</p>
          <p style={{ position: 'absolute', right: 50, top: 120, fontFamily: F.script, fontSize: resto.join(' ').length > 12 ? 104 : 140, color: '#d6a95e', lineHeight: 1, textAlign: 'right', maxWidth: 560 }}>{resto.join(' ')}</p>
          <p style={{ position: 'absolute', right: 70, top: 300, width: 430, textAlign: 'right', fontWeight: 600, fontSize: 22, letterSpacing: '.12em', lineHeight: 1.5 }}>{d.oferta.titulo.toUpperCase()}</p>
          <div style={{ position: 'absolute', right: 70, top: 450, width: 330, height: 330, borderRadius: '50%', background: 'radial-gradient(circle,#1b1611,#0d0b09 70%)', border: '4px solid #d6a95e', boxShadow: '0 0 60px rgba(214,169,94,.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <span style={{ fontWeight: 700, fontSize: 23, letterSpacing: '.12em', color: '#f3e7d3' }}>{d.oferta.preco_oferta_cents != null ? 'POR APENAS' : 'A PARTIR DE'}</span>
            <span style={{ fontWeight: 800, fontSize: 84, lineHeight: 1.05, marginTop: 6 }}>{precoDoAnuncio(d.oferta)}</span>
            <span style={{ color: '#d6a95e', fontSize: 26, marginTop: 4 }}>♡</span>
          </div>
          <div style={{ position: 'absolute', left: 60, right: 60, top: 1035, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
            {['ATENDIMENTO\nPERSONALIZADO', 'RESULTADO\nREAL', 'HORÁRIO\nMARCADO', 'AGENDE PELO\nWHATSAPP'].map((t, i) => (
              <p key={t} style={{ textAlign: 'center', borderLeft: i ? '1px solid rgba(214,169,94,.45)' : 'none', fontWeight: 600, fontSize: 18, letterSpacing: '.08em', lineHeight: 1.35, whiteSpace: 'pre-line', color: '#f3e7d3' }}>{t}</p>
            ))}
          </div>
          <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 1170, border: '2px solid #d6a95e', borderRadius: 999, padding: '12px 34px', fontWeight: 700, fontSize: 26, letterSpacing: '.1em', whiteSpace: 'nowrap' }}>📍 {d.cidade.toUpperCase()}{d.uf ? ` - ${d.uf.toUpperCase()}` : ''}</p>
          <p style={{ position: 'absolute', width: '100%', top: 1250, textAlign: 'center', fontFamily: F.script, fontSize: 56 }}>Agende seu horário ♡</p>
        </div>
      );
    },
  },
  {
    id: 'faixa', nome: 'Close + faixa com a oferta', origem: 'relançado 2x · extensão de cílios', w: 1080, h: 1080,
    precisa: [['resultado'], ['depois']],
    render: d => (
      <div style={{ position: 'relative', width: 1080, height: 1080, fontFamily: F.sans, color: '#fff', background: '#151515' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 760, ...capa(d.fotos.resultado || d.fotos.depois) }} />
        <div style={{ position: 'absolute', left: 0, top: 760, width: 1080, height: 220, background: '#c2168d', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 70px', fontWeight: 700, fontSize: d.oferta.titulo.length > 48 ? 40 : 48, lineHeight: 1.2 }}>{d.oferta.titulo.toUpperCase()}</div>
        <div style={{ position: 'absolute', left: 0, top: 980, width: 1080, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 70px', fontWeight: 700, fontSize: 28, letterSpacing: '.06em' }}>
          <span>REFERÊNCIA EM {d.cidade.toUpperCase()}</span><span>{precoDoAnuncio(d.oferta)}</span>
        </div>
      </div>
    ),
  },
  {
    id: 'circulos', nome: 'Dois círculos + preço', origem: '465 dias no ar · cílios + sobrancelha', w: 1080, h: 1350,
    precisa: [['resultado', 'depois'], ['resultado', 'ela'], ['depois', 'ela']],
    render: d => {
      const [a, b] = [d.fotos.resultado || d.fotos.depois, d.fotos.depois && d.fotos.resultado ? d.fotos.depois : d.fotos.ela];
      return (
        <div style={{ position: 'relative', width: 1080, height: 1350, fontFamily: F.sans, color: '#3a3433', background: 'radial-gradient(circle at 30% 20%,#fbf1ee,#f3e2dd 70%)' }}>
          <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, background: '#e9c7b8', padding: '26px 60px 22px', fontWeight: 800, fontSize: d.oferta.servico.length > 16 ? 60 : 80, whiteSpace: 'nowrap' }}>{d.oferta.servico.toUpperCase()}</p>
          <div style={{ position: 'absolute', left: 40, top: 290, width: 560, height: 560, borderRadius: '50%', border: '10px solid #c79a83', ...capa(a) }} />
          <div style={{ position: 'absolute', right: 40, top: 200, width: 520, height: 520, borderRadius: '50%', border: '10px solid #c79a83', ...capa(b) }} />
          <p style={{ position: 'absolute', top: 990, width: '100%', textAlign: 'center', fontWeight: 500, fontSize: 50, lineHeight: 1.25, padding: '0 80px' }}>{d.oferta.detalhe}</p>
          <p style={{ position: 'absolute', top: 1160, width: '100%', textAlign: 'center', fontWeight: 800, fontSize: 104 }}>{precoDoAnuncio(d.oferta)}</p>
        </div>
      );
    },
  },
];

/** Os moldes que dá para montar com as fotos que ela mandou para esse serviço. */
export function moldesPossiveis(d: DadosCriativo): Molde[] {
  return MOLDES.filter(m => m.precisa.some(conj => conj.every(k => !!d.fotos[k])));
}

export function fotosDoServico(assets: GrowthAsset[], serviceId: string): DadosCriativo['fotos'] {
  const url = (slot: GrowthAsset['slot'], sid: string | null) => assets.find(a => a.slot === slot && a.service_id === sid)?.url;
  return {
    ela: url('ela', null), atendendo: url('atendendo', null), espaco: url('espaco', null),
    antes: url('antes', serviceId), depois: url('depois', serviceId), resultado: url('resultado', serviceId),
  };
}

export function Criativo({ molde, dados, largura = 260 }: { molde: Molde; dados: DadosCriativo; largura?: number }) {
  const { error } = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [baixando, setBaixando] = useState(false);
  const escala = largura / molde.w;

  const baixar = async () => {
    if (!ref.current) return;
    setBaixando(true);
    try {
      const png = await toPng(ref.current, { width: molde.w, height: molde.h, pixelRatio: 1, cacheBust: true, style: { transform: 'none' } });
      const a = document.createElement('a');
      a.href = png;
      a.download = `${dados.oferta.servico} - ${molde.nome}.png`.replace(/[\\/:*?"<>|]+/g, ' ');
      a.click();
    } catch {
      error('Não deu', 'Não consegui gerar o arquivo agora. Tente de novo.');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <figure className="flex flex-col gap-2">
      <div className="rounded-chip overflow-hidden shadow-[var(--shadow-sm)] bg-n-100" style={{ width: largura, height: molde.h * escala }}>
        <div ref={ref} className={FONTES} style={{ width: molde.w, height: molde.h, transform: `scale(${escala})`, transformOrigin: 'top left' }}>
          {molde.render(dados)}
        </div>
      </div>
      <figcaption className="text-caption text-n-600" style={{ width: largura }}>
        <span className="font-semibold text-heading">{molde.nome}</span><br />Molde: {molde.origem} · {molde.w}x{molde.h}
      </figcaption>
      <Button size="sm" variant="secondary" onClick={baixar} loading={baixando} leadingIcon={<Download className="h-4 w-4" />}>Baixar</Button>
    </figure>
  );
}
