/**
 * ============================================================================
 * LUME · O que ainda falta na página
 * ============================================================================
 * O editor tem onze abas. Sem um roteiro, a profissional abre, mexe em três
 * campos e publica uma página pela metade — ou nem publica, porque não sabe
 * se está pronta.
 *
 * Este arquivo responde a única pergunta que ela realmente faz: **"falta o
 * quê?"**. Cada item sabe se está feito, para onde levar o clique e por que
 * importa. É a mesma lista usada na barra de progresso e no aviso antes de
 * publicar.
 *
 * Arquivo PURO (sem React / sem servidor).
 */

import type { SiteConfig } from '@/types/site';

/** Ids das abas do editor — repetidos aqui para o arquivo continuar puro. */
export type ChecklistTab =
  | 'template' | 'identity' | 'theme' | 'content' | 'services'
  | 'gallery' | 'beforeAfter' | 'testimonials' | 'extras' | 'sections' | 'address';

export interface ChecklistItem {
  id: string;
  label: string;
  /** Por que isso muda o resultado para a cliente que abre a página. */
  why: string;
  done: boolean;
  tab: ChecklistTab;
  /**
   * true = sem isso a página não deveria ir ao ar (fica no bloco "essencial").
   * false = deixa a página mais completa, mas não trava a publicação.
   */
  essential: boolean;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  essential: ChecklistItem[];
  extras: ChecklistItem[];
  /** 0–100, contando essenciais com peso 2 — publicar importa mais que caprichar. */
  percent: number;
  /** Essenciais ainda em aberto. Vazio = pode publicar sem vergonha. */
  missingEssential: ChecklistItem[];
}

const has = (v: string | undefined | null) => !!(v && v.trim().length > 0);

export function buildChecklist(config: SiteConfig, serviceCount: number): ChecklistResult {
  const i = config.identity;
  const c = config.content;

  const items: ChecklistItem[] = [
    {
      id: 'name',
      label: 'Nome do estúdio ou seu nome',
      why: 'É o que aparece no topo da página e na aba do navegador.',
      done: has(i.studioName) || has(i.professionalName),
      tab: 'identity',
      essential: true,
    },
    {
      id: 'role',
      label: 'Sua profissão',
      why: 'Em duas palavras a cliente entende o que você faz.',
      done: has(i.role),
      tab: 'identity',
      essential: true,
    },
    {
      id: 'photo',
      label: 'Uma foto sua ou do espaço',
      why: 'Página de beleza sem foto não passa confiança.',
      done: has(i.photoUrl) || has(c.hero.imageUrl),
      tab: 'identity',
      essential: true,
    },
    {
      id: 'headline',
      label: 'Frase de destaque da capa',
      why: 'É a primeira linha que a cliente lê ao abrir seu link.',
      done: has(c.hero.headline),
      tab: 'content',
      essential: true,
    },
    {
      id: 'services',
      label: 'Serviços cadastrados',
      why: 'Sem serviço não há o que agendar — a página vira só um cartão.',
      done: serviceCount > 0,
      tab: 'services',
      essential: true,
    },
    {
      id: 'contact',
      label: 'WhatsApp ou Instagram',
      why: 'É por onde a cliente tira dúvida antes de marcar.',
      done: has(i.whatsapp) || has(i.instagram),
      tab: 'identity',
      essential: true,
    },
    {
      id: 'about',
      label: 'Texto do "sobre mim"',
      why: 'Quem conta a própria história marca mais horários.',
      done: c.about.text.trim().length >= 80,
      tab: 'content',
      essential: false,
    },
    {
      id: 'location',
      label: 'Endereço e horário',
      why: 'Evita a pergunta "onde fica?" chegando toda hora no WhatsApp.',
      done: has(i.address) && has(c.location.hours),
      tab: 'identity',
      essential: false,
    },
    {
      id: 'gallery',
      label: 'Pelo menos 3 fotos de trabalhos',
      why: 'A galeria é o que convence — é o seu portfólio.',
      done: c.gallery.items.length >= 3,
      tab: 'gallery',
      essential: false,
    },
    {
      id: 'testimonials',
      label: 'Um depoimento de cliente',
      why: 'Prova social é o que tira a insegurança de quem nunca foi atendida por você.',
      done: c.testimonials.items.length >= 1,
      tab: 'testimonials',
      essential: false,
    },
    {
      id: 'faq',
      label: 'Duas perguntas frequentes',
      why: 'Responde antes de ser perguntado — e você para de repetir no WhatsApp.',
      done: c.faq.items.length >= 2,
      tab: 'extras',
      essential: false,
    },
    {
      id: 'seo',
      label: 'Título e descrição para compartilhar',
      why: 'É o que aparece quando você manda seu link no WhatsApp ou na bio.',
      done: has(config.seo.title) && has(config.seo.description),
      tab: 'address',
      essential: false,
    },
  ];

  const essential = items.filter(x => x.essential);
  const extras = items.filter(x => !x.essential);

  const total = essential.length * 2 + extras.length;
  const scored = essential.filter(x => x.done).length * 2 + extras.filter(x => x.done).length;

  return {
    items,
    essential,
    extras,
    percent: total === 0 ? 100 : Math.round((scored / total) * 100),
    missingEssential: essential.filter(x => !x.done),
  };
}
