import { requireProfessional } from '@/lib/auth/session';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Apenas profissionais autenticados podem transcrever áudios
    await requireProfessional();

    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return new Response('Nenhum arquivo de áudio enviado.', { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return new Response('OPENAI_API_KEY não configurada no servidor.', { status: 500 });
    }

    // Preparando requisição para a API do Whisper (OpenAI)
    const openAiFormData = new FormData();
    openAiFormData.append('file', file, 'audio.webm');
    openAiFormData.append('model', 'whisper-1');
    openAiFormData.append('language', 'pt'); // Força português para melhor precisão

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`
      },
      body: openAiFormData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro na API do OpenAI Whisper:', errorData);
      return new Response('Erro ao transcrever o áudio.', { status: response.status });
    }

    const data = await response.json();
    
    // Retorna o texto transcrito
    return new Response(JSON.stringify({ text: data.text }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro no endpoint de transcrição:', error);
    return new Response('Erro interno.', { status: 500 });
  }
}
