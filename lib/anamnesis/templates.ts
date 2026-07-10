import { AnamnesisQuestion } from '@/types/database';

/**
 * Modelos de ficha de anamnese prontos (padrão de mercado da beleza/estética).
 * A profissional escolhe um modelo como ponto de partida e pode editar tudo
 * no construtor antes de salvar — ou começar do zero.
 *
 * Puro (sem dependências de servidor) — usado no client e no server.
 */

export interface AnamnesisTemplate {
  id: string;
  name: string;
  description: string;
  questions: AnamnesisQuestion[];
}

// IDs estáveis por template ajudam a montar o builder; ao criar a ficha
// real eles são regenerados para evitar colisão entre fichas.
const q = (
  id: string,
  label: string,
  type: AnamnesisQuestion['type'],
  extra?: { options?: string[]; required?: boolean }
): AnamnesisQuestion => ({ id, label, type, ...extra });

const SAUDE_GERAL: AnamnesisQuestion[] = [
  q('nome-completo', 'Nome completo', 'text', { required: true }),
  q('nascimento', 'Data de nascimento', 'date'),
  q('gestante', 'Está gestante ou amamentando?', 'yesno', { required: true }),
  q('alergias', 'Possui alguma alergia (medicamentos, cosméticos, látex, esmaltes)? Quais?', 'textarea', { required: true }),
  q('medicamentos', 'Faz uso contínuo de algum medicamento? Quais?', 'textarea'),
  q('doencas', 'Possui alguma dessas condições?', 'multiselect', {
    options: ['Diabetes', 'Hipertensão', 'Problemas circulatórios', 'Problemas de tireoide', 'Epilepsia', 'Doença autoimune', 'Nenhuma'],
  }),
  q('cirurgia', 'Passou por alguma cirurgia recente (últimos 12 meses)?', 'yesno'),
  q('observacoes-saude', 'Alguma outra informação de saúde importante?', 'textarea'),
];

export const ANAMNESIS_TEMPLATES: AnamnesisTemplate[] = [
  {
    id: 'geral',
    name: 'Anamnese Geral (Saúde)',
    description: 'Ficha base com histórico de saúde — serve para qualquer procedimento de beleza.',
    questions: [
      ...SAUDE_GERAL,
      q('autorizacao-imagem', 'Autoriza o uso de fotos do antes/depois para divulgação?', 'yesno'),
    ],
  },
  {
    id: 'facial',
    name: 'Anamnese Facial / Estética Facial',
    description: 'Limpeza de pele, peelings, microagulhamento, skincare e tratamentos faciais.',
    questions: [
      ...SAUDE_GERAL,
      q('tipo-pele', 'Como você descreve sua pele?', 'select', {
        options: ['Oleosa', 'Seca', 'Mista', 'Normal', 'Sensível'],
      }),
      q('acido', 'Está usando ácidos, retinol ou fez peeling nos últimos 30 dias?', 'yesno', { required: true }),
      q('roacutan', 'Usou isotretinoína (Roacutan) nos últimos 6 meses?', 'yesno', { required: true }),
      q('exposicao-sol', 'Se expõe ao sol com frequência? Usa protetor solar diariamente?', 'textarea'),
      q('procedimentos-previos', 'Já fez procedimentos estéticos no rosto (botox, preenchimento, laser)? Quais e quando?', 'textarea'),
      q('queixa', 'Qual é a sua principal queixa ou objetivo com o tratamento?', 'textarea', { required: true }),
    ],
  },
  {
    id: 'cilios-sobrancelhas',
    name: 'Anamnese de Cílios e Sobrancelhas',
    description: 'Extensão de cílios, lash lifting, brow lamination, design e henna.',
    questions: [
      ...SAUDE_GERAL,
      q('alergia-cosmeticos', 'Já teve reação alérgica a henna, tintura ou cola de cílios?', 'yesno', { required: true }),
      q('lentes', 'Usa lentes de contato?', 'yesno'),
      q('colirios', 'Usa colírios ou tem alguma condição nos olhos (conjuntivite, blefarite, terçol frequente)?', 'textarea'),
      q('extensao-previa', 'Já fez extensão de cílios ou lash lifting antes? Como foi a experiência?', 'textarea'),
      q('estilo', 'Qual efeito você prefere?', 'select', {
        options: ['Natural', 'Boneca', 'Esquilo', 'Gatinho', 'Volume russo', 'Não sei, quero indicação'],
      }),
    ],
  },
  {
    id: 'corporal',
    name: 'Anamnese Corporal / Massoterapia',
    description: 'Massagens, drenagem linfática, tratamentos corporais e pós-operatório.',
    questions: [
      ...SAUDE_GERAL,
      q('trombose', 'Tem histórico de trombose ou varizes graves?', 'yesno', { required: true }),
      q('marcapasso', 'Usa marca-passo ou possui próteses metálicas?', 'yesno'),
      q('lesoes', 'Possui lesões de pele, hematomas ou dores em alguma região do corpo?', 'textarea'),
      q('pos-operatorio', 'Está em pós-operatório? De qual cirurgia e há quanto tempo?', 'textarea'),
      q('atividade-fisica', 'Pratica atividade física? Com que frequência?', 'text'),
      q('agua', 'Quantos copos de água bebe por dia, aproximadamente?', 'number'),
      q('objetivo-corporal', 'Qual é o seu principal objetivo com o tratamento?', 'textarea', { required: true }),
    ],
  },
  {
    id: 'unhas',
    name: 'Anamnese de Manicure / Alongamento',
    description: 'Manicure, pedicure, alongamento em gel, fibra e esmaltação em gel.',
    questions: [
      q('nome-completo', 'Nome completo', 'text', { required: true }),
      q('gestante', 'Está gestante ou amamentando?', 'yesno'),
      q('alergia-esmalte', 'Já teve alergia a esmalte, gel ou acrílico?', 'yesno', { required: true }),
      q('micose', 'Tem ou já teve micose, fungos ou unha encravada?', 'yesno', { required: true }),
      q('roer', 'Tem hábito de roer unhas ou tirar cutícula?', 'yesno'),
      q('diabetes-unhas', 'Tem diabetes ou problemas de cicatrização?', 'yesno', { required: true }),
      q('alongamento-previo', 'Já usou alongamento antes? Qual técnica?', 'text'),
      q('formato', 'Qual formato de unha prefere?', 'select', {
        options: ['Quadrada', 'Amendoada', 'Bailarina', 'Stiletto', 'Redonda', 'Não sei, quero indicação'],
      }),
    ],
  },
];

/** Gera um ID curto e único para pergunta (usado no builder e ao clonar templates). */
export function newQuestionId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Clona as perguntas de um template com IDs novos (evita colisão entre fichas). */
export function cloneTemplateQuestions(questions: AnamnesisQuestion[]): AnamnesisQuestion[] {
  return questions.map(question => ({ ...question, options: question.options ? [...question.options] : undefined, id: newQuestionId() }));
}
