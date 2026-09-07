/**
 * ============================================================================
 * LUME · Pares de fontes prontos da página pública
 * ============================================================================
 * A profissional não escolhe "uma fonte": escolhe uma DUPLA já casada (título +
 * corpo) que alguém que entende de tipografia combinou. Isso evita o clássico
 * "escolhi uma fonte bonita para o título e a página inteira ficou ilegível".
 *
 * O template define o par PADRÃO; a profissional pode trocar por qualquer outro
 * sem mudar de modelo. Os templates não citam mais nome de fonte no CSS — eles
 * usam `var(--lume-font-title)` / `var(--lume-font-body)`, que saem daqui.
 *
 * Arquivo PURO (sem React / sem servidor): serve o editor, o preview e a página.
 */

export interface SiteFontPair {
  id: string;
  /** Nome comercial mostrado no editor. */
  name: string;
  /** Em uma linha: que sensação essa dupla passa. */
  mood: string;
  /** Família do título (só o nome, para a miniatura do editor). */
  titleFamily: string;
  bodyFamily: string;
  /** Stack completo que vai para o CSS (com fallback local). */
  titleStack: string;
  bodyStack: string;
  /** Peso base dos títulos — serifas finas pedem 400; sans pedem 600. */
  titleWeight: number;
  /** Espaçamento entre letras dos títulos (algumas famílias pedem ajuste). */
  titleTracking: string;
  /** Folha do Google Fonts com TODOS os pesos que os templates usam. */
  href: string;
}

/**
 * Nota sobre os pesos: os templates usam 300–700 no corpo e 400–700 no título,
 * mais itálico no título (o trecho "destaque"). Cada href abaixo já pede
 * exatamente isso — pedir menos faria o navegador sintetizar o itálico e o
 * negrito, que é o que deixa a página com cara de rascunho.
 */
export const SITE_FONT_PAIRS: SiteFontPair[] = [
  {
    id: 'playfair-inter',
    name: 'Clássico Editorial',
    mood: 'Serifa elegante com corpo neutro. A dupla mais segura do catálogo.',
    titleFamily: 'Playfair Display',
    bodyFamily: 'Inter',
    titleStack: "'Playfair Display', Georgia, 'Times New Roman', serif",
    bodyStack: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    titleWeight: 400,
    titleTracking: 'normal',
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap',
  },
  {
    id: 'cormorant-inter',
    name: 'Luxo Sereno',
    mood: 'Serifa fina e alta, com muito ar. Passa sofisticação sem gritar.',
    titleFamily: 'Cormorant Garamond',
    bodyFamily: 'Inter',
    titleStack: "'Cormorant Garamond', Garamond, Georgia, serif",
    bodyStack: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    titleWeight: 300,
    titleTracking: '0.01em',
    href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap',
  },
  {
    id: 'cormorant-montserrat',
    name: 'Clássico Caloroso',
    mood: 'Serifa alta com corpo largo e firme. Clássica, mas nada fria.',
    titleFamily: 'Cormorant Garamond',
    bodyFamily: 'Montserrat',
    titleStack: "'Cormorant Garamond', Garamond, Georgia, serif",
    bodyStack: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
    titleWeight: 500,
    titleTracking: 'normal',
    href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Montserrat:wght@300;400;500;600;700&display=swap',
  },
  {
    id: 'outfit-inter',
    name: 'Moderno Clean',
    mood: 'Só sans-serif, geométrica e direta. Cara de clínica e de app.',
    titleFamily: 'Outfit',
    bodyFamily: 'Inter',
    titleStack: "'Outfit', ui-sans-serif, system-ui, sans-serif",
    bodyStack: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    titleWeight: 500,
    titleTracking: '-0.01em',
    href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap',
  },
  {
    id: 'playfair-montserrat',
    name: 'Editorial Forte',
    mood: 'Título de revista com corpo encorpado. Bom para títulos grandes.',
    titleFamily: 'Playfair Display',
    bodyFamily: 'Montserrat',
    titleStack: "'Playfair Display', Georgia, serif",
    bodyStack: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
    titleWeight: 400,
    titleTracking: 'normal',
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Montserrat:wght@300;400;500;600;700&display=swap',
  },
  {
    id: 'playfair-poppins',
    name: 'Beauty Suave',
    mood: 'Serifa romântica com corpo redondinho. O clima mais "salão".',
    titleFamily: 'Playfair Display',
    bodyFamily: 'Poppins',
    titleStack: "'Playfair Display', Georgia, serif",
    bodyStack: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    titleWeight: 500,
    titleTracking: 'normal',
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Poppins:wght@300;400;500;600;700&display=swap',
  },
  {
    id: 'marcellus-karla',
    name: 'Boutique Refinada',
    mood: 'Letra romana de vitrine, corpo discreto. Ar de marca antiga e cara.',
    titleFamily: 'Marcellus',
    bodyFamily: 'Karla',
    titleStack: "'Marcellus', 'Times New Roman', serif",
    bodyStack: "'Karla', ui-sans-serif, system-ui, sans-serif",
    titleWeight: 400,
    titleTracking: '0.02em',
    href: 'https://fonts.googleapis.com/css2?family=Marcellus&family=Karla:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
  },
  {
    id: 'bodoni-jost',
    name: 'Revista de Moda',
    mood: 'Contraste alto, quase Vogue. Brilha em título curto e foto grande.',
    titleFamily: 'Bodoni Moda',
    bodyFamily: 'Jost',
    titleStack: "'Bodoni Moda', Didot, Georgia, serif",
    bodyStack: "'Jost', ui-sans-serif, system-ui, sans-serif",
    titleWeight: 500,
    titleTracking: '-0.01em',
    href: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Jost:wght@300;400;500;600;700&display=swap',
  },
  {
    id: 'fraunces-nunito',
    name: 'Acolhedor Orgânico',
    mood: 'Serifa macia e humana. Combina com bem-estar, spa e terapias.',
    titleFamily: 'Fraunces',
    bodyFamily: 'Nunito Sans',
    titleStack: "'Fraunces', Georgia, serif",
    bodyStack: "'Nunito Sans', ui-sans-serif, system-ui, sans-serif",
    titleWeight: 500,
    titleTracking: '-0.01em',
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Nunito+Sans:wght@300;400;500;600;700&display=swap',
  },
  {
    id: 'dmserif-dmsans',
    name: 'Serifa Contemporânea',
    mood: 'Serifa cheia e atual com sans irmã. Moderna sem ser fria.',
    titleFamily: 'DM Serif Display',
    bodyFamily: 'DM Sans',
    titleStack: "'DM Serif Display', Georgia, serif",
    bodyStack: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    titleWeight: 400,
    titleTracking: '-0.01em',
    href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&display=swap',
  },
  {
    id: 'quicksand-nunito',
    name: 'Doce e Arredondada',
    mood: 'Tudo com canto redondo. Leve, jovem e simpática.',
    titleFamily: 'Quicksand',
    bodyFamily: 'Nunito',
    titleStack: "'Quicksand', ui-rounded, ui-sans-serif, system-ui, sans-serif",
    bodyStack: "'Nunito', ui-sans-serif, system-ui, sans-serif",
    titleWeight: 600,
    titleTracking: '-0.01em',
    href: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Nunito:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
  },
];

export const DEFAULT_FONT_PAIR_ID = 'playfair-inter';

export function getFontPair(id: string | null | undefined): SiteFontPair {
  return SITE_FONT_PAIRS.find(f => f.id === id)
    || SITE_FONT_PAIRS.find(f => f.id === DEFAULT_FONT_PAIR_ID)!;
}

export function isValidFontPairId(id: unknown): id is string {
  return typeof id === 'string' && SITE_FONT_PAIRS.some(f => f.id === id);
}

/**
 * Folha única com TODAS as famílias do catálogo, em pesos de amostra. Serve só
 * ao editor: sem ela, o cartão "Boutique Refinada" apareceria escrito na fonte
 * do painel, e escolher fonte viraria adivinhação. A página pública nunca
 * carrega isto — ela carrega apenas o `href` do par escolhido.
 *
 * (A API css2 exige as famílias em ordem alfabética.)
 */
export const FONT_SAMPLE_HREF =
  'https://fonts.googleapis.com/css2'
  + '?family=Bodoni+Moda:wght@400;500;600'
  + '&family=Cormorant+Garamond:wght@300;400;500;600'
  + '&family=DM+Sans'
  + '&family=DM+Serif+Display'
  + '&family=Fraunces:wght@400;500;600'
  + '&family=Inter:wght@400;500;600'
  + '&family=Jost:wght@400;500;600'
  + '&family=Karla:wght@400;500;600'
  + '&family=Marcellus'
  + '&family=Montserrat:wght@400;500;600'
  + '&family=Nunito:wght@400;500;600'
  + '&family=Nunito+Sans:wght@400;500;600'
  + '&family=Outfit:wght@400;500;600'
  + '&family=Playfair+Display:wght@400;500;600'
  + '&family=Poppins:wght@400;500;600'
  + '&family=Quicksand:wght@400;500;600'
  + '&display=swap';
