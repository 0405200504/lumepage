import { Inter, Hanken_Grotesk } from 'next/font/google';

/**
 * Tipografia do produto inteiro (painel, admin, salão, login, agendamento):
 * Inter no corpo e na interface, Hanken Grotesk nos títulos — a grotesca
 * gratuita mais próxima da Neue Montreal (comercial). A LP e o paywall têm a
 * tipografia deles (lib/lp/fonts.ts), em escopo próprio.
 *
 * As variáveis vão no <html> (app/layout.tsx) e os tokens de app/styles/
 * tokens.css apontam para elas. Precisam estar no :root: um token resolvido
 * lá dentro com a variável ausente vira "guaranteed-invalid".
 *
 * `preload: false` de propósito: o layout raiz também embrulha a LP, e lá
 * estas fontes seriam download à toa, competindo com as da LP. Sem preload, o
 * arquivo só desce quando um texto usa a família; o next/font ainda gera o
 * fallback com métricas ajustadas, então a troca não mexe no layout.
 */

// Variáveis: um arquivo cobre todos os pesos (o painel usa de 400 a 800).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
  preload: false,
});

/** Classes das duas variáveis de fonte, para o <html>. */
export const fontVars = `${inter.variable} ${hanken.variable}`;
