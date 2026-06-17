import threading
from typing import Callable


class MessageBuffer:
    """Buffer de mensagens com debounce por usuário, usando threading.Timer."""

    def __init__(self, wait_seconds: float, on_flush: Callable[[str, list[str]], None]):
        self.wait_seconds = wait_seconds
        self.on_flush = on_flush
        self._lock = threading.Lock()
        self._pending: dict[str, list[str]] = {}
        self._timers: dict[str, threading.Timer] = {}

    def add(self, user: str, text: str) -> None:
        with self._lock:
            self._pending.setdefault(user, []).append(text)
            old_timer = self._timers.get(user)
            if old_timer:
                old_timer.cancel()
            timer = threading.Timer(self.wait_seconds, self._flush, args=[user])
            timer.daemon = True
            self._timers[user] = timer
            timer.start()

    def _flush(self, user: str) -> None:
        with self._lock:
            texts = self._pending.pop(user, [])
            self._timers.pop(user, None)
        if texts:
            print(f"[buffer] flush user={user} msgs={len(texts)}")
            self.on_flush(user, texts)
