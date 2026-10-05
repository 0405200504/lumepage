// Calibração do diagnóstico do "Quero mais clientes": roda a IA de verdade em
// prints reais e mostra item por item, com a evidência que ela usou.
//
// Como rodar:
//   node --env-file=.env scripts/calibrar-diagnostico.mts instagram print1.png [print2.png]
//   node --env-file=.env scripts/calibrar-diagnostico.mts google print1.png print2.png
//   DIAGNOSTICO_MODELO=gpt-4o node --env-file=.env scripts/calibrar-diagnostico.mts ...
//
import fs from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';

const ROOT = process.cwd();
const jiti = createJiti(ROOT + '/', { alias: { '@': ROOT } });
const D = await jiti.import<typeof import('../lib/mais-clientes/diagnostico')>('./lib/mais-clientes/diagnostico.ts');

const [plataforma, ...arquivos] = process.argv.slice(2);
if ((plataforma !== 'instagram' && plataforma !== 'google') || !arquivos.length) {
  console.log('uso: calibrar-diagnostico.mts instagram|google print1.png [print2.png ...]');
  process.exit(1);
}
const mime = (f: string) => (/\.jpe?g$/i.test(f) ? 'image/jpeg' : /\.webp$/i.test(f) ? 'image/webp' : 'image/png');
const prints = arquivos.map(f => ({ bytes: new Uint8Array(fs.readFileSync(f)), mime: mime(f) }));
const ctx = {
  nome: process.env.CAL_NOME || 'Profissional', cidade: process.env.CAL_CIDADE || '',
  servicos: (process.env.CAL_SERVICOS || '').split(',').filter(Boolean), diferenciais: process.env.CAL_DIFERENCIAIS || '',
  linkAgendamento: process.env.CAL_LINK || '', whatsapp: process.env.CAL_WHATSAPP || '',
};

const t0 = Date.now();
const r = await D.diagnosticar(plataforma, prints, ctx);
console.log(`\n${plataforma} · ${D.MODELO_DIAGNOSTICO} · ${arquivos.map(f => path.basename(f)).join(', ')} · ${Math.round((Date.now() - t0) / 1000)}s`);
console.log(`nota ${r.nota}/10 · perfil válido: ${r.perfil_valido}\n${r.resumo}\n`);
for (const i of r.itens) {
  console.log(`[${i.status}] ${i.titulo}\n    viu: ${i.o_que_vimos}\n    evidência: ${i.evidencia || '—'}${i.sugestao ? `\n    → ${i.sugestao}` : ''}`);
}
