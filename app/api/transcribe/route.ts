import { requireProfessional } from '@/lib/auth/session';
import { BudgetUnavailable, BUDGET_REACHED_MSG, addAiCost, remainingMicros, whisperCostMicros } from '@/lib/assistant/budget';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await requireProfessional();
    const professionalId = session.professional_id!;

    // Teto de IA do mês (migração v43); sem a migração, segue sem contar.
    let metered = true;
    try {
      if ((await remainingMicros(professionalId)) <= 0) return new Response(BUDGET_REACHED_MSG, { status: 402 });
    } catch (e) {
      if (!(e instanceof BudgetUnavailable)) throw e;
      metered = false;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response('Transcrição indisponível: OPENAI_API_KEY não configurada.', { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return new Response('Nenhum arquivo de áudio enviado.', { status: 400 });
    }

    const whisperForm = new FormData();
    whisperForm.append('file', new File([file], 'audio.webm', { type: file.type || 'audio/webm' }));
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'pt');
    // verbose_json traz a duração do áudio: é por ela que o whisper cobra.
    whisperForm.append('response_format', 'verbose_json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na API Whisper (transcrição):', errorData);
      return new Response('Erro ao transcrever o áudio.', { status: response.status });
    }

    const data = await response.json();
    const text: string = data?.text?.trim() || '';
    if (metered) await addAiCost(professionalId, whisperCostMicros(Number(data?.duration) || 0)).catch(() => {});

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro no endpoint de transcrição:', error);
    return new Response('Erro interno.', { status: 500 });
  }
}
