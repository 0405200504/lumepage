import { requireProfessional } from '@/lib/auth/session';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Apenas profissionais autenticados podem transcrever áudios
    await requireProfessional();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return new Response('Transcrição indisponível: chave da IA (Gemini) não configurada.', { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return new Response('Nenhum arquivo de áudio enviado.', { status: 400 });
    }

    // Converte o áudio para base64 (formato que o Gemini aceita como inline_data)
    const arrayBuffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'audio/webm';

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Transcreva o áudio a seguir em português do Brasil. Responda APENAS com o texto transcrito, sem comentários, aspas ou explicações.' },
                { inline_data: { mime_type: mimeType, data: base64Audio } },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na API do Gemini (transcrição):', errorData);
      return new Response('Erro ao transcrever o áudio.', { status: response.status });
    }

    const data = await response.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('').trim() || '';

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro no endpoint de transcrição:', error);
    return new Response('Erro interno.', { status: 500 });
  }
}
