'use client';

/**
 * ============================================================================
 * Painéis do editor de "Minha Página"
 * ============================================================================
 * Cada painel edita um pedaço do SiteConfig. Nenhum deles conhece template:
 * a profissional escreve "sobre mim" uma vez e os 6 modelos sabem desenhar.
 */

import React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight, Clock, GripVertical, ChevronUp, ChevronDown, Sparkles, Info,
} from 'lucide-react';
import type { SiteConfig, SiteSectionId } from '@/types/site';
import { SITE_SECTION_LABEL, SITE_REQUIRED_SECTIONS } from '@/types/site';
import type { PublicService } from '../types';
import { LIMITS } from '@/lib/site/config';
import { getTemplateMeta } from '@/lib/site/templates';
import { formatPrice, formatDuration } from '../shared';
import {
  FieldGroup, Row, TextField, TextArea, ColorField, Toggle, ImageField,
  Repeater, newItemId,
} from './fields';

export interface PanelProps {
  config: SiteConfig;
  set: (mutate: (draft: SiteConfig) => void) => void;
  professionalId: string;
  onError: (msg: string) => void;
}

// ============================================================================
// Identidade
// ============================================================================

export function IdentityPanel({ config, set, professionalId, onError }: PanelProps) {
  const i = config.identity;
  return (
    <div className="space-y-7">
      <FieldGroup
        title="Quem aparece na página"
        hint="Já preenchemos com os dados da sua conta Lume. Ajuste o que quiser — isto vale só para a página."
      >
        <Row>
          <TextField label="Seu nome" value={i.professionalName} max={LIMITS.name}
            onChange={v => set(d => { d.identity.professionalName = v; })} placeholder="Marina Alves" />
          <TextField label="Nome do estúdio / marca" value={i.studioName} max={LIMITS.name}
            onChange={v => set(d => { d.identity.studioName = v; })} placeholder="Marina Alves Nails" />
        </Row>
        <TextField label="Sua profissão" value={i.role} max={LIMITS.short}
          onChange={v => set(d => { d.identity.role = v; })}
          placeholder="Nail Designer" hint="Aparece no topo, ao lado da cidade." />
      </FieldGroup>

      <FieldGroup title="Imagens" hint="Otimizamos automaticamente antes de enviar — pode mandar a foto direto da galeria.">
        <ImageField label="Logo (opcional)" value={i.logoUrl} kind="logo" aspect="wide"
          professionalId={professionalId} onError={onError}
          onChange={url => set(d => { d.identity.logoUrl = url; })}
          hint="Sem logo, mostramos o nome do estúdio escrito." />
        <ImageField label="Sua foto" value={i.photoUrl} kind="retrato" aspect="portrait"
          professionalId={professionalId} onError={onError}
          onChange={url => set(d => { d.identity.photoUrl = url; })}
          hint="Usada na capa e no 'sobre mim' quando você não escolher outra." />
      </FieldGroup>

      <FieldGroup title="Contato e redes" hint="O WhatsApp aqui é só para a cliente falar com você — o agendamento continua pelo botão Agendar.">
        <Row>
          <TextField label="WhatsApp" value={i.whatsapp} max={20} type="tel"
            onChange={v => set(d => { d.identity.whatsapp = v.replace(/\D/g, ''); })}
            placeholder="5511999990000" hint="Com DDI e DDD, só números." />
          <TextField label="Instagram" value={i.instagram} max={40}
            onChange={v => set(d => { d.identity.instagram = v.replace(/^@/, ''); })}
            placeholder="marinaalvesnails" hint="Sem o @." />
        </Row>
        <TextField label="E-mail (opcional)" value={i.email} max={160} type="email"
          onChange={v => set(d => { d.identity.email = v; })} placeholder="contato@estudio.com" />
      </FieldGroup>

      <FieldGroup title="Onde você atende">
        <TextField label="Endereço" value={i.address} max={LIMITS.short}
          onChange={v => set(d => { d.identity.address = v; })} placeholder="Rua das Hortênsias, 248 — Jardins" />
        <Row>
          <TextField label="Cidade" value={i.city} max={LIMITS.short}
            onChange={v => set(d => { d.identity.city = v; })} placeholder="São Paulo - SP" />
          <TextField label="Horário de atendimento" value={config.content.location.hours} max={LIMITS.short}
            onChange={v => set(d => { d.content.location.hours = v; })} placeholder="Seg a sáb, das 9h às 19h" />
        </Row>
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Cores
// ============================================================================

export function ThemePanel({ config, set }: PanelProps) {
  const t = config.theme;
  return (
    <div className="space-y-7">
      <FieldGroup
        title="Cores da sua página"
        hint="Escolha duas cores; o resto (botões, hover, fundos suaves) é derivado automaticamente. Se um texto ficaria ilegível sobre a cor escolhida, ajustamos o tom só daquele texto."
      >
        <Row>
          <ColorField label="Cor principal" value={t.primary}
            onChange={v => set(d => { d.theme.primary = v; })}
            hint="Botões e destaques." />
          <ColorField label="Cor secundária" value={t.secondary}
            onChange={v => set(d => { d.theme.secondary = v; })}
            hint="Detalhes e etiquetas." />
        </Row>
        <Row>
          <ColorField label="Fundo" value={t.background}
            onChange={v => set(d => { d.theme.background = v; })} />
          <ColorField label="Cor do texto" value={t.foreground}
            onChange={v => set(d => { d.theme.foreground = v; })} />
        </Row>
      </FieldGroup>

      <FieldGroup title="Cantos" hint="Define o arredondamento de botões, cartões e fotos.">
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'sharp', label: 'Reto', r: '2px' },
            { id: 'soft', label: 'Suave', r: '10px' },
            { id: 'round', label: 'Arredondado', r: '20px' },
          ] as const).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => set(d => { d.theme.radius = opt.id; })}
              className={`px-3 py-3 text-[11px] font-bold border transition-colors cursor-pointer ${
                t.radius === opt.id ? 'border-wine-700 bg-accent-soft text-wine-700' : 'border-n-200 bg-white text-n-500 hover:border-n-300'
              }`}
              style={{ borderRadius: opt.r }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Textos
// ============================================================================

export function ContentPanel({ config, set, professionalId, onError }: PanelProps) {
  const c = config.content;
  return (
    <div className="space-y-7">
      <FieldGroup title="Capa" hint="A primeira coisa que a cliente lê ao abrir seu link. O destaque aparece em itálico/cor de acento.">
        <TextField label="Rótulo pequeno" value={c.hero.eyebrow} max={LIMITS.eyebrow}
          onChange={v => set(d => { d.content.hero.eyebrow = v; })} placeholder="São Paulo - SP" />
        <Row>
          <TextField label="Título" value={c.hero.headline} max={LIMITS.headline}
            onChange={v => set(d => { d.content.hero.headline = v; })} placeholder="Suas mãos merecem ser" />
          <TextField label="Destaque do título" value={c.hero.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.hero.highlight = v; })} placeholder="uma obra de arte." />
        </Row>
        <TextArea label="Subtítulo" value={c.hero.subheadline} max={LIMITS.subheadline} rows={3}
          onChange={v => set(d => { d.content.hero.subheadline = v; })} />
        <Row>
          <TextField label="Botão principal" value={c.hero.ctaPrimary} max={LIMITS.cta}
            onChange={v => set(d => { d.content.hero.ctaPrimary = v; })} placeholder="Agendar meu horário" />
          <TextField label="Botão secundário" value={c.hero.ctaSecondary} max={LIMITS.cta}
            onChange={v => set(d => { d.content.hero.ctaSecondary = v; })} placeholder="Ver trabalhos" />
        </Row>
        <ImageField label="Imagem da capa" value={c.hero.imageUrl} kind="capa" aspect="portrait"
          professionalId={professionalId} onError={onError}
          onChange={url => set(d => { d.content.hero.imageUrl = url; })}
          hint="Vazio = usamos a sua foto de perfil." />
      </FieldGroup>

      <FieldGroup title="Sobre mim">
        <TextField label="Rótulo pequeno" value={c.about.eyebrow} max={LIMITS.eyebrow}
          onChange={v => set(d => { d.content.about.eyebrow = v; })} />
        <Row>
          <TextField label="Título" value={c.about.title} max={LIMITS.title}
            onChange={v => set(d => { d.content.about.title = v; })} />
          <TextField label="Destaque" value={c.about.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.about.highlight = v; })} />
        </Row>
        <TextArea label="Sua história" value={c.about.text} max={LIMITS.text} rows={7}
          onChange={v => set(d => { d.content.about.text = v; })}
          hint="Deixe uma linha em branco para separar parágrafos." />
        <Row>
          <TextField label="Botão" value={c.about.cta} max={LIMITS.cta}
            onChange={v => set(d => { d.content.about.cta = v; })} placeholder="Quero ser atendida" />
        </Row>
        <ImageField label="Foto do 'sobre mim'" value={c.about.imageUrl} kind="sobre" aspect="portrait"
          professionalId={professionalId} onError={onError}
          onChange={url => set(d => { d.content.about.imageUrl = url; })} />
      </FieldGroup>

      <FieldGroup title="Fecho / chamada para agendar" hint="O bloco final, logo antes do rodapé.">
        <TextField label="Rótulo pequeno" value={c.contact.eyebrow} max={LIMITS.eyebrow}
          onChange={v => set(d => { d.content.contact.eyebrow = v; })} />
        <Row>
          <TextField label="Título" value={c.contact.title} max={LIMITS.title}
            onChange={v => set(d => { d.content.contact.title = v; })} />
          <TextField label="Destaque" value={c.contact.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.contact.highlight = v; })} />
        </Row>
        <TextArea label="Texto" value={c.contact.text} max={LIMITS.subheadline} rows={3}
          onChange={v => set(d => { d.content.contact.text = v; })} />
        <TextField label="Botão" value={c.contact.cta} max={LIMITS.cta}
          onChange={v => set(d => { d.content.contact.cta = v; })} />
      </FieldGroup>

      <FieldGroup title="Rodapé">
        <TextField label="Aviso do rodapé" value={c.footer.note} max={LIMITS.short}
          onChange={v => set(d => { d.content.footer.note = v; })}
          hint="Vazio = mostramos o ano e o nome do seu estúdio." />
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Serviços (leitura — a fonte é o módulo Serviços da Lume)
// ============================================================================

export function ServicesPanel({ config, set, services }: PanelProps & { services: PublicService[] }) {
  const s = config.content.services;
  return (
    <div className="space-y-7">
      <div className="flex items-start gap-2.5 rounded-2xl border border-accent-soft-border bg-accent-soft px-3.5 py-3">
        <Info className="h-4 w-4 text-wine-700 shrink-0 mt-0.5" />
        <p className="text-[11px] text-n-600 leading-relaxed">
          Os serviços da página são os mesmos de <b>Serviços</b> no painel — você não cadastra nada duas vezes.
          Mudou o preço, a duração ou desativou um serviço lá? A página muda junto, na hora, sem republicar.
        </p>
      </div>

      <FieldGroup title="Textos da seção">
        <TextField label="Rótulo pequeno" value={s.eyebrow} max={LIMITS.eyebrow}
          onChange={v => set(d => { d.content.services.eyebrow = v; })} />
        <Row>
          <TextField label="Título" value={s.title} max={LIMITS.title}
            onChange={v => set(d => { d.content.services.title = v; })} />
          <TextField label="Destaque" value={s.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.services.highlight = v; })} />
        </Row>
        <TextArea label="Subtítulo" value={s.subtitle} max={LIMITS.subheadline} rows={2}
          onChange={v => set(d => { d.content.services.subtitle = v; })} />
      </FieldGroup>

      <FieldGroup title="O que mostrar">
        <Toggle label="Mostrar preços" checked={s.showPrices}
          onChange={v => set(d => { d.content.services.showPrices = v; })} />
        <Toggle label="Mostrar duração" checked={s.showDuration}
          onChange={v => set(d => { d.content.services.showDuration = v; })} />
      </FieldGroup>

      <FieldGroup
        title={`Serviços que vão aparecer (${services.length})`}
        hint="Só entram aqui os serviços ativos e marcados como visíveis para a cliente."
      >
        {services.length === 0 ? (
          <p className="text-[11px] text-n-400 bg-n-100 border border-n-200 rounded-xl px-3 py-3 leading-relaxed">
            Você ainda não tem serviços visíveis para a cliente. Enquanto não tiver, a seção de serviços
            não aparece na página.
          </p>
        ) : (
          <ul className="space-y-2">
            {services.map(sv => (
              <li key={sv.id} className="flex items-center justify-between gap-3 rounded-xl border border-n-200 bg-white px-3 py-2.5">
                <span className="text-[12px] font-semibold text-n-700 truncate">{sv.name}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-n-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatDuration(sv.durationMinutes)}
                  </span>
                  <span className="text-[12px] font-bold text-n-800">{formatPrice(sv.priceCents)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-link hover:underline"
        >
          Editar meus serviços <ArrowUpRight className="h-3 w-3" />
        </Link>
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Galeria
// ============================================================================

export function GalleryPanel({ config, set, professionalId, onError }: PanelProps) {
  const g = config.content.gallery;
  return (
    <div className="space-y-7">
      <FieldGroup title="Textos da seção">
        <TextField label="Rótulo pequeno" value={g.eyebrow} max={LIMITS.eyebrow}
          onChange={v => set(d => { d.content.gallery.eyebrow = v; })} />
        <Row>
          <TextField label="Título" value={g.title} max={LIMITS.title}
            onChange={v => set(d => { d.content.gallery.title = v; })} />
          <TextField label="Destaque" value={g.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.gallery.highlight = v; })} />
        </Row>
      </FieldGroup>

      <FieldGroup title="Seus trabalhos" hint="A ordem aqui é a ordem na página. Use as setas para reorganizar.">
        <Repeater
          items={g.items}
          max={LIMITS.maxGallery}
          addLabel="Adicionar foto"
          emptyHint="Sem fotos, a galeria não aparece na página. Adicione pelo menos 3 para o mosaico ficar bonito."
          makeNew={() => ({ id: newItemId('img'), url: '', caption: '' })}
          onChange={items => set(d => { d.content.gallery.items = items; })}
          renderItem={(item, update) => (
            <>
              <ImageField label="Foto" value={item.url} kind="galeria" aspect="square"
                professionalId={professionalId} onError={onError}
                onChange={url => update({ url })} />
              <TextField label="Legenda (opcional)" value={item.caption} max={LIMITS.caption}
                onChange={caption => update({ caption })} placeholder="Alongamento em gel — formato amêndoa" />
            </>
          )}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Antes e depois
// ============================================================================

export function BeforeAfterPanel({ config, set, professionalId, onError }: PanelProps) {
  const b = config.content.beforeAfter;
  return (
    <div className="space-y-7">
      <FieldGroup title="Textos da seção">
        <TextField label="Rótulo pequeno" value={b.eyebrow} max={LIMITS.eyebrow}
          onChange={v => set(d => { d.content.beforeAfter.eyebrow = v; })} />
        <Row>
          <TextField label="Título" value={b.title} max={LIMITS.title}
            onChange={v => set(d => { d.content.beforeAfter.title = v; })} />
          <TextField label="Destaque" value={b.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.beforeAfter.highlight = v; })} />
        </Row>
      </FieldGroup>

      <FieldGroup title="Resultados" hint="Cada resultado precisa das duas fotos para aparecer.">
        <Repeater
          items={b.items}
          max={LIMITS.maxBeforeAfter}
          addLabel="Adicionar antes e depois"
          emptyHint="Ainda sem resultados. Enquanto não houver nenhum completo, esta seção fica escondida."
          makeNew={() => ({ id: newItemId('ba'), beforeUrl: '', afterUrl: '', title: '', description: '' })}
          onChange={items => set(d => { d.content.beforeAfter.items = items; })}
          renderItem={(item, update) => (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ImageField label="Antes" value={item.beforeUrl} kind="antes-depois" aspect="portrait"
                  professionalId={professionalId} onError={onError}
                  onChange={beforeUrl => update({ beforeUrl })} />
                <ImageField label="Depois" value={item.afterUrl} kind="antes-depois" aspect="portrait"
                  professionalId={professionalId} onError={onError}
                  onChange={afterUrl => update({ afterUrl })} />
              </div>
              <TextField label="Título" value={item.title} max={LIMITS.short}
                onChange={title => update({ title })} placeholder="Lash lifting + tintura" />
              <TextField label="Descrição (opcional)" value={item.description} max={LIMITS.short}
                onChange={description => update({ description })} />
            </>
          )}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Depoimentos
// ============================================================================

export function TestimonialsPanel({ config, set, professionalId, onError }: PanelProps) {
  const t = config.content.testimonials;
  return (
    <div className="space-y-7">
      <FieldGroup title="Textos da seção">
        <TextField label="Rótulo pequeno" value={t.eyebrow} max={LIMITS.eyebrow}
          onChange={v => set(d => { d.content.testimonials.eyebrow = v; })} />
        <Row>
          <TextField label="Título" value={t.title} max={LIMITS.title}
            onChange={v => set(d => { d.content.testimonials.title = v; })} />
          <TextField label="Destaque" value={t.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.testimonials.highlight = v; })} />
        </Row>
      </FieldGroup>

      <FieldGroup title="O que suas clientes dizem">
        <Repeater
          items={t.items}
          max={LIMITS.maxTestimonials}
          addLabel="Adicionar depoimento"
          emptyHint="Sem depoimentos, a seção não aparece. Prova social costuma ser o que mais converte no link da bio."
          makeNew={() => ({ id: newItemId('dep'), name: '', photoUrl: '', text: '', rating: 5 })}
          onChange={items => set(d => { d.content.testimonials.items = items; })}
          renderItem={(item, update) => (
            <>
              <TextArea label="Depoimento" value={item.text} max={LIMITS.testimonial} rows={4}
                onChange={text => update({ text })} />
              <Row>
                <TextField label="Nome da cliente" value={item.name} max={LIMITS.name}
                  onChange={name => update({ name })} placeholder="Juliana Prado" />
                <div>
                  <label className="text-[11px] font-bold text-n-600 block mb-1.5">Estrelas</label>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => update({ rating: n })}
                        className={`h-9 flex-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          item.rating === n ? 'border-wine-700 bg-accent-soft text-wine-700' : 'border-n-200 bg-white text-n-400 hover:border-n-300'
                        }`}>
                        {n === 0 ? '—' : n}
                      </button>
                    ))}
                  </div>
                </div>
              </Row>
              <ImageField label="Foto (opcional)" value={item.photoUrl} kind="depoimento" aspect="square"
                professionalId={professionalId} onError={onError}
                onChange={photoUrl => update({ photoUrl })}
                hint="Sem foto, mostramos as iniciais do nome." />
            </>
          )}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Perguntas frequentes + números
// ============================================================================

export function ExtrasPanel({ config, set }: PanelProps) {
  const f = config.content.faq;
  const st = config.content.stats;
  return (
    <div className="space-y-7">
      <FieldGroup title="Números da capa" hint="Aparecem numa faixa logo abaixo do topo. Use no máximo 4.">
        <Repeater
          items={st.items}
          max={LIMITS.maxStats}
          addLabel="Adicionar número"
          makeNew={() => ({ id: newItemId('stat'), value: '', label: '' })}
          onChange={items => set(d => { d.content.stats.items = items; })}
          renderItem={(item, update) => (
            <Row>
              <TextField label="Número" value={item.value} max={LIMITS.statValue}
                onChange={value => update({ value })} placeholder="+800" />
              <TextField label="Legenda" value={item.label} max={LIMITS.statLabel}
                onChange={label => update({ label })} placeholder="Atendimentos" />
            </Row>
          )}
        />
      </FieldGroup>

      <FieldGroup title="Perguntas frequentes" hint="Responder dúvidas comuns aqui reduz mensagem no WhatsApp.">
        <TextField label="Rótulo pequeno" value={f.eyebrow} max={LIMITS.eyebrow}
          onChange={v => set(d => { d.content.faq.eyebrow = v; })} />
        <Row>
          <TextField label="Título" value={f.title} max={LIMITS.title}
            onChange={v => set(d => { d.content.faq.title = v; })} />
          <TextField label="Destaque" value={f.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.faq.highlight = v; })} />
        </Row>
        <Repeater
          items={f.items}
          max={LIMITS.maxFaq}
          addLabel="Adicionar pergunta"
          emptyHint="Sem perguntas, a seção não aparece."
          makeNew={() => ({ id: newItemId('faq'), question: '', answer: '' })}
          onChange={items => set(d => { d.content.faq.items = items; })}
          renderItem={(item, update) => (
            <>
              <TextField label="Pergunta" value={item.question} max={LIMITS.short}
                onChange={question => update({ question })} placeholder="Quanto tempo dura o alongamento?" />
              <TextArea label="Resposta" value={item.answer} max={LIMITS.answer} rows={3}
                onChange={answer => update({ answer })} />
            </>
          )}
        />
      </FieldGroup>

      <FieldGroup title="Onde me encontrar — textos">
        <Row>
          <TextField label="Título" value={config.content.location.title} max={LIMITS.title}
            onChange={v => set(d => { d.content.location.title = v; })} />
          <TextField label="Destaque" value={config.content.location.highlight} max={LIMITS.highlight}
            onChange={v => set(d => { d.content.location.highlight = v; })} />
        </Row>
        <TextArea label="Observação (opcional)" value={config.content.location.note} max={LIMITS.subheadline} rows={2}
          onChange={v => set(d => { d.content.location.note = v; })}
          placeholder="Atendimento só com hora marcada. Chegue com 5 minutos de antecedência." />
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Seções (ligar/desligar e reordenar)
// ============================================================================

export function SectionsPanel({ config, set, templateId }: PanelProps & { templateId: string }) {
  const supported = new Set(getTemplateMeta(templateId).supportedSections);
  const order = config.sections.order.filter(id => supported.has(id));

  const move = (id: SiteSectionId, dir: -1 | 1) => set(d => {
    const list = d.sections.order;
    const from = list.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= list.length) return;
    const [it] = list.splice(from, 1);
    list.splice(to, 0, it);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-2xl border border-n-200 bg-n-100 px-3.5 py-3">
        <Sparkles className="h-4 w-4 text-n-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-n-600 leading-relaxed">
          Ligue, desligue e reordene as seções. Uma seção ligada mas sem conteúdo (galeria sem fotos,
          por exemplo) simplesmente não aparece — a página nunca fica com um buraco.
        </p>
      </div>

      <ul className="space-y-2">
        {order.map((id, i) => {
          const required = SITE_REQUIRED_SECTIONS.includes(id);
          return (
            <li key={id} className="flex items-center gap-2 rounded-xl border border-n-200 bg-white px-3 py-2.5">
              <GripVertical className="h-4 w-4 text-n-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <Toggle
                  label={SITE_SECTION_LABEL[id]}
                  checked={config.sections.enabled[id]}
                  disabled={required}
                  hint={required ? 'Sempre visível.' : undefined}
                  onChange={v => set(d => { d.sections.enabled[id] = v; })}
                />
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => move(id, -1)} disabled={i === 0} aria-label="Subir"
                  className="p-1.5 rounded-lg text-n-400 hover:bg-n-50 disabled:opacity-30 cursor-pointer">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => move(id, 1)} disabled={i === order.length - 1} aria-label="Descer"
                  className="p-1.5 rounded-lg text-n-400 hover:bg-n-50 disabled:opacity-30 cursor-pointer">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
