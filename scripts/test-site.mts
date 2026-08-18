// Harness de testes do módulo "Minha Página" (site/link na bio).
//
// Roda em duas camadas, igual ao test-bot.mts:
//   1) LÓGICA PURA (sempre roda, sem rede): saneamento/XSS, slug, tema,
//      contrato de templates, troca de template sem perda, seções e o
//      recorte público dos serviços.
//   2) BANCO (só roda com .env do Supabase): leitura das tabelas existentes,
//      isolamento por profissional e fallback gracioso enquanto a migração
//      v30 não foi aplicada.
//
// Como rodar:
//   node --env-file=.env scripts/test-site.mts
//   node scripts/test-site.mts            (só a camada de lógica pura)
//
import fs from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';

const ROOT = process.cwd();
// `jsx: true` liga o transform de JSX do jiti — sem isso os templates (.tsx)
// não compilam fora do Next e a camada 9 (renderização) não roda.
const jiti = createJiti(ROOT + '/', {
  alias: { '@': ROOT },
  jsx: { runtime: 'automatic' },
});

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass++;
    console.log(`${c.green('PASS')}  ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`${c.red('FAIL')}  ${name}${detail ? c.gray(`  → ${detail}`) : ''}`);
  }
}

function group(title: string) {
  console.log(`\n${c.bold(title)}`);
}

// ============================================================================
// Carregamento dos módulos
// ============================================================================

const cfgMod = await jiti.import<typeof import('../lib/site/config.ts')>('./lib/site/config.ts');
const slugMod = await jiti.import<typeof import('../lib/site/slug.ts')>('./lib/site/slug.ts');
const themeMod = await jiti.import<typeof import('../lib/site/theme.ts')>('./lib/site/theme.ts');
const tplMod = await jiti.import<typeof import('../lib/site/templates.ts')>('./lib/site/templates.ts');
const pubMod = await jiti.import<typeof import('../lib/site/publicService.ts')>('./lib/site/publicService.ts');

const {
  cleanText, cleanUrl, cleanHandle, cleanDigits, cleanEmail,
  normalizeConfig, defaultSiteConfig, resolveVisibleSections, LIMITS,
} = cfgMod;
const { normalizeSlug, validateSlug, RESERVED_SLUGS } = slugMod;
const { themeToCssVars, contrast, readableOn, safeHex } = themeMod;
const { SITE_TEMPLATES, getTemplateMeta, isValidTemplateId } = tplMod;
const { toPublicService, toPublicServices } = pubMod;

// ============================================================================
// 1. Saneamento de entrada (XSS, HTML, URLs, limites)
// ============================================================================

group('1. Proteção de entrada (XSS, HTML, URLs maliciosas)');

check(
  'cleanText remove tag <script> inteira',
  !cleanText('Oi <script>alert(1)</script> tudo bem', 200).includes('script'),
  cleanText('Oi <script>alert(1)</script> tudo bem', 200),
);

check(
  'cleanText remove <img onerror=...>',
  !/onerror|<img/i.test(cleanText('<img src=x onerror=alert(1)>', 200)),
);

check(
  'cleanText não deixa sobrar < ou >',
  !/[<>]/.test(cleanText('a < b > c <b>negrito</b>', 200)),
);

check(
  'cleanText preserva quebra de parágrafo (\\n) e acentos',
  cleanText('Olá\n\nTudo ótimo', 200) === 'Olá\n\nTudo ótimo',
  JSON.stringify(cleanText('Olá\n\nTudo ótimo', 200)),
);

check(
  'cleanText corta no limite pedido',
  cleanText('x'.repeat(500), 40).length === 40,
);

check('cleanUrl recusa javascript:', cleanUrl('javascript:alert(1)') === '');
check('cleanUrl recusa JaVaScRiPt: (maiúsculas trocadas)', cleanUrl('JaVaScRiPt:alert(1)') === '');
check('cleanUrl recusa data:text/html', cleanUrl('data:text/html,<script>alert(1)</script>') === '');
check('cleanUrl recusa vbscript:', cleanUrl('vbscript:msgbox(1)') === '');
check('cleanUrl recusa URL protocolo-relativo (//evil.com)', cleanUrl('//evil.com/x.png') === '');
check('cleanUrl aceita https', cleanUrl('https://cdn.exemplo.com/a.webp') === 'https://cdn.exemplo.com/a.webp');
check('cleanUrl aceita caminho interno', cleanUrl('/images/foto.png') === '/images/foto.png');

check('cleanHandle tira @ e a URL do Instagram',
  cleanHandle('https://instagram.com/marina.nails') === 'marina.nails' && cleanHandle('@marina') === 'marina');
check('cleanDigits deixa só números', cleanDigits('+55 (11) 99999-0000') === '5511999990000');
check('cleanEmail recusa endereço inválido', cleanEmail('não-é-email') === '');

// Payload hostil completo passando pelo normalizeConfig
const hostil = {
  identity: {
    professionalName: '<script>steal()</script>Marina',
    studioName: 'x'.repeat(500),
    logoUrl: 'javascript:alert(1)',
    photoUrl: 'https://ok.com/a.png',
    instagram: '<b>@marina</b>',
    whatsapp: 'abc5511999990000def',
    email: 'javascript:alert(1)',
  },
  theme: { primary: 'red; background: url(javascript:1)', secondary: '#zzz', radius: 'evil' },
  content: {
    hero: { headline: '<iframe src=evil></iframe>Oi', imageUrl: 'data:text/html,x' },
    gallery: { items: Array.from({ length: 200 }, (_, i) => ({ id: `<x>${i}`, url: `https://ok.com/${i}.png`, caption: '<script>x</script>' })) },
    testimonials: { items: [{ id: 'a', name: '<b>Ana</b>', text: 'Ótimo!', rating: 99, photoUrl: 'javascript:1' }] },
  },
  sections: { order: ['hero', 'DROP TABLE', 'services'], enabled: { hero: false, services: 'sim' } },
  seo: { ogImageUrl: 'javascript:alert(1)' },
};
const limpo = normalizeConfig(hostil, 'editorial-nude');
const asJson = JSON.stringify(limpo);

check('normalizeConfig: nenhum "<script" sobrevive em lugar nenhum', !/<script/i.test(asJson));
check('normalizeConfig: nenhum "javascript:" sobrevive', !/javascript:/i.test(asJson));
check('normalizeConfig: nenhum "data:text/html" sobrevive', !/data:text\/html/i.test(asJson));
check('normalizeConfig: cor inválida vira o padrão do template',
  limpo.theme.primary === '#6e2233', limpo.theme.primary);
check('normalizeConfig: raio inválido vira o padrão', limpo.theme.radius === 'round', limpo.theme.radius);
check(`normalizeConfig: galeria limitada a ${LIMITS.maxGallery} itens`,
  limpo.content.gallery.items.length === LIMITS.maxGallery, String(limpo.content.gallery.items.length));
check('normalizeConfig: nota de avaliação fora da faixa é travada em 5',
  limpo.content.testimonials.items[0].rating === 5);
check('normalizeConfig: seção inexistente é descartada da ordem',
  !limpo.sections.order.includes('DROP TABLE' as never));
check('normalizeConfig: hero não pode ser desligada', limpo.sections.enabled.hero === true);
check('normalizeConfig: campo booleano com lixo cai no padrão',
  typeof limpo.sections.enabled.services === 'boolean');
check('normalizeConfig: nome longo demais é cortado no limite',
  limpo.identity.studioName.length <= LIMITS.name);
check('normalizeConfig: config vazia produz página válida',
  !!normalizeConfig({}, 'gold-premium').content.hero.headline);
check('normalizeConfig: null/undefined não quebram',
  !!normalizeConfig(null, 'terracota').identity && !!normalizeConfig(undefined, 'terracota').theme);

// ============================================================================
// 2. Slug
// ============================================================================

group('2. Endereço público (slug)');

check('normalizeSlug tira acento, espaço e maiúscula',
  normalizeSlug('Mariá Nails Studio') === 'maria-nails-studio', normalizeSlug('Mariá Nails Studio'));
check('normalizeSlug remove emoji e símbolo', normalizeSlug('lash ✨ design!!') === 'lash-design');
check('normalizeSlug não deixa hífen sobrando nas pontas', normalizeSlug('--maria--') === 'maria');
check('validateSlug aceita slug válido', validateSlug('marianails').ok);
check('validateSlug recusa reservado "dashboard"', !validateSlug('dashboard').ok);
check('validateSlug recusa reservado "api"', !validateSlug('api').ok);
check('validateSlug recusa reservado "agendar"', !validateSlug('agendar').ok);
check('validateSlug recusa curto demais', !validateSlug('ab').ok);
check('validateSlug recusa só números', !validateSlug('12345').ok);
check('validateSlug recusa vazio', !validateSlug('   ').ok);
check('validateSlug devolve mensagem sem jargão técnico',
  (validateSlug('dashboard').error || '').length > 10 && !/error|exception|null/i.test(validateSlug('dashboard').error || ''));

// Toda rota de primeiro nível do app precisa estar reservada.
// Só conta pasta que realmente vira URL: precisa ter page/route em algum nível
// abaixo dela. (app/actions/, por exemplo, é código de servidor, não rota.)
const appDir = path.join(ROOT, 'app');

function hasRouteFile(dir: string): boolean {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && /^(page|route)\.(tsx?|jsx?)$/.test(e.name)) return true;
    if (e.isDirectory() && hasRouteFile(path.join(dir, e.name))) return true;
  }
  return false;
}

const topRoutes = new Set<string>();
for (const entry of fs.readdirSync(appDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const name = entry.name;
  if (name.startsWith('(')) {
    for (const sub of fs.readdirSync(path.join(appDir, name), { withFileTypes: true })) {
      if (sub.isDirectory() && !sub.name.startsWith('[') && !sub.name.startsWith('(')
          && hasRouteFile(path.join(appDir, name, sub.name))) {
        topRoutes.add(sub.name);
      }
    }
  } else if (!name.startsWith('[') && hasRouteFile(path.join(appDir, name))) {
    topRoutes.add(name);
  }
}
const desprotegidas = [...topRoutes].filter(r => !RESERVED_SLUGS.has(r));
check(`todas as ${topRoutes.size} rotas reais do app estão na lista de reservados`,
  desprotegidas.length === 0, desprotegidas.join(', '));

// ============================================================================
// 3. Tema e legibilidade
// ============================================================================

group('3. Tema — legibilidade garantida');

check('contraste branco/preto é o máximo (21)', Math.round(contrast('#ffffff', '#000000')) === 21);
check('readableOn escolhe texto claro em fundo escuro',
  contrast('#1a1a1a', readableOn('#1a1a1a', '#faf7f2', '#2b2724')) >= 4.5);
check('readableOn escolhe texto escuro em fundo claro',
  contrast('#fdfcfa', readableOn('#fdfcfa', '#faf7f2', '#2b2724')) >= 4.5);
check('safeHex expande #abc para 6 dígitos', safeHex('#abc', '#000000') === '#aabbcc');
check('safeHex recusa valor não-hex', safeHex('rgb(1,2,3)', '#123456') === '#123456');

// Um tema propositalmente ruim: bege claro sobre creme (texto sumiria).
const temaRuim = { primary: '#e8dcc8', secondary: '#f0e9dd', background: '#faf7f2', foreground: '#2b2724', radius: 'soft' as const };
const vars = themeToCssVars(temaRuim) as unknown as Record<string, string>;
check('tema ruim: texto de acento é escurecido até ficar legível no fundo',
  contrast(vars['--lume-primary-text'], temaRuim.background) >= 4.5,
  `contraste ${contrast(vars['--lume-primary-text'], temaRuim.background).toFixed(2)}`);
check('tema ruim: texto sobre o botão continua legível',
  contrast(vars['--lume-on-primary'], vars['--lume-primary']) >= 4.5,
  `contraste ${contrast(vars['--lume-on-primary'], vars['--lume-primary']).toFixed(2)}`);

// Todos os temas padrão dos templates precisam nascer legíveis.
for (const meta of SITE_TEMPLATES) {
  const v = themeToCssVars(meta.defaultTheme) as unknown as Record<string, string>;
  check(`tema padrão de "${meta.name}": botão legível`,
    contrast(v['--lume-on-primary'], v['--lume-primary']) >= 4.5,
    `contraste ${contrast(v['--lume-on-primary'], v['--lume-primary']).toFixed(2)}`);
  check(`tema padrão de "${meta.name}": corpo de texto legível no fundo`,
    contrast(meta.defaultTheme.foreground, meta.defaultTheme.background) >= 4.5,
    `contraste ${contrast(meta.defaultTheme.foreground, meta.defaultTheme.background).toFixed(2)}`);
}

// ============================================================================
// 4. Catálogo de templates
// ============================================================================

group('4. Catálogo de templates');

check('há pelo menos 5 templates registrados', SITE_TEMPLATES.length >= 5, String(SITE_TEMPLATES.length));
check('ids de template são únicos',
  new Set(SITE_TEMPLATES.map(t => t.id)).size === SITE_TEMPLATES.length);
check('todo template tem nome, categoria, descrição e público-alvo',
  SITE_TEMPLATES.every(t => t.name && t.category && t.description && t.bestFor));
check('todo template carrega fonte por https',
  SITE_TEMPLATES.every(t => t.fontsHref.startsWith('https://fonts.googleapis.com/')));
check('todo template tem miniatura com cores válidas',
  SITE_TEMPLATES.every(t => /^#[0-9a-f]{6}$/i.test(t.preview.background) && /^#[0-9a-f]{6}$/i.test(t.preview.accent)));
check('getTemplateMeta com id inexistente devolve um template válido (nunca quebra)',
  !!getTemplateMeta('template-que-nao-existe').id);
check('isValidTemplateId recusa id inventado', !isValidTemplateId('hacker-template'));

// Todo id registrado precisa existir no mapa do SiteRenderer.
const rendererSrc = fs.readFileSync(path.join(ROOT, 'components/site/SiteRenderer.tsx'), 'utf8');
const semComponente = SITE_TEMPLATES.filter(t => !rendererSrc.includes(`'${t.id}'`));
check('todo template registrado tem componente no SiteRenderer',
  semComponente.length === 0, semComponente.map(t => t.id).join(', '));

// Nenhum template pode ter dado de cliente escrito no código.
const tplDir = path.join(ROOT, 'components/site/templates');
const proibidos = [/wa\.me\/\d/, /5511\d{8}/, /Marina Alves/i, /Julia Roberta/i, /localhost:3000/];
const comHardcode: string[] = [];
for (const file of fs.readdirSync(tplDir)) {
  const src = fs.readFileSync(path.join(tplDir, file), 'utf8');
  // A checagem ignora o cabeçalho de comentário (que cita a origem do design).
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
  if (proibidos.some(re => re.test(code))) comHardcode.push(file);
}
check('nenhum template tem telefone, nome de cliente ou URL fixa no código',
  comHardcode.length === 0, comHardcode.join(', '));

// ============================================================================
// 5. Trocar de template não pode perder conteúdo
// ============================================================================

group('5. Troca de template preserva o conteúdo');

const cheio = defaultSiteConfig('editorial-nude', {
  name: 'Marina Alves', brand_name: 'Marina Nails', city: 'São Paulo - SP',
  whatsapp: '5511999990000', instagram: '@marinanails',
});
cheio.identity.photoUrl = 'https://ok.com/retrato.webp';
cheio.content.hero.imageUrl = 'https://ok.com/capa.webp';
cheio.content.about.imageUrl = 'https://ok.com/atelie.webp';
cheio.content.about.text = 'Minha história em dois parágrafos.\n\nSegundo parágrafo.';
cheio.content.gallery.items = [
  { id: 'g1', url: 'https://ok.com/1.webp', caption: 'Trabalho 1' },
  { id: 'g2', url: 'https://ok.com/2.webp', caption: 'Trabalho 2' },
];
cheio.content.testimonials.items = [{ id: 't1', name: 'Ana', photoUrl: '', text: 'Amei!', rating: 5 }];
cheio.content.faq.items = [{ id: 'f1', question: 'Dura quanto?', answer: '3 semanas.' }];
cheio.content.beforeAfter.items = [{ id: 'b1', beforeUrl: 'https://ok.com/a.webp', afterUrl: 'https://ok.com/b.webp', title: 'Lash', description: '' }];
cheio.sections.enabled.faq = true;
cheio.sections.enabled.beforeAfter = true;
cheio.sections.order = ['hero', 'services', 'gallery', 'about', 'testimonials', 'faq', 'stats', 'beforeAfter', 'location', 'contact'];

for (const destino of SITE_TEMPLATES.map(t => t.id)) {
  const trocado = normalizeConfig(cheio, destino);
  const ok =
    trocado.content.about.text === cheio.content.about.text &&
    trocado.content.gallery.items.length === 2 &&
    trocado.content.testimonials.items.length === 1 &&
    trocado.content.faq.items.length === 1 &&
    trocado.content.beforeAfter.items.length === 1 &&
    trocado.identity.whatsapp === '5511999990000' &&
    trocado.identity.instagram === 'marinanails' &&
    JSON.stringify(trocado.sections.order) === JSON.stringify(cheio.sections.order) &&
    trocado.theme.primary === cheio.theme.primary;
  check(`ao mudar para "${getTemplateMeta(destino).name}", nada do conteúdo se perde`, ok);
}

check('config de um template antigo/desconhecido ainda renderiza',
  !!normalizeConfig(cheio, 'template-aposentado').content.hero.headline);

// ============================================================================
// 6. Seções visíveis
// ============================================================================

group('6. Seções — nada de buraco na página');

const todas = SITE_TEMPLATES[0].supportedSections;
const vazio = defaultSiteConfig('editorial-nude');
const semNada = resolveVisibleSections(vazio, todas, { hasServices: false });
check('galeria vazia não aparece', !semNada.includes('gallery'));
check('sem depoimentos, a seção não aparece', !semNada.includes('testimonials'));
check('sem serviços cadastrados, a seção não aparece', !semNada.includes('services'));
check('antes/depois vem desligado por padrão', !semNada.includes('beforeAfter'));
check('a capa aparece sempre', semNada.includes('hero'));

const comTudo = resolveVisibleSections(cheio, todas, { hasServices: true });
check('com conteúdo, galeria aparece', comTudo.includes('gallery'));
check('com conteúdo, antes/depois aparece', comTudo.includes('beforeAfter'));
check('com serviços, a seção de serviços aparece', comTudo.includes('services'));
check('a ordem escolhida pela profissional é respeitada',
  comTudo.indexOf('services') < comTudo.indexOf('about'),
  comTudo.join(' > '));

const desligado = structuredClone(cheio);
desligado.sections.enabled.testimonials = false;
check('seção desligada some mesmo tendo conteúdo',
  !resolveVisibleSections(desligado, todas, { hasServices: true }).includes('testimonials'));

const templateLimitado = { ...SITE_TEMPLATES[0], supportedSections: ['hero', 'services'] as never };
check('seção não suportada pelo template é ignorada',
  resolveVisibleSections(cheio, templateLimitado.supportedSections, { hasServices: true }).length === 2);

// ============================================================================
// 7. Recorte público de serviço (dados privados)
// ============================================================================

group('7. Dados privados nunca chegam à página pública');

const servicoCompleto = {
  id: 'svc-1', professional_id: 'prof-secreto', name: 'Alongamento em gel',
  description: 'Descrição pública', duration_minutes: 120, price_cents: 15000,
  cost_cents: 4200, image_url: null, is_active: true, client_visible: true,
  created_at: 'x', updated_at: 'y',
};
const publico = toPublicService(servicoCompleto as never);
const chaves = Object.keys(publico).sort().join(',');

check('o serviço público tem exatamente 5 campos previstos',
  chaves === 'description,durationMinutes,id,imageUrl,name,priceCents', chaves);
check('custo interno (cost_cents) NÃO vai para a página',
  !JSON.stringify(publico).includes('4200') && !('cost_cents' in publico));
check('id da profissional NÃO vai junto do serviço',
  !JSON.stringify(publico).includes('prof-secreto'));
check('flags internas (is_active, client_visible) não vão para a página',
  !('is_active' in publico) && !('client_visible' in publico));

const lista = toPublicServices([
  servicoCompleto,
  { ...servicoCompleto, id: 'svc-2', is_active: false },
  { ...servicoCompleto, id: 'svc-3', client_visible: false },
] as never);
check('serviço desativado não aparece na página', !lista.some(s => s.id === 'svc-2'));
check('serviço marcado como interno não aparece na página', !lista.some(s => s.id === 'svc-3'));
check('serviço ativo e visível aparece', lista.some(s => s.id === 'svc-1'));

// O SiteConfig nunca pode guardar cópia de serviço/cliente/agendamento.
const configKeys = JSON.stringify(defaultSiteConfig('editorial-nude'));
check('SiteConfig não guarda preço, serviço, cliente nem agendamento',
  !/price_cents|service_id|client_id|appointment|amount_cents/.test(configKeys));

// ============================================================================
// 8. Banco (só com .env carregado) — leitura, isolamento e fallback
// ============================================================================

group('8. Banco de dados (leitura e fallback)');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log(c.yellow('SKIP  camada de banco (rode com: node --env-file=.env scripts/test-site.mts)'));
} else {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: profs, error: profErr } = await db
    .from('professionals').select('id, slug, name, status').limit(5);
  check('lê a tabela professionals (nada foi quebrado)', !profErr && Array.isArray(profs), profErr?.message);

  const { error: svcErr } = await db.from('services').select('id, name, price_cents').limit(1);
  check('lê a tabela services (nada foi quebrado)', !svcErr, svcErr?.message);

  const { error: apptErr } = await db.from('appointments').select('id, date, status').limit(1);
  check('lê a tabela appointments (nada foi quebrado)', !apptErr, apptErr?.message);

  const { error: siteErr } = await db.from('professional_sites').select('id').limit(1);
  const tabelaExiste = !siteErr;
  if (tabelaExiste) {
    check('tabela professional_sites existe (migração v30 aplicada)', true);

    // Isolamento: cada profissional tem no máximo UMA página (unique).
    const { data: rows } = await db.from('professional_sites').select('professional_id');
    const ids = (rows || []).map(r => r.professional_id);
    check('cada profissional tem no máximo uma página (unique respeitado)',
      new Set(ids).size === ids.length);

    // Nenhuma página publicada pode apontar para profissional inexistente.
    const { data: pubs } = await db
      .from('professional_sites').select('professional_id').eq('status', 'published');
    let orfas = 0;
    for (const p of pubs || []) {
      const { data } = await db.from('professionals').select('id').eq('id', p.professional_id).maybeSingle();
      if (!data) orfas++;
    }
    check('nenhuma página publicada aponta para profissional inexistente', orfas === 0);
  } else {
    console.log(c.yellow(`SKIP  professional_sites ainda não existe — rode supabase/migration_v30_professional_sites.sql`));
    check('sem a migração v30, a leitura falha de forma controlada (código 42P01/PGRST205)',
      /42P01|PGRST205|does not exist|schema cache/i.test(`${siteErr?.code} ${siteErr?.message}`),
      `${siteErr?.code}: ${siteErr?.message}`);
  }

  // Slugs existentes não podem colidir com rota do app.
  const { data: allSlugs } = await db.from('professionals').select('slug').is('deleted_at', null);
  const colidem = (allSlugs || []).map(r => r.slug).filter((s: string) => RESERVED_SLUGS.has((s || '').toLowerCase()));
  check('nenhum slug existente colide com rota reservada do app',
    colidem.length === 0, colidem.join(', '));

  const dup = (allSlugs || []).map((r: { slug: string }) => (r.slug || '').toLowerCase());
  check('não há slug duplicado (ignorando maiúsculas)',
    new Set(dup).size === dup.length);
}

// ============================================================================
// 9. Renderização real dos 6 templates (HTML de verdade, sem banco)
// ============================================================================

group('9. Renderização — os 6 templates desenham a mesma config');

const { renderToStaticMarkup } = await import('react-dom/server');
const React = (await import('react')).default;

const servicosDemo = toPublicServices([
  {
    id: 'svc-1', professional_id: 'prof-privado', name: 'Alongamento em gel',
    description: 'Modelagem sob medida com acabamento natural.',
    duration_minutes: 120, price_cents: 15000, cost_cents: 4237,
    image_url: null, is_active: true, client_visible: true, created_at: '', updated_at: '',
  },
  {
    id: 'svc-2', professional_id: 'prof-privado', name: 'Blindagem',
    description: null, duration_minutes: 60, price_cents: 9000, cost_cents: 1911,
    image_url: null, is_active: true, client_visible: true, created_at: '', updated_at: '',
  },
] as never);

for (const meta of SITE_TEMPLATES) {
  const modPath = {
    'editorial-nude': './components/site/templates/EditorialNude.tsx',
    'gold-premium': './components/site/templates/GoldPremium.tsx',
    'terracota': './components/site/templates/Terracota.tsx',
    'clinic-sage': './components/site/templates/ClinicSage.tsx',
    'editorial-bronze': './components/site/templates/EditorialBronze.tsx',
    'rose-champagne': './components/site/templates/RoseChampagne.tsx',
  }[meta.id];

  let html = '';
  let erro = '';
  try {
    const mod = await jiti.import<{ default: (p: unknown) => React.ReactElement }>(modPath!);
    const cfg = normalizeConfig(cheio, meta.id);
    const secoes = resolveVisibleSections(cfg, meta.supportedSections, { hasServices: true });
    html = renderToStaticMarkup(
      React.createElement(mod.default, {
        config: cfg, services: servicosDemo, sections: secoes, onBook: () => {}, preview: false,
      }),
    );
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  check(`${meta.name}: renderiza sem erro`, !!html && !erro, erro);
  if (!html) continue;

  check(`${meta.name}: mostra o título da capa`, html.includes(cheio.content.hero.headline));
  check(`${meta.name}: mostra o nome do serviço vindo da Lume`, html.includes('Alongamento em gel'));
  check(`${meta.name}: mostra o preço formatado do serviço`, /R\$\s?150/.test(html), 'preço não encontrado');
  check(`${meta.name}: mostra o depoimento`, html.includes('Amei!'));
  check(`${meta.name}: mostra a pergunta frequente`, html.includes('Dura quanto?'));
  check(`${meta.name}: NÃO vaza o custo interno do serviço`, !html.includes('4237') && !html.includes('1911'));
  check(`${meta.name}: NÃO vaza o id da profissional`, !html.includes('prof-privado'));
  check(`${meta.name}: tem exatamente um <h1>`, (html.match(/<h1/g) || []).length === 1,
    String((html.match(/<h1/g) || []).length));
  check(`${meta.name}: define as variáveis de tema no elemento raiz`, html.includes('--lume-primary'));
  check(`${meta.name}: imagens abaixo da dobra usam lazy loading`, html.includes('loading="lazy"'));
  check(`${meta.name}: imagem da capa carrega com prioridade`, html.includes('fetchpriority="high"') || html.includes('fetchPriority="high"'));
  check(`${meta.name}: todas as imagens têm alt`,
    (html.match(/<img/g) || []).length === (html.match(/alt="/g) || []).length,
    `${(html.match(/<img/g) || []).length} img x ${(html.match(/alt="/g) || []).length} alt`);
  check(`${meta.name}: o link do WhatsApp usa o número da profissional`, html.includes('wa.me/5511999990000'));
  check(`${meta.name}: links externos usam rel="noopener noreferrer"`,
    !html.includes('target="_blank"') || (html.match(/target="_blank"/g) || []).length <= (html.match(/noopener noreferrer/g) || []).length);
}

// ============================================================================
// 10. Concorrência de agendamento (migração v31) — precisa escrever no banco
// ============================================================================

group('10. Concorrência — duas clientes, o mesmo horário');

if (!url || !key) {
  console.log(c.yellow('SKIP  camada de concorrência (precisa do .env)'));
} else {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false } });

  // A função existe? (v31 aplicada)
  const probe = await db.rpc('lume_claim_slot', {
    p_professional_id: '00000000-0000-4000-a000-000000000000',
    p_service_id: null, p_service_ids: null, p_client_id: null,
    p_client_name: 'probe', p_client_whatsapp: '0', p_client_email: null,
    p_date: '2099-01-01', p_start_time: '00:00', p_end_time: '00:01',
    p_notes: null, p_payment_method: null, p_buffer_minutes: 0,
  });
  const funcFalta = /could not find the function|does not exist|PGRST202/i
    .test(`${probe.error?.code} ${probe.error?.message}`);

  if (funcFalta) {
    console.log(c.yellow('SKIP  lume_claim_slot ainda não existe — rode supabase/migration_v31_slot_lock.sql'));
    check('sem a v31, a chamada falha de forma controlada (o app cai no caminho antigo)',
      !!probe.error, 'esperava erro de função ausente');
  } else if (process.env.LUME_TEST_WRITE !== '1') {
    check('função lume_claim_slot existe (migração v31 aplicada)', true);
    console.log(c.yellow('SKIP  corrida real — grava e apaga um agendamento de teste.'));
    console.log(c.gray('      Para rodar: LUME_TEST_WRITE=1 node --env-file=.env scripts/test-site.mts'));
  } else {
    check('função lume_claim_slot existe (migração v31 aplicada)', true);

    // Data absurda no futuro: nunca colide com agenda real, e é apagada no fim.
    const DIA = '2099-12-31';
    const { data: prof } = await db
      .from('professionals').select('id').eq('status', 'active').is('deleted_at', null).limit(1).maybeSingle();

    if (!prof) {
      console.log(c.yellow('SKIP  nenhuma profissional ativa para testar'));
    } else {
      const tentar = (nome: string) => db.rpc('lume_claim_slot', {
        p_professional_id: prof.id, p_service_id: null, p_service_ids: null, p_client_id: null,
        p_client_name: nome, p_client_whatsapp: '5500000000000', p_client_email: null,
        p_date: DIA, p_start_time: '14:00', p_end_time: '15:00',
        p_notes: 'TESTE AUTOMATIZADO — pode apagar', p_payment_method: null, p_buffer_minutes: 15,
      });

      await db.from('appointments').delete().eq('professional_id', prof.id).eq('date', DIA);

      // Duas tentativas DISPARADAS JUNTAS no mesmo horário.
      const [a, b] = await Promise.all([tentar('Corrida A'), tentar('Corrida B')]);
      const ganhou = [a, b].filter(r => !r.error && r.data).length;
      const perdeu = [a, b].filter(r => /LUME_SLOT_TAKEN/.test(r.error?.message || '')).length;

      check('exatamente UMA das duas clientes simultâneas consegue o horário',
        ganhou === 1, `${ganhou} conseguiram`);
      check('a que perdeu recebe LUME_SLOT_TAKEN (vira mensagem amigável no app)',
        perdeu === 1, `${perdeu} recusadas`);

      const { count } = await db
        .from('appointments').select('id', { count: 'exact', head: true })
        .eq('professional_id', prof.id).eq('date', DIA).eq('start_time', '14:00:00');
      check('sobrou exatamente 1 agendamento gravado (sem double booking)', count === 1, `${count} linhas`);

      // Sobreposição parcial e respeito ao buffer
      const parcial = await db.rpc('lume_claim_slot', {
        p_professional_id: prof.id, p_service_id: null, p_service_ids: null, p_client_id: null,
        p_client_name: 'Parcial', p_client_whatsapp: '5500000000000', p_client_email: null,
        p_date: DIA, p_start_time: '14:30', p_end_time: '15:30',
        p_notes: 'TESTE', p_payment_method: null, p_buffer_minutes: 15,
      });
      check('sobreposição parcial (14:30 sobre 14:00-15:00) é recusada',
        /LUME_SLOT_TAKEN/.test(parcial.error?.message || ''));

      const dentroBuffer = await db.rpc('lume_claim_slot', {
        p_professional_id: prof.id, p_service_id: null, p_service_ids: null, p_client_id: null,
        p_client_name: 'Buffer', p_client_whatsapp: '5500000000000', p_client_email: null,
        p_date: DIA, p_start_time: '15:10', p_end_time: '16:00',
        p_notes: 'TESTE', p_payment_method: null, p_buffer_minutes: 15,
      });
      check('horário dentro do intervalo entre atendimentos é recusado',
        /LUME_SLOT_TAKEN/.test(dentroBuffer.error?.message || ''));

      const depoisBuffer = await db.rpc('lume_claim_slot', {
        p_professional_id: prof.id, p_service_id: null, p_service_ids: null, p_client_id: null,
        p_client_name: 'Livre', p_client_whatsapp: '5500000000000', p_client_email: null,
        p_date: DIA, p_start_time: '15:15', p_end_time: '16:00',
        p_notes: 'TESTE', p_payment_method: null, p_buffer_minutes: 15,
      });
      check('logo após o intervalo, o horário é liberado', !depoisBuffer.error);

      // Faxina — não deixa nada do teste na agenda.
      const { error: limpezaErr } = await db
        .from('appointments').delete().eq('professional_id', prof.id).eq('date', DIA);
      const { count: sobrou } = await db
        .from('appointments').select('id', { count: 'exact', head: true })
        .eq('professional_id', prof.id).eq('date', DIA);
      check('agendamentos de teste foram removidos da agenda',
        !limpezaErr && sobrou === 0, `${sobrou} sobraram`);
    }
  }
}

// ============================================================================
// Resultado
// ============================================================================

console.log(`\n${c.bold('RESULTADO')}  ${c.green(`${pass} PASS`)}  ${fail ? c.red(`${fail} FAIL`) : c.gray('0 FAIL')}`);
if (fail) {
  console.log(c.red('\nFalhas:'));
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
