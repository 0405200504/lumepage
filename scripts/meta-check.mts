// Confere o robô da Meta: quem ele é, permissões, empresa e o que as
// profissionais já compartilharam com o Gerenciador da Lume. Nunca imprime o token.
//
// Como rodar:
//   node --env-file=.env scripts/meta-check.mts
//
import { createJiti } from 'jiti';

const ROOT = process.cwd();
const jiti = createJiti(ROOT + '/', { alias: { '@': ROOT } });
const A = await jiti.import<typeof import('../lib/meta/ativos')>('./lib/meta/ativos.ts');

const s = await A.statusRobo();
console.log(`robô: ${s.robo.nome} (${s.robo.id})`);
console.log(`empresa: ${s.empresa.nome} (${s.empresa.id}) · ${s.empresa.verificada ? 'verificada' : 'NÃO verificada'}`);
console.log(`permissões: ${s.permissoes.join(', ')}`);
const { contas, paginas } = await A.listarAtivos();
console.log(`\ncontas de anúncios (${contas.length}):`);
for (const c of contas) console.log(`  [${c.dono}] ${c.nome} ${c.id} · ${c.status} · ${c.moeda} · pagamento: ${c.pagamento ?? 'nenhum'}`);
console.log(`\nPáginas (${paginas.length}):`);
for (const p of paginas) console.log(`  [${p.dono}] ${p.nome} ${p.id} · ${p.instagram ? '@' + p.instagram.username : 'sem Instagram'}`);
