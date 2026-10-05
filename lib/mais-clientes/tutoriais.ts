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
  /** O que a IA deve procurar no print. */
  criterio: string;
  passos: string[];
}

export const ITENS_INSTAGRAM: ItemDiagnostico[] = [
  {
    id: 'foto', titulo: 'Foto de perfil',
    porque: 'É a primeira coisa que a cliente vê no anúncio e na busca.',
    criterio: 'Rosto da profissional nítido, iluminado e centralizado (ou logo legível). Ruim: foto escura, de longe, com várias pessoas ou cortada.',
    passos: ['Abra o Instagram e toque na sua foto, no canto de baixo à direita.', 'Toque em "Editar perfil".', 'Toque em "Editar foto ou avatar" e escolha a foto nova.', 'Confirme. A foto aparece em todos os lugares na hora.'],
  },
  {
    id: 'nome', titulo: 'Nome com o que você faz e a cidade',
    porque: 'O campo Nome entra na busca do Instagram: quem pesquisa "lash lifting Cerquilho" encontra você.',
    criterio: 'O campo Nome (em negrito, acima da bio) deve ter o serviço principal e a cidade. Ruim: só o nome próprio.',
    passos: ['No seu perfil, toque em "Editar perfil".', 'Toque em "Nome".', 'Escreva no formato sugerido abaixo.', 'Toque no ✓ para salvar. O Instagram deixa trocar o nome só 2 vezes a cada 14 dias.'],
  },
  {
    id: 'bio', titulo: 'Bio: o que você faz, onde e como agendar',
    porque: 'Quem chega pelo anúncio decide em segundos se fica.',
    criterio: 'A bio diz o serviço, a cidade ou bairro, um diferencial ou prova (anos, atendimentos) e uma chamada para agendar. Ruim: frase genérica ou só emojis.',
    passos: ['No seu perfil, toque em "Editar perfil".', 'Toque em "Bio".', 'Apague o texto atual e cole a bio sugerida abaixo.', 'Toque no ✓ para salvar.'],
  },
  {
    id: 'link', titulo: 'Link de agendamento',
    porque: 'Sem link, a cliente precisa chamar e esperar resposta; com link, agenda na hora.',
    criterio: 'Existe link na bio e ele leva para agendamento ou página com agendamento. Ruim: sem link ou link quebrado.',
    passos: ['Toque em "Editar perfil" e depois em "Links".', 'Toque em "Adicionar link externo".', 'Cole o link da sua Minha Página do Lume e dê o título "Agende aqui".', 'Salve e teste tocando no link do seu perfil.'],
  },
  {
    id: 'contato', titulo: 'Botão de WhatsApp e endereço',
    porque: 'O botão de contato encurta o caminho até a conversa.',
    criterio: 'Há botões de contato (WhatsApp, ligar, como chegar) abaixo da bio. Ruim: nenhum botão.',
    passos: ['Toque em "Editar perfil".', 'Role até "Informações públicas da empresa" e toque em "Opções de contato".', 'Adicione seu WhatsApp e o endereço do seu espaço.', 'Salve. Os botões aparecem embaixo da bio.'],
  },
  {
    id: 'categoria', titulo: 'Categoria aparecendo',
    porque: 'Mostra de cara que é um negócio de beleza, não um perfil pessoal.',
    criterio: 'Aparece a categoria (ex.: Esteticista, Salão de beleza) logo abaixo do nome. Ruim: sem categoria ou categoria errada.',
    passos: ['Toque em "Editar perfil" e depois em "Categoria".', 'Escolha a que mais combina com o seu serviço principal.', 'Ative "Exibir categoria no perfil" e salve.'],
  },
  {
    id: 'destaques', titulo: 'Destaques organizados',
    porque: 'Os destaques respondem as dúvidas antes da cliente perguntar.',
    criterio: 'Há destaques com capas organizadas cobrindo resultados, valores, como agendar, localização e depoimentos. Ruim: sem destaques ou destaques soltos sem nome.',
    passos: ['Poste um story com o conteúdo (ex.: tabela de valores).', 'Abra o story e toque em "Destacar" (o coração).', 'Toque em "Novo", dê o nome (ex.: "Valores") e confirme.', 'Para a capa: abra o destaque, toque em "Editar destaque" e em "Editar capa".', 'Repita para Resultados, Como agendar, Localização e Depoimentos.'],
  },
  {
    id: 'fixados', titulo: '3 posts fixados',
    porque: 'São os três primeiros quadrados que a cliente vê no seu feed.',
    criterio: 'Há posts fixados no topo do feed mostrando resultado, depoimento e como agendar ou oferta. Ruim: nenhum fixado.',
    passos: ['Abra o post que quer fixar.', 'Toque nos três pontinhos, no canto de cima.', 'Toque em "Fixar no seu perfil".', 'Fixe três: um resultado, um depoimento e um de "como agendar".'],
  },
  {
    id: 'feed', titulo: 'Resultados reais no feed',
    porque: 'A cliente compra o que vê: resultado real, sem filtro, vende mais que arte bonita.',
    criterio: 'O feed mostra resultados reais do trabalho (antes e depois, close) com frequência. Ruim: feed só com artes, frases ou fotos pessoais.',
    passos: ['Separe 5 resultados recentes (as fotos que você mandou aqui servem).', 'Poste um por semana, sem filtro, com legenda curta: serviço, cidade e como agendar.', 'Quando tiver antes e depois, use carrossel: primeiro o depois, depois o antes.'],
  },
];

export const ITENS_GOOGLE: ItemDiagnostico[] = [
  {
    id: 'categoria', titulo: 'Categoria principal certa',
    porque: 'É a categoria que decide para quais buscas o Google mostra você.',
    criterio: 'A categoria principal bate com o serviço que ela mais quer vender. Ruim: categoria genérica ou errada.',
    passos: ['Abra o app do Google Maps, toque na sua foto e em "Seu Perfil da Empresa".', 'Toque em "Editar perfil" e em "Informações da empresa".', 'Toque em "Categoria da empresa" e escolha a principal.', 'Adicione as categorias dos outros serviços como secundárias e salve.'],
  },
  {
    id: 'descricao', titulo: 'Descrição com serviços e cidade',
    porque: 'A descrição ajuda o Google a entender o que você faz e convence quem lê.',
    criterio: 'Existe descrição citando os serviços, a cidade e um diferencial. Ruim: vazia ou genérica.',
    passos: ['No Perfil da Empresa, toque em "Editar perfil".', 'Toque em "Descrição".', 'Cole a descrição sugerida abaixo (até 750 caracteres) e salve.'],
  },
  {
    id: 'horarios', titulo: 'Horário de funcionamento',
    porque: 'Sem horário, o Google mostra "horário desconhecido" e a cliente desiste.',
    criterio: 'Horários preenchidos. Ruim: sem horário ou "horário desconhecido".',
    passos: ['Toque em "Editar perfil" e em "Horário".', 'Marque os dias e horários em que você atende (os mesmos do Lume).', 'Salve.'],
  },
  {
    id: 'contato', titulo: 'WhatsApp e link de agendamento',
    porque: 'É o que transforma a visita no Google em conversa ou agendamento.',
    criterio: 'Telefone (de preferência o WhatsApp) e site ou link de agendamento preenchidos. Ruim: sem telefone ou sem link.',
    passos: ['Toque em "Editar perfil" e em "Contato".', 'Coloque seu WhatsApp como telefone.', 'Em "Site", cole o link da sua Minha Página do Lume.', 'Se aparecer a opção "Links de agendamento", cole o mesmo link lá. Salve.'],
  },
  {
    id: 'servicos', titulo: 'Serviços com preço',
    porque: 'Serviço com preço no Google aparece na busca e já filtra quem pode pagar.',
    criterio: 'A lista de serviços está preenchida, de preferência com preço. Ruim: sem serviços.',
    passos: ['Toque em "Editar perfil" e em "Serviços".', 'Adicione cada serviço com nome, preço e uma frase de descrição.', 'Salve.'],
  },
  {
    id: 'fotos', titulo: 'Fotos do espaço e dos resultados',
    porque: 'Perfil com fotos recebe muito mais pedidos de rota e cliques.',
    criterio: 'Há pelo menos 10 fotos: fachada ou entrada, ambiente, a profissional atendendo e resultados. Ruim: poucas fotos ou só logo.',
    passos: ['No Perfil da Empresa, toque em "Adicionar fotos".', 'Envie: entrada, ambiente, você atendendo e resultados (as fotos que você mandou aqui servem).', 'Chegue a pelo menos 10 fotos e adicione uma nova por mês.'],
  },
  {
    id: 'avaliacoes', titulo: 'Avaliações e respostas',
    porque: 'Nota e quantidade de avaliações decidem quem a cliente escolhe no mapa.',
    criterio: 'Tem avaliações recentes (idealmente 20 ou mais, nota 4,7+) e as avaliações são respondidas. Ruim: poucas avaliações ou nenhuma resposta.',
    passos: ['No Perfil da Empresa, toque em "Pedir avaliações" e copie o link.', 'Mande o link pelo WhatsApp depois de cada atendimento (o Lume pode mandar sozinho nas mensagens automáticas).', 'Responda toda avaliação em até 2 dias, agradecendo pelo nome.'],
  },
  {
    id: 'posts', titulo: 'Atualizações recentes',
    porque: 'Post recente mostra que o negócio está ativo e aparece no seu perfil.',
    criterio: 'Há atualizações (posts) recentes no perfil. Ruim: nenhuma atualização nos últimos meses.',
    passos: ['Toque em "Adicionar atualização".', 'Poste um resultado ou uma oferta, com o link de agendamento.', 'Repita uma vez por semana.'],
  },
];

export const itensDe = (plataforma: 'instagram' | 'google') => plataforma === 'instagram' ? ITENS_INSTAGRAM : ITENS_GOOGLE;
