/**
 * Itens que o diagnóstico avalia e o passo a passo de cada um.
 *
 * Os passos são FIXOS, escritos aqui, e não gerados pela IA: a IA erra nome de
 * botão com facilidade, e um tutorial que manda tocar num botão que não existe
 * faz a profissional desistir. A IA só diz o que viu no print e sugere o texto
 * (bio, nome, descrição) que vai no lugar.
 */

export interface ItemDiagnostico {
  id: string;
  titulo: string;
  /** Por que importa, em uma frase. */
  porque: string;
  /**
   * Régua do item. Começa pelo que já conta como BOM: a IA marca "ok" sempre
   * que o perfil atende isso, mesmo que dê para melhorar um detalhe (aí vira
   * "dica", que não tira nota).
   */
  criterio: string;
  /** Onde o item aparece, para pedir o print certo quando ele não estiver visível. */
  ondeVer: string;
  passos: string[];
  /**
   * Item de peso leve: no máximo vira "dica" (nunca tira nota). Ex.: publicações
   * no Google, que não fazem a cliente desistir de agendar.
   */
  soDica?: boolean;
}

export const ITENS_INSTAGRAM: ItemDiagnostico[] = [
  {
    id: 'foto', titulo: 'Foto de perfil',
    porque: 'É a primeira coisa que a cliente vê no anúncio e na busca.',
    criterio: 'OK: rosto da profissional nítido e iluminado, ou logo legível. AJUSTAR só se estiver escura, de longe, cortada ou com várias pessoas.',
    ondeVer: 'No topo do perfil.',
    passos: ['Abra o Instagram e toque na sua foto, no canto de baixo à direita.', 'Toque em "Editar perfil".', 'Toque em "Editar foto ou avatar" e escolha a foto nova.', 'Confirme. A foto aparece em todos os lugares na hora.'],
  },
  {
    id: 'nome', titulo: 'Nome com o que você faz e a cidade',
    porque: 'O campo Nome entra na busca do Instagram: quem pesquisa "lash lifting Cerquilho" encontra você.',
    criterio: 'OK: o campo Nome (em negrito, acima da bio) traz o serviço principal ou o nicho (sobrancelha, cílios, unhas, estética...) E a cidade. Não exija formato exato nem nome completo. AJUSTAR só se tiver apenas o nome próprio ou a marca, sem serviço ou sem cidade.',
    ondeVer: 'No topo do perfil, em negrito, logo abaixo do @.',
    passos: ['No seu perfil, toque em "Editar perfil".', 'Toque em "Nome".', 'Escreva no formato sugerido abaixo.', 'Toque no ✓ para salvar. O Instagram deixa trocar o nome só 2 vezes a cada 14 dias.'],
  },
  {
    id: 'bio', titulo: 'Bio: o que você faz, onde e como agendar',
    porque: 'Quem chega pelo anúncio decide em segundos se fica.',
    criterio: 'OK: a bio deixa claro o que ela faz e tem pelo menos uma prova (resultado, anos, atendimentos, alunas, avaliações) ou uma chamada para agendar/clicar. Se a bio também fala com alunas ou parcerias, isso é escolha dela: no máximo DICA de abrir pelo serviço para cliente. AJUSTAR só se não dá para entender o que ela faz.',
    ondeVer: 'No topo do perfil, abaixo do nome.',
    passos: ['No seu perfil, toque em "Editar perfil".', 'Toque em "Bio".', 'Apague o texto atual e cole a bio sugerida abaixo.', 'Toque no ✓ para salvar.'],
  },
  {
    id: 'link', titulo: 'Link de agendamento',
    porque: 'Sem link, a cliente precisa chamar e esperar resposta; com link, agenda na hora.',
    criterio: 'OK: existe link na bio levando para site, página, agendamento ou WhatsApp dela. NÃO peça para trocar por outro link se já existe um. FALTA só se não há link nenhum.',
    ondeVer: 'Abaixo da bio, em azul.',
    passos: ['Toque em "Editar perfil" e depois em "Links".', 'Toque em "Adicionar link externo".', 'Cole o link da sua Minha Página do Lume e dê o título "Agende aqui".', 'Salve e teste tocando no link do seu perfil.'],
  },
  {
    id: 'contato', titulo: 'Botão de WhatsApp e endereço',
    porque: 'O botão de contato encurta o caminho até a conversa.',
    criterio: 'OK: existe um jeito de falar com ela pelo perfil (botão Mensagem, Contato, WhatsApp, E-mail ou Como chegar). Se só existe o botão Mensagem, é DICA adicionar o WhatsApp. FALTA só se não há nenhum botão de contato.',
    ondeVer: 'Na fileira de botões abaixo da bio.',
    passos: ['Toque em "Editar perfil".', 'Role até "Informações públicas da empresa" e toque em "Opções de contato".', 'Adicione seu WhatsApp e o endereço do seu espaço.', 'Salve. Os botões aparecem embaixo da bio.'],
  },
  {
    id: 'categoria', titulo: 'Categoria aparecendo',
    porque: 'Mostra de cara que é um negócio de beleza, não um perfil pessoal.',
    criterio: 'OK: aparece a categoria (ex.: Esteticista) abaixo do nome, OU o nome/bio já deixam claro que é negócio de beleza. Item de baixo impacto: no máximo DICA.',
    ondeVer: 'Abaixo do nome, em cinza, quando a opção de exibir está ligada.',
    passos: ['Toque em "Editar perfil" e depois em "Categoria".', 'Escolha a que mais combina com o seu serviço principal.', 'Ative "Exibir categoria no perfil" e salve.'],
  },
  {
    id: 'destaques', titulo: 'Destaques organizados',
    porque: 'Os destaques respondem as dúvidas antes da cliente perguntar.',
    criterio: 'OK: há destaques com nomes que ajudam a cliente (serviços, resultados, depoimentos/feedback, valores, como agendar), com capas padronizadas. Não exija todos os temas: faltar um tema é DICA. FALTA só se não há destaques.',
    ondeVer: 'A fileira de círculos abaixo dos botões.',
    passos: ['Poste um story com o conteúdo (ex.: tabela de valores).', 'Abra o story e toque em "Destacar" (o coração).', 'Toque em "Novo", dê o nome (ex.: "Valores") e confirme.', 'Para a capa: abra o destaque, toque em "Editar destaque" e em "Editar capa".', 'Repita para Resultados, Como agendar, Localização e Depoimentos.'],
  },
  {
    id: 'fixados', titulo: '3 posts fixados',
    porque: 'São os três primeiros quadrados que a cliente vê no seu feed.',
    criterio: 'OK: há pelo menos um post fixado (ícone de alfinete) e algum deles mostra o trabalho ou resultado. DICA se nenhum fixado mostra resultado. FALTA só se não há post fixado.',
    ondeVer: 'Os primeiros quadrados do feed, com o ícone de alfinete.',
    passos: ['Abra o post que quer fixar.', 'Toque nos três pontinhos, no canto de cima.', 'Toque em "Fixar no seu perfil".', 'Fixe três: um resultado, um depoimento e um de "como agendar".'],
  },
  {
    id: 'feed', titulo: 'Resultados reais no feed',
    porque: 'A cliente compra o que vê: resultado real, sem filtro, vende mais que arte bonita.',
    criterio: 'OK: aparecem resultados reais do trabalho entre os posts visíveis. AJUSTAR só se o feed visível não mostra trabalho nenhum (só frases, artes ou fotos pessoais).',
    ondeVer: 'O começo do feed, abaixo dos destaques.',
    passos: ['Separe 5 resultados recentes (as fotos que você mandou aqui servem).', 'Poste um por semana, sem filtro, com legenda curta: serviço, cidade e como agendar.', 'Quando tiver antes e depois, use carrossel: primeiro o depois, depois o antes.'],
  },
];

export const ITENS_GOOGLE: ItemDiagnostico[] = [
  {
    id: 'categoria', titulo: 'Categoria principal certa',
    porque: 'É a categoria que decide para quais buscas o Google mostra você.',
    criterio: 'OK: a categoria é de beleza ou estética (Salão de beleza, Esteticista, Designer de sobrancelhas etc.). Categoria mais específica para o serviço principal é DICA. AJUSTAR só se a categoria é de outro ramo.',
    ondeVer: 'Abaixo do nome e da nota, em cinza.',
    passos: ['Abra o app do Google Maps, toque na sua foto e em "Seu Perfil da Empresa".', 'Toque em "Editar perfil" e em "Informações da empresa".', 'Toque em "Categoria da empresa" e escolha a principal.', 'Adicione as categorias dos outros serviços como secundárias e salve.'],
  },
  {
    id: 'descricao', titulo: 'Descrição com serviços e cidade',
    porque: 'A descrição ajuda o Google a entender o que você faz e convence quem lê.',
    criterio: 'Só avalie se a descrição aparece no print (fica na aba Sobre). Não aparecendo, é NÃO VISTO. OK: cita serviços e cidade.',
    ondeVer: 'Na aba "Sobre" do perfil no Google.',
    passos: ['No Perfil da Empresa, toque em "Editar perfil".', 'Toque em "Descrição".', 'Cole a descrição sugerida abaixo (até 750 caracteres) e salve.'],
  },
  {
    id: 'horarios', titulo: 'Horário de funcionamento',
    porque: 'Sem horário, o Google mostra "horário desconhecido" e a cliente desiste.',
    criterio: 'OK: há horário (aberto/fechado, abre às...). FALTA só se aparece "horário desconhecido" ou nenhum horário.',
    ondeVer: 'Logo abaixo do endereço.',
    passos: ['Toque em "Editar perfil" e em "Horário".', 'Marque os dias e horários em que você atende (os mesmos do Lume).', 'Salve.'],
  },
  {
    id: 'contato', titulo: 'WhatsApp e link de agendamento',
    porque: 'É o que transforma a visita no Google em conversa ou agendamento.',
    criterio: 'OK: há telefone E site ou link. DICA se falta um dos dois. FALTA se não há nenhum.',
    ondeVer: 'Na lista abaixo do endereço (telefone e site).',
    passos: ['Toque em "Editar perfil" e em "Contato".', 'Coloque seu WhatsApp como telefone.', 'Em "Site", cole o link da sua Minha Página do Lume.', 'Se aparecer a opção "Links de agendamento", cole o mesmo link lá. Salve.'],
  },
  {
    id: 'servicos', titulo: 'Serviços com preço',
    porque: 'Serviço com preço no Google aparece na busca e já filtra quem pode pagar.',
    criterio: 'OK: aparece a entrada Serviços (lista ou link de serviços). Preço é DICA. NÃO VISTO se o print não mostra essa parte.',
    ondeVer: 'Na lista abaixo do endereço, ou na aba Serviços.',
    passos: ['Toque em "Editar perfil" e em "Serviços".', 'Adicione cada serviço com nome, preço e uma frase de descrição.', 'Salve.'],
  },
  {
    id: 'fotos', titulo: 'Fotos do espaço e dos resultados',
    porque: 'Perfil com fotos recebe muito mais pedidos de rota e cliques.',
    criterio: 'OK: há fotos do proprietário mostrando o trabalho, o espaço ou a profissional (a seção Fotos e vídeos com categorias como Do proprietário, Vídeos). Não conte fotos que não aparecem. DICA se só aparece um tipo de foto.',
    ondeVer: 'Na seção "Fotos e vídeos".',
    passos: ['No Perfil da Empresa, toque em "Adicionar fotos".', 'Envie: entrada, ambiente, você atendendo e resultados (as fotos que você mandou aqui servem).', 'Chegue a pelo menos 10 fotos e adicione uma nova por mês.'],
  },
  {
    id: 'avaliacoes', titulo: 'Avaliações e respostas',
    porque: 'Nota e quantidade de avaliações decidem quem a cliente escolhe no mapa.',
    criterio: 'OK: nota 4,7 ou mais com 20 avaliações ou mais. As respostas ficam na aba Avaliações: se não aparecem, não penalize. AJUSTAR se tem menos de 20 avaliações ou nota abaixo de 4,5.',
    ondeVer: 'Ao lado do nome (nota e quantidade) e na aba Avaliações.',
    passos: ['No Perfil da Empresa, toque em "Pedir avaliações" e copie o link.', 'Mande o link pelo WhatsApp depois de cada atendimento (o Lume pode mandar sozinho nas mensagens automáticas).', 'Responda toda avaliação em até 2 dias, agradecendo pelo nome.'],
  },
  {
    id: 'posts', titulo: 'Atualizações recentes',
    porque: 'Post recente mostra que o negócio está ativo e aparece no seu perfil.',
    criterio: 'São as PUBLICAÇÕES da empresa, na seção com o título "Atualizações" ou "Novidades da empresa". Atenção: "Atualizado por esta empresa há X semanas", ao lado do horário, fala do HORÁRIO e não conta aqui. Se a seção de publicações não aparece no print, é NÃO VISTO. OK: há publicação nos últimos 2 meses. DICA: a última publicação é mais antiga ou não há nenhuma.',
    ondeVer: 'Mais abaixo no perfil, na seção "Atualizações".',
    passos: ['Toque em "Adicionar atualização".', 'Poste um resultado ou uma oferta, com o link de agendamento.', 'Repita uma vez por semana.'],
    soDica: true,
  },
];

export const itensDe = (plataforma: 'instagram' | 'google') => plataforma === 'instagram' ? ITENS_INSTAGRAM : ITENS_GOOGLE;
