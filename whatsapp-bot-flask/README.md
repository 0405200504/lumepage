# WhatsApp Bot — uazapi + Gemini

Bot de WhatsApp minimalista em Flask que liga a uazapi ao Google Gemini 2.5 Flash. Recebe mensagens via webhook, agrupa rajadas de mensagens com debounce, e responde dividindo o texto em várias mensagens com indicador de "digitando".

## Instalação

```bash
pip install -r requirements.txt
```

## Configuração

Copie o arquivo de exemplo e preencha com seus dados:

```bash
cp .env.example .env
```

- `UAZAPI_BASE_URL` e `UAZAPI_INSTANCE_TOKEN`: encontrados no painel da sua instância uazapi.
- `GEMINI_API_KEY`: gere uma chave gratuita em https://aistudio.google.com/apikey
- `BUFFER_SECONDS`: quantos segundos esperar sem novas mensagens antes de responder (debounce).
- `MAX_HISTORY`: quantas mensagens manter no histórico de cada conversa.

## Rodando

```bash
python app.py
```

O servidor sobe em `http://0.0.0.0:5000` (ou na porta definida em `PORT`).

## Expondo com ngrok

Para a uazapi conseguir chamar seu webhook local, exponha a porta com ngrok:

```bash
ngrok http 5000
```

Copie a URL pública gerada (ex: `https://abcd1234.ngrok.io`).

## Configurando o webhook na uazapi

Com a URL do ngrok em mãos, registre o webhook na sua instância uazapi:

```bash
curl -X PUT "$UAZAPI_BASE_URL/webhook" \
  -H "token: $UAZAPI_INSTANCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://SEU-NGROK.ngrok.io/webhook",
    "events": ["message"]
  }'
```

Troque `https://SEU-NGROK.ngrok.io/webhook` pela sua URL do ngrok (mantendo o `/webhook` no final) e `$UAZAPI_BASE_URL`/`$UAZAPI_INSTANCE_TOKEN` pelos valores do seu `.env`. Detalhes completos sobre o endpoint de webhook (campos, eventos disponíveis, formatos de payload) estão em `llms-uazapi.txt`, seção "ENDPOINTS — WEBHOOK".

## Adicionando tools no futuro

O `llm.py` já está preparado para function calling do Gemini: `generate_reply` recebe um parâmetro `tools` (hoje sempre `None`). Para ativar:

1. Defina suas funções como `types.Tool(function_declarations=[...])` e passe em `tools=[...]` na chamada de `generate_reply`.
2. Após a chamada, percorra `response.candidates[0].content.parts` procurando por `part.function_call` — se existir, execute a função localmente com os argumentos recebidos.
3. Envie o resultado de volta para o Gemini como uma nova parte de conteúdo (`function_response`) antes de extrair o texto final da resposta.

Há um comentário `TODO` exatamente neste ponto dentro de `llm.py` indicando onde esse tratamento entra.

## Expandindo features

Para ir além de texto puro, consulte `llms-uazapi.txt` (documentação completa da uazapi):

- **Receber mídia**: endpoint de download de mídia recebida (`/send/download-media`).
- **Enviar imagem/áudio**: `/send/image`, `/send/audio`.
- **Botões interativos**: `/send/menu`.
- **Suporte a grupos**: campos `isGroup`/`groupJid` no payload do webhook, endpoints de grupo na seção correspondente.
- **Status de mensagem, chamadas, conexão**: eventos `message_status`, `call`, `connection`, `qr` no webhook.

Não foi implementado nada disso neste MVP — apenas mensagens de texto 1:1 (`event: "message"`, `type: "text"`, `isGroup: false`).
