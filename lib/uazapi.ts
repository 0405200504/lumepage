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

  // 1. Busca o webhook existente para obter o ID (uazapi retorna array)
  let existingId: string | null = null;
  try {
    const getRes = await fetch(`${baseUrl}/webhook`, { headers, signal: AbortSignal.timeout(6000) });
    const getText = await getRes.text().catch(() => '');
    logs.push(`GET /webhook → ${getRes.status}: ${getText.slice(0, 200)}`);
    if (getRes.ok) {
      let parsed: unknown;
      try { parsed = JSON.parse(getText); } catch { /* ignore */ }
      const entry = Array.isArray(parsed) ? (parsed[0] as Record<string, unknown>) : (parsed as Record<string, unknown>);
      existingId = (entry?.id ?? null) as string | null;
    }
  } catch (e) {
    logs.push(`GET /webhook → exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Payload com todos os campos que a uazapi espera
  const payload = {
    url: webhookUrl,
    webhookUrl,        // alias caso uazapi prefira este campo
    enabled: true,
    events: ['message'],
    addUrlEvents: false,
    addUrlTypesMessages: false,
    excludeMessages: [],
  };

  // 3a. Se temos um ID, atualiza via PUT /webhook/{id}
  if (existingId) {
    try {
      const putRes = await fetch(`${baseUrl}/webhook/${existingId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...payload, id: existingId }),
        signal: AbortSignal.timeout(8000),
      });
      const putText = await putRes.text().catch(() => '');
      logs.push(`PUT /webhook/${existingId} → ${putRes.status}: ${putText.slice(0, 200)}`);
      if (putRes.ok) return { success: true, debug: logs.join(' | ') };
      // Se falhou por ID, tenta sem ID
    } catch (e) {
      logs.push(`PUT /webhook/${existingId} → exception: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3b. Tenta PUT /webhook (sem ID) e depois POST /webhook
  for (const [method, path] of [['PUT', '/webhook'], ['POST', '/webhook']] as const) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text().catch(() => '');
      logs.push(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
      if (res.status === 405) continue;
      if (!res.ok) return { success: false, error: `uazapi retornou ${res.status}: ${text}`, debug: logs.join(' | ') };
      return { success: true, debug: logs.join(' | ') };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro de rede';
      logs.push(`${method} ${path} → exception: ${msg}`);
    }
  }

  return { success: false, error: 'uazapi não aceitou nenhuma forma de configuração de webhook.', debug: logs.join(' | ') };
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
