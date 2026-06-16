/** Extrai o número de telefone do JID do WhatsApp (remove @s.whatsapp.net). */
export function phoneFromJid(jid: string): string {
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');
}

/** Envia uma mensagem de texto via uazapi. Retorna true se enviado com sucesso. */
export async function sendWhatsAppText(
  baseUrl: string,
  token: string,
  phone: string,
  text: string
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text }),
    });
    if (!res.ok) {
      console.error('[uazapi] sendText falhou:', res.status, await res.text());
    }
    return res.ok;
  } catch (e) {
    console.error('[uazapi] Erro ao enviar mensagem:', e);
    return false;
  }
}

/** Configura o webhook da instância na uazapi para receber eventos de mensagem. */
export async function configureUazapiWebhook(
  baseUrl: string,
  token: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string; debug?: string }> {
  const headers = { token, 'Content-Type': 'application/json' };
  const logs: string[] = [];

  // 1. Busca o webhook existente para obter o ID e o estado atual
  let existingId: string | null = null;
  try {
    const getRes = await fetch(`${baseUrl}/webhook`, { headers, signal: AbortSignal.timeout(6000) });
    const getText = await getRes.text().catch(() => '');
    logs.push(`GET /webhook → ${getRes.status}: ${getText.slice(0, 300)}`);
    if (getRes.ok) {
      let parsed: unknown;
      try { parsed = JSON.parse(getText); } catch { /* ignore */ }
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const first = entries[0] as Record<string, unknown> | null;
      existingId = (first?.id ?? null) as string | null;
    }
  } catch (e) {
    logs.push(`GET /webhook → exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Payload completo — addUrlEvents:true é o que manda eventos para a URL
  const payload = {
    url: webhookUrl,
    webhookUrl,
    enabled: true,
    addUrlEvents: true,
    addUrlTypesMessages: true,
    events: ['message'],
    excludeMessages: [],
  };

  // 3a. Se existe ID: tenta DELETE do existente e depois POST com novo
  if (existingId) {
    try {
      const delRes = await fetch(`${baseUrl}/webhook/${existingId}`, {
        method: 'DELETE', headers, signal: AbortSignal.timeout(6000),
      });
      logs.push(`DELETE /webhook/${existingId} → ${delRes.status}`);
    } catch (e) {
      logs.push(`DELETE /webhook/${existingId} → exception: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3b. POST para criar novo webhook limpo
  try {
    const postRes = await fetch(`${baseUrl}/webhook`, {
      method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000),
    });
    const postText = await postRes.text().catch(() => '');
    logs.push(`POST /webhook → ${postRes.status}: ${postText.slice(0, 200)}`);
    if (postRes.ok) return { success: true, debug: logs.join(' | ') };
  } catch (e) {
    logs.push(`POST /webhook → exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3c. Fallback: PUT /webhook (sem ID)
  try {
    const putRes = await fetch(`${baseUrl}/webhook`, {
      method: 'PUT', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000),
    });
    const putText = await putRes.text().catch(() => '');
    logs.push(`PUT /webhook → ${putRes.status}: ${putText.slice(0, 200)}`);
    if (putRes.ok) return { success: true, debug: logs.join(' | ') };
    return { success: false, error: `uazapi retornou ${putRes.status}`, debug: logs.join(' | ') };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro de rede';
    logs.push(`PUT /webhook → exception: ${msg}`);
  }

  return { success: false, error: 'uazapi não aceitou configuração de webhook via API. Configure manualmente no painel da uazapi.', debug: logs.join(' | ') };
}

/** Verifica o status da conexão da instância WhatsApp. */
export async function checkUazapiStatus(
  baseUrl: string,
  token: string
): Promise<{ status: 'open' | 'connecting' | 'close' | 'qr' | 'error'; rawJson?: string }> {
  try {
    const res = await fetch(`${baseUrl}/instance/status`, {
      headers: { token },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (!res.ok) return { status: 'error', rawJson: text.slice(0, 200) };

    // Parse manual — evita throw em respostas HTML ou inesperadas
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { return { status: 'error', rawJson: text.slice(0, 200) }; }

    // uazapi pode retornar status em vários campos e valores
    const candidates = [
      data?.status, data?.state,
      (data?.data as Record<string, unknown>)?.status,
      (data?.data as Record<string, unknown>)?.state,
      (data?.instance as Record<string, unknown>)?.status,
    ];
    const s = candidates.find(v => typeof v === 'string') as string | undefined;
    const valid = ['open', 'connecting', 'close', 'qr'] as const;
    const matched = valid.find(v => (s ?? '').toLowerCase().includes(v));
    return { status: matched ?? 'error', rawJson: text.slice(0, 200) };
  } catch (e) {
    return { status: 'error', rawJson: e instanceof Error ? e.message : String(e) };
  }
}
