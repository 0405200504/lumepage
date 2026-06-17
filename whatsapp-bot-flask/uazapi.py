import os
import requests

UAZAPI_BASE_URL = os.environ["UAZAPI_BASE_URL"].rstrip("/")
UAZAPI_INSTANCE_TOKEN = os.environ["UAZAPI_INSTANCE_TOKEN"]

_HEADERS = {"token": UAZAPI_INSTANCE_TOKEN, "Content-Type": "application/json"}


def send_text(number: str, text: str) -> None:
    """POST /send/text — envia uma mensagem de texto."""
    try:
        r = requests.post(
            f"{UAZAPI_BASE_URL}/send/text",
            json={"number": number, "text": text},
            headers=_HEADERS,
            timeout=15,
        )
        if not r.ok:
            print(f"[uazapi] send_text falhou: {r.status_code}")
    except Exception as e:
        print(f"[uazapi] send_text erro: {e}")


def send_presence(number: str, presence: str) -> None:
    """POST /send/presence — informa status de digitação (composing/paused/recording)."""
    try:
        r = requests.post(
            f"{UAZAPI_BASE_URL}/send/presence",
            json={"number": number, "presence": presence},
            headers=_HEADERS,
            timeout=10,
        )
        if not r.ok:
            print(f"[uazapi] send_presence falhou: {r.status_code}")
    except Exception as e:
        print(f"[uazapi] send_presence erro: {e}")


def mark_read(number: str, message_id: str) -> None:
    """PUT /send/read — marca a mensagem recebida como lida."""
    try:
        r = requests.put(
            f"{UAZAPI_BASE_URL}/send/read",
            json={"number": number, "messageId": message_id},
            headers=_HEADERS,
            timeout=10,
        )
        if not r.ok:
            print(f"[uazapi] mark_read falhou: {r.status_code}")
    except Exception as e:
        print(f"[uazapi] mark_read erro: {e}")
