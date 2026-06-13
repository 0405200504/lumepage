import { NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { authService } from '@/lib/auth/auth';

export async function POST(request: Request) {
  try {
    const session = await authService.getCurrentUser();
    if (!session || !session.professional_id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.auth || !keys.p256dh) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const subscriptionData = {
      professional_id: session.professional_id,
      endpoint,
      auth: keys.auth,
      p256dh: keys.p256dh,
    };

    const saved = await dbService.savePushSubscription(subscriptionData);

    return NextResponse.json({ success: true, subscription: saved });
  } catch (error: any) {
    console.error('Erro ao salvar subscription:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
