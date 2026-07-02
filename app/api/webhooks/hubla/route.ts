import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { createClient } from '@supabase/supabase-js';

// Precisamos inicializar um supabase com a SERVICE_ROLE key para dar bypass em RLS
// durante webhooks (pois não há sessão de usuário ativa).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('--- NOVO WEBHOOK DA HUBLA ---', JSON.stringify(payload, null, 2));

    // A Hubla pode mandar o email em lugares diferentes dependendo da versão do webhook.
    // Vamos tentar buscar nos locais mais comuns:
    const email = payload?.email 
               || payload?.data?.customer?.email 
               || payload?.customer?.email;
               
    const eventName = payload?.event || payload?.type;
    const status = payload?.status || payload?.data?.status; // ex: 'approved', 'paid', etc
    const productId = payload?.product_id || payload?.data?.product?.id;

    if (!email) {
      console.warn('Webhook ignorado: Nenhum e-mail encontrado no payload.');
      return NextResponse.json({ received: true, ignored: true, reason: 'no email' });
    }

    // Só ativamos se for um evento de sucesso de pagamento ou assinatura ativada
    const isSuccessEvent = 
      eventName === 'invoice.payment_succeeded' || 
      eventName === 'subscription.activated' ||
      status === 'approved' || 
      status === 'paid';

    if (isSuccessEvent) {
      
      // Mapear o ID do produto para o plano correto (Start, Pro, Premium)
      // Usando os IDs dos links de pagamento fornecidos:
      let plan = 'start'; // default
      if (productId === 'Ijgtp0VTZ3QXmyCvAPKe' || productId === 'kp8OZWVfP7tLSWpMx5ok') plan = 'pro';
      if (productId === 'G1EIrESSFgnth0kXxCPC' || productId === 'rqw8NXaLwSvl111uEMRH') plan = 'premium';
      if (productId === 'W0OcCJoqELUskNPEhbdL' || productId === 'AgzZbpcOki2gtS9voVrq') plan = 'start';

      // Atualiza o profissional no Supabase usando o email
      const { data: profs } = await supabaseAdmin
        .from('professionals')
        .select('id')
        .eq('email', email)
        .single();

      if (profs) {
        // Encontrou o profissional, vamos atualizar para Ativo e salvar o plano
        await supabaseAdmin
          .from('professionals')
          .update({
            subscription_status: 'active',
            subscription_plan: plan,
            // renova a data de vencimento pra daqui 30 dias (ou 1 ano se for anual, mas o ideal 
            // é que no vencimento a hubla avise ou você bloqueie manualmente, 
            // ou a hubla gerencie isso e mande webhook de cancelamento)
          })
          .eq('id', profs.id);
        
        console.log(`Sucesso: Assinatura ativada para o email ${email}, Plano: ${plan}`);
      } else {
        console.warn(`Alerta: E-mail ${email} pagou, mas não foi encontrado no Lume.`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Erro ao processar webhook da Hubla:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
