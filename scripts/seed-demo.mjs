import { createClient } from '@supabase/supabase-js'; import fs from 'fs';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(Boolean).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const c=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DEMO='deadbeef-0000-4000-a000-000000000001';
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d;};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const now=new Date(); const todayDay=now.getDate();
const dayInThisMonth=()=>new Date(now.getFullYear(),now.getMonth(),1+Math.floor(Math.random()*todayDay));
const dayInMonth=(back)=>{const dim=new Date(now.getFullYear(),now.getMonth()-back+1,0).getDate(); const d=new Date(now.getFullYear(),now.getMonth()-back,1); d.setDate(1+Math.floor(Math.random()*dim)); return d;};

for(const t of ['appointments','tasks','transactions','fixed_expenses','clients','services','availability_rules','settings']) await c.from(t).delete().eq('professional_id',DEMO);
await c.from('professionals').delete().eq('id',DEMO);

await c.from('professionals').insert({ id:DEMO, owner_user_id:null, name:'Amanda Costa', brand_name:'Amanda Costa', slug:'amanda-costa-demo', email:'demo@lumeagenda.app', whatsapp:'11988887777', instagram:'@amandacosta.lash', primary_color:'#500b18', secondary_color:'#eccbd2', address:'Av. Paulista, 1000', city:'São Paulo', state:'SP', description:'Especialista em lash lifting e brow lamination.', public_bio:'Realço o seu olhar com lash lifting e brow lamination. ✨', status:'active' });
await c.from('settings').insert({ professional_id:DEMO, confirmation_mode:'manual', min_notice_hours:3, max_days_ahead:30, default_slot_interval_minutes:45, default_buffer_minutes:15, whatsapp_confirmation_message:'Oi, {nome}! 💛 Confirmando seu horário de {servico} no dia {data} às {horario}.', whatsapp_cancel_message:'Oi, {nome}! Seu horário de {servico} em {data} às {horario} foi cancelado. Motivo: {motivo}.', show_price_public:true, requires_deposit:true, deposit_instructions:'Para garantir seu horário, envie 50% via Pix e mande o comprovante no WhatsApp. 💛', booking_theme:'stars' });
const rules=[]; for(let w=0;w<=6;w++) rules.push({ professional_id:DEMO, weekday:w, start_time:'09:00:00', end_time:w===6?'14:00:00':'19:00:00', break_start:w===6?null:'12:00:00', break_end:w===6?null:'13:00:00', slot_interval_minutes:45, buffer_minutes:15, is_active:w!==0 });
await c.from('availability_rules').insert(rules);

const {data:svcList}=await c.from('services').insert([
  { professional_id:DEMO, name:'Lash Lifting', description:'Curvatura natural e duradoura dos cílios, com hidratação.', duration_minutes:60, price_cents:15000, is_active:true },
  { professional_id:DEMO, name:'Brow Lamination', description:'Alinhamento e fixação dos fios da sobrancelha, efeito preenchido.', duration_minutes:45, price_cents:12000, is_active:true },
  { professional_id:DEMO, name:'Lash Lifting + Brow Lamination', description:'Combo completo do olhar: cílios + sobrancelhas.', duration_minutes:90, price_cents:25000, is_active:true },
]).select();

const fn=['Maria','Ana','Juliana','Camila','Beatriz','Fernanda','Larissa','Patrícia','Aline','Bruna','Carolina','Daniela','Eduarda','Gabriela','Helena','Isabela','Jéssica','Letícia','Mariana','Natália','Priscila','Rafaela','Sabrina','Tatiane','Vanessa','Bianca','Cristiane','Débora','Elaine','Fabiana','Giovana','Ingrid','Karina','Lívia','Marcela','Nicole','Paula','Renata','Simone','Talita','Vitória','Yasmin','Adriana','Carla','Flávia','Luana','Michele','Raquel','Sandra','Thaís'];
const ln=['Silva','Santos','Oliveira','Souza','Lima','Costa','Pereira','Almeida','Ferreira','Rodrigues','Gomes','Martins','Araújo','Barbosa','Ribeiro','Carvalho','Rocha','Dias','Nascimento','Andrade','Moreira','Nunes','Cardoso','Teixeira','Mendes','Freitas','Ramos','Correia','Pinto','Cavalcanti'];
const clients=[]; const used=new Set();
for(let i=0;i<112;i++){ let name; do{name=`${pick(fn)} ${pick(ln)}`;}while(used.has(name)); used.add(name);
  const bd=Math.random()<0.35?`19${85+Math.floor(Math.random()*15)}-${pad(1+Math.floor(Math.random()*12))}-${pad(1+Math.floor(Math.random()*28))}`:null;
  clients.push({ professional_id:DEMO, name, whatsapp:'1199'+String(1000000+i), email:Math.random()<0.5?`cliente${i}@email.com`:null, birthday:bd, total_appointments:0, last_appointment_at:iso(addDays(-Math.floor(Math.random()*120))) }); }
const {data:insClients}=await c.from('clients').insert(clients).select();

const times=['09:00','09:45','10:30','11:15','13:00','13:45','14:30','15:15','16:00','16:45','17:30'];
const end=(t,dur)=>{const [h,m]=t.split(':').map(Number);const tot=h*60+m+dur;return `${pad(Math.floor(tot/60))}:${pad(tot%60)}:00`;};
const mk=(cl,s,date,status,extra={})=>({ professional_id:DEMO, service_id:s.id, client_id:cl.id, client_name:cl.name, client_whatsapp:cl.whatsapp, client_email:cl.email, date:iso(date), start_time:pick(times)+':00', end_time:'00:00:00', status, notes:null, ...extra });
const fix=a=>{const s=svcList.find(x=>x.id===a.service_id);a.end_time=end(a.start_time.slice(0,5),s.duration_minutes);return a;};
const appts=[]; let revenue=0,i=0;
while(revenue<2150000){ const cl=insClients[i%insClients.length]; const s=pick(svcList); appts.push(fix(mk(cl,s,dayInThisMonth(),'completed'))); revenue+=s.price_cents; i++; }
for(let k=0;k<40;k++){ const s=pick(svcList); appts.push(fix(mk(pick(insClients),s,dayInMonth(1+Math.floor(Math.random()*4)),'completed'))); }
for(let k=0;k<12;k++){ const s=pick(svcList); appts.push(fix(mk(pick(insClients),s,addDays(1+Math.floor(Math.random()*18)),'confirmed'))); }
for(let k=0;k<14;k++){ const s=pick(svcList); appts.push(fix(mk(pick(insClients),s,addDays(1+Math.floor(Math.random()*14)),'pending'))); }
for(let k=0;k<9;k++){ const s=pick(svcList); appts.push(fix(mk(pick(insClients),s,addDays(-(2+Math.floor(Math.random()*40))),'no_show'))); }
for(let k=0;k<6;k++){ const s=pick(svcList); appts.push(fix(mk(pick(insClients),s,addDays(-(1+Math.floor(Math.random()*30))),'cancelled',{cancellation_reason:'Imprevisto da cliente'}))); }
for(let j=0;j<appts.length;j+=200) await c.from('appointments').insert(appts.slice(j,j+200));

await c.from('fixed_expenses').insert([
  { professional_id:DEMO, name:'Aluguel do espaço', amount_cents:150000, active:true },
  { professional_id:DEMO, name:'Energia, água e internet', amount_cents:45000, active:true },
  { professional_id:DEMO, name:'Produtos e materiais', amount_cents:90000, active:true },
  { professional_id:DEMO, name:'Marketing / tráfego', amount_cents:30000, active:true },
]);
const ym=iso(new Date(now.getFullYear(),now.getMonth(),5));
await c.from('transactions').insert([
  { professional_id:DEMO, type:'income', amount_cents:18000, category:'Venda de produto', description:'Kit pós-lash', date:ym },
  { professional_id:DEMO, type:'income', amount_cents:9000, category:'Venda de produto', description:'Rímel + escovinha', date:ym },
  { professional_id:DEMO, type:'expense', amount_cents:25000, category:'Impostos', description:'MEI/DAS', date:ym },
  { professional_id:DEMO, type:'expense', amount_cents:12000, category:'Equipamentos', description:'Pinça nova', date:ym },
]);
await c.from('tasks').insert([
  { professional_id:DEMO, content:'Comprar insumos de lash', done:false, due_date:iso(addDays(2)), due_time:'10:00:00' },
  { professional_id:DEMO, content:'Confirmar clientes da semana', done:false, due_date:iso(addDays(1)), due_time:'09:00:00' },
  { professional_id:DEMO, content:'Postar antes/depois no Instagram', done:false, due_date:iso(addDays(3)), due_time:null },
  { professional_id:DEMO, content:'Pagar fornecedor de henna', done:true, due_date:null, due_time:null },
  { professional_id:DEMO, content:'Responder orçamentos do direct', done:false, due_date:null, due_time:null },
]);
console.log('clientes:',insClients.length,'| agendamentos:',appts.length,'| faturamento mês atual: R$',(revenue/100).toFixed(2));
