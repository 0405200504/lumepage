import os
import threading

MAX_HISTORY = int(os.environ.get("MAX_HISTORY", "20"))

_lock = threading.Lock()
_history: dict[str, list[dict]] = {}


def append(user: str, role: str, text: str) -> None:
    """Adiciona uma mensagem ao histórico do usuário, no formato nativo do Gemini."""
    with _lock:
        msgs = _history.setdefault(user, [])
        msgs.append({"role": role, "parts": [{"text": text}]})
        if len(msgs) > MAX_HISTORY:
            del msgs[: len(msgs) - MAX_HISTORY]


def get(user: str) -> list:
    """Retorna o histórico do usuário, pronto para enviar ao Gemini."""
    with _lock:
        return list(_history.get(user, []))


def reset(user: str) -> None:
    with _lock:
        _history.pop(user, None)
