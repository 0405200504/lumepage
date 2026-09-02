/**
 * ============================================================================
 * LUME · Presets inteligentes por nicho para criação rápida de páginas
 * ============================================================================
 * Cópias de alta conversão, perguntas frequentes reais e estruturas recomendadas
 * para que a profissional tenha um site impecável em menos de 2 minutos, sem
 * precisar inventar textos do zero.
 */

import type { SiteConfig, SiteContent, SiteSectionId, SiteSections, SiteTheme } from '@/types/site';
import { SITE_SECTION_IDS } from '@/types/site';
import { getTemplateMeta, DEFAULT_TEMPLATE_ID } from './templates';
import { cleanText, cleanUrl, cleanDigits, cleanHandle, cleanEmail, LIMITS, type SiteSeedProfessional } from './config';
import { safeHex } from './theme';

export type NicheId =
  | 'nails'
  | 'lashes_brows'
  | 'esthetics'
  | 'hair'
  | 'massage_spa'
  | 'general';

export interface NichePreset {
  id: NicheId;
  name: string;
  badge: string;
  description: string;
  recommendedTemplateId: string;
  keywords: string[];
  sampleRoles: string[];
  content: {
    hero: {
      headline: string;
      highlight: string;
      subheadline: string;
      ctaPrimary: string;
      ctaSecondary: string;
    };
    stats: {
      items: { id: string; value: string; label: string }[];
    };
    about: {
      eyebrow: string;
      title: string;
      highlight: string;
      text: string;
      cta: string;
    };
    services: {
      eyebrow: string;
      title: string;
      highlight: string;
      subtitle: string;
    };
    faq: {
      items: { id: string; question: string; answer: string }[];
    };
    contact: {
      eyebrow: string;
      title: string;
      highlight: string;
      text: string;
      cta: string;
    };
  };
}

export const NICHE_PRESETS: Record<NicheId, NichePreset> = {
  nails: {
    id: 'nails',
    name: 'Unhas & Nail Designer',
    badge: '💅 Alongamento & Blindagem',
    description: 'Alongamento em fibra/gel, blindagem diamante, nail art autoral e cuidados com unhas naturais.',
    recommendedTemplateId: 'editorial-nude',
    keywords: ['alongamento em gel', 'fibra de vidro', 'blindagem', 'nail art', 'manicure'],
    sampleRoles: ['Nail Designer Especialista', 'Manicure & Nail Artist', 'Especialista em Alongamento'],
    content: {
      hero: {
        headline: 'Unhas impecáveis com acabamento natural',
        highlight: 'e durabilidade que você sente.',
        subheadline: 'Técnica avançada de alongamento e blindagem com produtos de alta performance. Atendimento com hora marcada e foco na saúde das suas unhas.',
        ctaPrimary: 'Agendar meu horário',
        ctaSecondary: 'Ver fotos de trabalhos',
      },
      stats: {
        items: [
          { id: 'stat-n1', value: '+800', label: 'Unhas transformadas' },
          { id: 'stat-n2', value: '5.0', label: 'Nota média das clientes' },
          { id: 'stat-n3', value: '25 a 30', label: 'Dias de durabilidade' },
        ],
      },
      about: {
        eyebrow: 'Minha trajetória',
        title: 'Cuidado artesanal e',
        highlight: 'técnica em cada detalhe.',
        text: 'Sou apaixonada por realçar a elegância das mãos de cada cliente. Meu atendimento é exclusivo, com materiais 100% esterilizados em autoclave e produtos de padrão internacional.\n\nAqui você não tem pressa: cada procedimento é feito com calma para garantir simetria, acabamento fino e saúde para suas unhas naturais.',
        cta: 'Quero agendar meu momento',
      },
      services: {
        eyebrow: 'Procedimentos',
        title: 'Serviços pensados para',
        highlight: 'suas unhas e estilo.',
        subtitle: 'Escolha o procedimento ideal para a sua rotina e agende em poucos toques.',
      },
      faq: {
        items: [
          {
            id: 'faq-n1',
            question: 'Quanto tempo dura o alongamento ou blindagem?',
            answer: 'A durabilidade média é de 25 a 30 dias. Recomendamos realizar a manutenção dentro desse prazo para preservar o alinhamento e a integridade da lâmina ungueal.',
          },
          {
            id: 'faq-n2',
            question: 'O alongamento danifica a unha natural?',
            answer: 'Não! Quando aplicado e retirado com a técnica correta por uma profissional capacitada, o alongamento protege a unha natural, permitindo que ela cresça forte por baixo.',
          },
          {
            id: 'faq-n3',
            question: 'Como funciona a manutenção?',
            answer: 'Na manutenção, nivelamos o crescimento da unha, reforçamos a estrutura de gel/fibra e renovamos a esmaltação para mantê-las como novas.',
          },
          {
            id: 'faq-n4',
            question: 'Qual o tempo médio de atendimento?',
            answer: 'Varia entre 1h30 e 2h30, dependendo da técnica escolhida e da presença de decorações/nail art personalizadas.',
          },
        ],
      },
      contact: {
        eyebrow: 'Vamos marcar?',
        title: 'Reserve o seu',
        highlight: 'horário na agenda.',
        text: 'Escolha seu procedimento preferido, selecione o dia e receba a confirmação instantânea no seu WhatsApp.',
        cta: 'Garantir meu horário',
      },
    },
  },

  lashes_brows: {
    id: 'lashes_brows',
    name: 'Cílios & Sobrancelhas',
    badge: '👁️ Olhar Marcante',
    description: 'Extensão de cílios (fio a fio, volume brasileiro/russo), lash lifting, design personalizado e brow lamination.',
    recommendedTemplateId: 'gold-premium',
    keywords: ['extensão de cílios', 'lash lifting', 'volume brasileiro', 'brow lamination', 'design de sobrancelhas'],
    sampleRoles: ['Lash & Brow Designer', 'Especialista em Olhar', 'Master em Extensão de Cílios'],
    content: {
      hero: {
        headline: 'Acorde pronta todos os dias com um',
        highlight: 'olhar marcante e sofisticado.',
        subheadline: 'Mapeamento visagista personalizado que valoriza seus traços naturais com leveza, segurança ocular e máxima retenção.',
        ctaPrimary: 'Agendar meu horário',
        ctaSecondary: 'Conhecer os estilos',
      },
      stats: {
        items: [
          { id: 'stat-l1', value: '+600', label: 'Olhares transformados' },
          { id: 'stat-l2', value: '5.0', label: 'Satisfação das clientes' },
          { id: 'stat-l3', value: '3 a 4', label: 'Semanas de retenção' },
        ],
      },
      about: {
        eyebrow: 'Sobre o estúdio',
        title: 'Técnica precisa que',
        highlight: 'respeita sua beleza.',
        text: 'Especialista em visagismo do olhar, trabalho com técnicas que unem isolamento milimétrico, fios ultraleves e adesivos certificados para proteger a saúde dos seus fios naturais.\n\nCada conjunto de cílios ou design de sobrancelha é desenhado exclusivamente para o formato dos seus olhos e a sua rotina.',
        cta: 'Agendar avaliação',
      },
      services: {
        eyebrow: 'Técnicas',
        title: 'Estilos pensados para',
        highlight: 'o seu formato de olhar.',
        subtitle: 'Do efeito mais natural e elegante aos volumes mais densos e expressivos.',
      },
      faq: {
        items: [
          {
            id: 'faq-l1',
            question: 'A extensão de cílios dói ou incomoda?',
            answer: 'Não dói nada! A aplicação é tão suave e relaxante que muitas clientes aproveitam a sessão para dormir. Usamos protetores de hidrogel confortáveis.',
          },
          {
            id: 'faq-l2',
            question: 'Posso molhar e lavar os cílios?',
            answer: 'Sim! A higienização correta com shampoo específico é fundamental para a saúde dos olhos e ajuda a prolongar a durabilidade dos fios.',
          },
          {
            id: 'faq-l3',
            question: 'De quanto em quanto tempo devo fazer manutenção?',
            answer: 'Recomendamos a manutenção a cada 15 a 21 dias para repor os fios que caíram no ciclo natural de renovação dos seus cílios.',
          },
        ],
      },
      contact: {
        eyebrow: 'Agende seu momento',
        title: 'Realce o seu olhar com',
        highlight: 'uma especialista.',
        text: 'Atendimento calmo e acolhedor em espaço climatizado. Escolha o melhor dia e horário para você.',
        cta: 'Agendar agora',
      },
    },
  },

  esthetics: {
    id: 'esthetics',
    name: 'Estética & Skincare',
    badge: '✨ Pele Radiante & Corpo',
    description: 'Limpeza de pele profunda, peelings químicos, hidratação avançada, drenagem linfática e protocolos faciais/corporais.',
    recommendedTemplateId: 'clinic-sage',
    keywords: ['limpeza de pele', 'peeling', 'drenagem linfática', 'estética facial', 'rejuvenescimento'],
    sampleRoles: ['Esteticista & Cosmetóloga', 'Especialista em Saúde da Pele', 'Terapeuta Estética'],
    content: {
      hero: {
        headline: 'Protocolos integrativos para uma',
        highlight: 'pele renovada, luminosa e saudável.',
        subheadline: 'Tratamentos faciais e corporais personalizados com cosméticos de alta tecnologia e avaliação detalhada das necessidades da sua pele.',
        ctaPrimary: 'Agendar avaliação',
        ctaSecondary: 'Ver tratamentos',
      },
      stats: {
        items: [
          { id: 'stat-e1', value: '+1.000', label: 'Sessões realizadas' },
          { id: 'stat-e2', value: '100%', label: 'Cosméticos certificados' },
          { id: 'stat-e3', value: '5.0', label: 'Avaliação excelente' },
        ],
      },
      about: {
        eyebrow: 'Conheça o espaço',
        title: 'Ciência, acolhimento e',
        highlight: 'cuidado com a sua pele.',
        text: 'Acredito que cuidar da pele é um ato de autocuidado e saúde. Todos os protocolos são estruturados após uma anamnese minuciosa para entender seus hábitos, tipo de pele e objetivos.\n\nUtilizo ativos biocompatíveis e equipamentos modernos para entregar resultados visíveis desde a primeira sessão com total segurança.',
        cta: 'Quero cuidar da minha pele',
      },
      services: {
        eyebrow: 'Protocolos',
        title: 'Tratamentos pensados para',
        highlight: 'suas necessidades.',
        subtitle: 'Resultados progressivos e duradouros para rosto e corpo com máximo conforto.',
      },
      faq: {
        items: [
          {
            id: 'faq-e1',
            question: 'A limpeza de pele deixa o rosto marcado ou vermelho?',
            answer: 'Utilizamos produtos calmantes, alta frequência e máscaras regeneradoras que reduzem significativamente a vermelhidão, permitindo que você retorne à rotina com conforto.',
          },
          {
            id: 'faq-e2',
            question: 'Com que frequência devo fazer limpeza de pele?',
            answer: 'Em média a cada 30 a 45 dias para peles normais/mistas, ou a cada 20 a 30 dias para peles oleosas e acneicas.',
          },
          {
            id: 'faq-e3',
            question: 'Os procedimentos exigem cuidados prévios?',
            answer: 'Sim, recomendamos evitar exposição solar intensa e ácidos 3 dias antes da sessão. Todos os detalhes são enviados na confirmação do agendamento.',
          },
        ],
      },
      contact: {
        eyebrow: 'Comece hoje',
        title: 'Agende sua avaliação',
        highlight: 'personalizada.',
        text: 'Venha viver uma experiência de relaxamento e transformação para a sua autoestima.',
        cta: 'Reservar atendimento',
      },
    },
  },

  hair: {
    id: 'hair',
    name: 'Cabelo & Penteados',
    badge: '💇‍♀️ Cor, Corte & Tratamento',
    description: 'Cortes autorais, mechas, coloração, cronograma capilar, terapia capilar e penteados para eventos.',
    recommendedTemplateId: 'editorial-bronze',
    keywords: ['mechas', 'loiro saudável', 'corte feminino', 'terapia capilar', 'cronograma'],
    sampleRoles: ['Hair Stylist & Colorista', 'Especialista em Mechas', 'Terapeuta Capilar'],
    content: {
      hero: {
        headline: 'Cabelos saudáveis, com movimento',
        highlight: 'e a cor perfeita para você.',
        subheadline: 'Especialista em mechas iluminadas, cortes personalizados e recuperação profunda da fibra capilar.',
        ctaPrimary: 'Agendar horário',
        ctaSecondary: 'Ver transformações',
      },
      stats: {
        items: [
          { id: 'stat-h1', value: '+1.200', label: 'Transformações' },
          { id: 'stat-h2', value: '5.0', label: 'Nota máxima das clientes' },
          { id: 'stat-h3', value: '10+', label: 'Anos de experiência' },
        ],
      },
      about: {
        eyebrow: 'Sobre meu trabalho',
        title: 'Diagnóstico capilar sincero e',
        highlight: 'resultados que duram.',
        text: 'Mais do que uma mudança de visual, meu propósito é cuidar da saúde do seu cabelo. Antes de qualquer química, realizamos teste de mecha e avaliação da integridade dos fios.\n\nTrabalho com as melhores marcas do mercado profissional para garantir brilho, maciez e luminosidade de salão.',
        cta: 'Agendar consultoria capilar',
      },
      services: {
        eyebrow: 'Menu de serviços',
        title: 'Técnicas exclusivas para',
        highlight: 'o seu estilo.',
        subtitle: 'Tratamentos intensivos, corte e procedimentos químicos com máxima proteção dos fios.',
      },
      faq: {
        items: [
          {
            id: 'faq-h1',
            question: 'É necessário fazer teste de mecha antes da descoloração?',
            answer: 'Sim, sempre! O teste de mecha é a nossa garantia de que seu cabelo está forte o suficiente para atingir o tom desejado sem danos.',
          },
          {
            id: 'faq-h2',
            question: 'Como manter o tratamento e a cor em casa?',
            answer: 'Ao final do atendimento indico o cronograma capilar ideal com produtos de home care adequados para a sua rotina.',
          },
        ],
      },
      contact: {
        eyebrow: 'Vamos transformar?',
        title: 'Garanta sua data na',
        highlight: 'minha cadeira.',
        text: 'Atendimento exclusivo com hora marcada em ambiente pensado para o seu bem-estar.',
        cta: 'Agendar meu horário',
      },
    },
  },

  massage_spa: {
    id: 'massage_spa',
    name: 'Massoterapia & Spa',
    badge: '💆‍♀️ Relaxamento & Bem-Estar',
    description: 'Massagem relaxante, liberação miofascial, drenagem linfática método Renata França, ventosaterapia e spa dos pés.',
    recommendedTemplateId: 'terracota',
    keywords: ['massagem relaxante', 'liberação miofascial', 'drenagem', 'spa', 'alívio de dores'],
    sampleRoles: ['Massoterapeuta & Terapeuta Corporal', 'Especialista em Bem-Estar', 'Terapeuta Spa'],
    content: {
      hero: {
        headline: 'Alívio de tensões e renovação profunda',
        highlight: 'para o seu corpo e mente.',
        subheadline: 'Sessões terapêuticas em ambiente acolhedor com aromaterapia, música suave e toques precisos para devolver sua leveza.',
        ctaPrimary: 'Agendar minha sessão',
        ctaSecondary: 'Conhecer as massagens',
      },
      stats: {
        items: [
          { id: 'stat-m1', value: '+700', label: 'Sessões de alívio e bem-estar' },
          { id: 'stat-m2', value: '100%', label: 'Ambiente climatizado & sensorial' },
          { id: 'stat-m3', value: '5.0', label: 'Avaliação excelente' },
        ],
      },
      about: {
        eyebrow: 'Conheça o espaço',
        title: 'Seu refúgio de paz em meio',
        highlight: 'à correria do dia a dia.',
        text: 'Minhas sessões combinam técnicas orientais e ocidentais com óleos essenciais terapêuticos aquecidos para proporcionar relaxamento muscular e descompressão emocional.\n\nCada atendimento é único: conversamos sobre suas queixas e dores para personalizar a intensidade e os pontos de foco da massagem.',
        cta: 'Quero reservar um momento para mim',
      },
      services: {
        eyebrow: 'Terapias',
        title: 'Técnicas pensadas para o seu',
        highlight: 'equilíbrio físico e mental.',
        subtitle: 'Massagens focadas em relaxamento, drenagem de líquidos ou desativação de nós de tensão.',
      },
      faq: {
        items: [
          {
            id: 'faq-m1',
            question: 'Qual a diferença entre massagem relaxante e terapêutica?',
            answer: 'A relaxante tem movimentos suaves e contínuos para acalmar o sistema nervoso. A terapêutica foca em pontos específicos de tensão, contraturas e alívio de dores musculares.',
          },
          {
            id: 'faq-m2',
            question: 'O que devo vestir para a sessão?',
            answer: 'Fornecemos todo o conforto necessário (toalhas aquecidas, lençóis descartáveis e ambiente privativo). Você pode vir com roupas leves e confortáveis.',
          },
        ],
      },
      contact: {
        eyebrow: 'Seu autocuidado',
        title: 'Reserve um tempo exclusivo',
        highlight: 'para você.',
        text: 'Escolha a terapia desejada e venha recarregar suas energias.',
        cta: 'Garantir meu horário',
      },
    },
  },

  general: {
    id: 'general',
    name: 'Beleza & Autocuidado Geral',
    badge: '🌸 Atendimento Exclusivo',
    description: 'Para maquiadoras, micropigmentadoras, depiladoras, podólogas e profissionais multidisciplinares.',
    recommendedTemplateId: 'rose-champagne',
    keywords: ['beleza', 'estética', 'atendimento personalizado', 'autocuidado'],
    sampleRoles: ['Profissional da Beleza', 'Especialista em Autocuidado', 'Atendimento Personalizado'],
    content: {
      hero: {
        headline: 'Um cuidado feito com carinho',
        highlight: 'e sob medida para você.',
        subheadline: 'Atendimento com hora marcada, técnica apurada e um resultado que combina com quem você é e valoriza sua beleza natural.',
        ctaPrimary: 'Agendar meu horário',
        ctaSecondary: 'Ver serviços',
      },
      stats: {
        items: [
          { id: 'stat-g1', value: '+500', label: 'Clientes atendidas' },
          { id: 'stat-g2', value: '5.0', label: 'Avaliação média' },
          { id: 'stat-g3', value: '100%', label: 'Atendimento com hora marcada' },
        ],
      },
      about: {
        eyebrow: 'Sobre mim',
        title: 'Prazer, sou especialista em',
        highlight: 'realçar a sua melhor versão.',
        text: 'Trabalho com hora marcada em um ambiente tranquilo, confortável e com produtos de alta qualidade.\n\nAqui você encontra um momento de pausa na sua rotina para ser cuidada com atenção e respeito aos seus gostos.',
        cta: 'Agendar meu horário',
      },
      services: {
        eyebrow: 'O que eu faço',
        title: 'Serviços pensados para',
        highlight: 'a sua rotina.',
        subtitle: 'Escolha o procedimento ideal e agende em poucos segundos.',
      },
      faq: {
        items: [
          {
            id: 'faq-g1',
            question: 'Como funciona a confirmação do agendamento?',
            answer: 'Ao selecionar seu horário no site, você recebe a confirmação imediata e lembretes automáticos para não esquecer do seu compromisso.',
          },
          {
            id: 'faq-g2',
            question: 'Quais as formas de pagamento aceitas?',
            answer: 'Aceitamos Pix, cartões de crédito e débito no local do atendimento.',
          },
        ],
      },
      contact: {
        eyebrow: 'Vamos agendar?',
        title: 'Reserve o seu',
        highlight: 'horário na agenda.',
        text: 'Atendimento exclusivo com hora marcada. Escolha o serviço, o dia e o melhor horário para você.',
        cta: 'Agendar agora',
      },
    },
  },
};

export const NICHE_LIST = Object.values(NICHE_PRESETS);

/**
 * Monta um SiteConfig completo com os presets de um nicho específico,
 * aproveitando com segurança os dados cadastrais da profissional.
 */
export function buildNicheConfig(
  nicheId: NicheId,
  templateId: string,
  prof?: SiteSeedProfessional,
): SiteConfig {
  const preset = NICHE_PRESETS[nicheId] || NICHE_PRESETS.general;
  const meta = getTemplateMeta(templateId);

  const brand = cleanText(prof?.brand_name || prof?.name, LIMITS.name) || 'Meu Estúdio';
  const role = cleanText(preset.sampleRoles[0], LIMITS.short);
  const city = cleanText(prof?.city, LIMITS.short) || 'Atendimento com hora marcada';

  const theme: SiteTheme = {
    ...meta.defaultTheme,
    primary: prof?.primary_color ? safeHex(prof.primary_color, meta.defaultTheme.primary) : meta.defaultTheme.primary,
    secondary: prof?.secondary_color ? safeHex(prof.secondary_color, meta.defaultTheme.secondary) : meta.defaultTheme.secondary,
  };

  const sections: SiteSections = {
    order: [...SITE_SECTION_IDS],
    enabled: {
      hero: true,
      stats: true,
      about: true,
      services: true,
      gallery: true,
      beforeAfter: false,
      testimonials: true,
      faq: true,
      location: true,
      contact: true,
    },
  };

  return {
    version: 1,
    identity: {
      professionalName: cleanText(prof?.name, LIMITS.name),
      studioName: brand,
      role,
      logoUrl: cleanUrl(prof?.logo_url),
      photoUrl: cleanUrl(prof?.profile_image_url),
      city: cleanText(prof?.city, LIMITS.short),
      address: cleanText(prof?.address, LIMITS.short),
      whatsapp: cleanDigits(prof?.whatsapp),
      phone: cleanDigits(prof?.whatsapp),
      instagram: cleanHandle(prof?.instagram),
      email: cleanEmail(prof?.email),
    },
    theme,
    content: {
      hero: {
        eyebrow: city,
        headline: preset.content.hero.headline,
        highlight: preset.content.hero.highlight,
        subheadline: preset.content.hero.subheadline,
        ctaPrimary: preset.content.hero.ctaPrimary,
        ctaSecondary: preset.content.hero.ctaSecondary,
        imageUrl: cleanUrl(prof?.profile_image_url),
      },
      stats: {
        items: preset.content.stats.items.map(s => ({ ...s })),
      },
      about: {
        eyebrow: preset.content.about.eyebrow,
        title: preset.content.about.title,
        highlight: preset.content.about.highlight,
        text: preset.content.about.text,
        imageUrl: cleanUrl(prof?.profile_image_url),
        cta: preset.content.about.cta,
      },
      services: {
        eyebrow: preset.content.services.eyebrow,
        title: preset.content.services.title,
        highlight: preset.content.services.highlight,
        subtitle: preset.content.services.subtitle,
        showPrices: true,
        showDuration: true,
      },
      gallery: {
        eyebrow: 'Portfólio',
        title: 'Trabalhos que falam',
        highlight: 'por si.',
        items: [],
      },
      beforeAfter: {
        eyebrow: 'Resultados',
        title: 'Antes e',
        highlight: 'depois.',
        items: [],
      },
      testimonials: {
        eyebrow: 'Depoimentos',
        title: 'Quem senta na cadeira,',
        highlight: 'volta e recomenda.',
        items: [
          {
            id: 'dep-preset-1',
            name: 'Fernanda Lima',
            photoUrl: '',
            text: 'Atendimento impecável! O cuidado e o carinho com cada detalhe fazem toda a diferença. Não troco por nada!',
            rating: 5,
          },
          {
            id: 'dep-preset-2',
            name: 'Juliana Prado',
            photoUrl: '',
            text: 'Melhor profissional da região! Espaço super agradável e resultado que supera todas as expectativas.',
            rating: 5,
          },
        ],
      },
      faq: {
        eyebrow: 'Dúvidas',
        title: 'Perguntas',
        highlight: 'frequentes.',
        items: preset.content.faq.items.map(f => ({ ...f })),
      },
      location: {
        eyebrow: 'Onde me encontrar',
        title: 'Venha me',
        highlight: 'visitar.',
        hours: 'Segunda a sábado, das 9h às 19h',
        note: 'Atendimento exclusivo com hora marcada.',
      },
      contact: {
        eyebrow: preset.content.contact.eyebrow,
        title: preset.content.contact.title,
        highlight: preset.content.contact.highlight,
        text: `Atendimento com hora marcada em ${brand}. Escolha o serviço, o dia e o horário — a confirmação é na hora.`,
        cta: preset.content.contact.cta,
      },
      footer: { note: '' },
    },
    sections,
    seo: {
      title: `${brand} — ${role}`,
      description: preset.content.hero.subheadline,
      ogImageUrl: cleanUrl(prof?.profile_image_url),
    },
  };
}

/**
 * Cria uma configuração totalmente limpa / em branco do zero,
 * ideal para quem deseja construir a página sem textos pré-prontos.
 */
export function buildBlankConfig(
  templateId: string,
  prof?: SiteSeedProfessional,
): SiteConfig {
  const meta = getTemplateMeta(templateId);
  const brand = cleanText(prof?.brand_name || prof?.name, LIMITS.name) || '';

  return {
    version: 1,
    identity: {
      professionalName: cleanText(prof?.name, LIMITS.name),
      studioName: brand,
      role: '',
      logoUrl: cleanUrl(prof?.logo_url),
      photoUrl: cleanUrl(prof?.profile_image_url),
      city: cleanText(prof?.city, LIMITS.short),
      address: cleanText(prof?.address, LIMITS.short),
      whatsapp: cleanDigits(prof?.whatsapp),
      phone: cleanDigits(prof?.whatsapp),
      instagram: cleanHandle(prof?.instagram),
      email: cleanEmail(prof?.email),
    },
    theme: { ...meta.defaultTheme },
    content: {
      hero: {
        eyebrow: cleanText(prof?.city, LIMITS.eyebrow),
        headline: '',
        highlight: '',
        subheadline: '',
        ctaPrimary: 'Agendar horário',
        ctaSecondary: 'Ver serviços',
        imageUrl: cleanUrl(prof?.profile_image_url),
      },
      stats: { items: [] },
      about: {
        eyebrow: 'Sobre mim',
        title: '',
        highlight: '',
        text: '',
        imageUrl: cleanUrl(prof?.profile_image_url),
        cta: 'Agendar',
      },
      services: {
        eyebrow: 'Serviços',
        title: 'Meus',
        highlight: 'procedimentos.',
        subtitle: '',
        showPrices: true,
        showDuration: true,
      },
      gallery: {
        eyebrow: 'Galeria',
        title: 'Fotos e',
        highlight: 'trabalhos.',
        items: [],
      },
      beforeAfter: {
        eyebrow: 'Resultados',
        title: 'Antes e',
        highlight: 'depois.',
        items: [],
      },
      testimonials: {
        eyebrow: 'Depoimentos',
        title: 'O que dizem as',
        highlight: 'clientes.',
        items: [],
      },
      faq: {
        eyebrow: 'Dúvidas',
        title: 'Perguntas',
        highlight: 'frequentes.',
        items: [],
      },
      location: {
        eyebrow: 'Localização',
        title: 'Onde me',
        highlight: 'encontrar.',
        hours: 'Segunda a sábado, das 9h às 19h',
        note: '',
      },
      contact: {
        eyebrow: 'Contato',
        title: 'Reserve o seu',
        highlight: 'horário.',
        text: 'Escolha o melhor dia e horário na agenda online.',
        cta: 'Agendar agora',
      },
      footer: { note: '' },
    },
    sections: {
      order: [...SITE_SECTION_IDS],
      enabled: {
        hero: true,
        stats: false,
        about: true,
        services: true,
        gallery: true,
        beforeAfter: false,
        testimonials: false,
        faq: false,
        location: true,
        contact: true,
      },
    },
    seo: {
      title: brand,
      description: '',
      ogImageUrl: cleanUrl(prof?.profile_image_url),
    },
  };
}
