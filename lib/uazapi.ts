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
): Promise<{ success: boolean; error?: string }> {
  // Tenta PUT primeiro (docs v2); se retornar 405, tenta POST (versões alternativas)
  for (const method of ['PUT', 'POST'] as const) {
    try {
      const res = await fetch(`${baseUrl}/webhook`, {
        method,
        headers: { token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, events: ['message'] }),
      });
      if (res.status === 405) continue;
      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `uazapi retornou ${res.status}: ${body}` };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Erro de rede' };
    }
  }
  return { success: false, error: 'uazapi não aceitou PUT nem POST em /webhook.' };
}

/** Verifica o status da conexão da instância WhatsApp. Retorna também o raw para debug. */
export async function checkUazapiStatus(
  baseUrl: string,
  token: string
): Promise<{ status: 'open' | 'connecting' | 'close' | 'qr' | 'error'; raw?: unknown }> {
  try {
    const res = await fetch(`${baseUrl}/instance/status`, {
      headers: { token },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => res.status.toString());
      return { status: 'error', raw };
    }
    const data = await res.json();
    // uazapi pode retornar status em vários níveis do JSON
    const s: string = (
      data?.status ??
      data?.state ??
      data?.data?.status ??
      data?.data?.state ??
      data?.instance?.status ??
      ''
    ).toLowerCase();
    const valid = ['open', 'connecting', 'close', 'qr'] as const;
    const matched = valid.find(v => s.includes(v));
    return { status: matched ?? 'error', raw: data };
  } catch (e) {
    return { status: 'error', raw: e instanceof Error ? e.message : String(e) };
  }
}
