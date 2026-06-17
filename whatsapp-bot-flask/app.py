import os
import time
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, request, jsonify

import memory
from uazapi import send_text, send_presence, mark_read
from llm import generate_reply
from buffer import MessageBuffer

BUFFER_SECONDS = float(os.environ.get("BUFFER_SECONDS", "8"))
SYSTEM_PROMPT = os.environ.get("SYSTEM_PROMPT", "Você é um assistente útil.")
PORT = int(os.environ.get("PORT", "5000"))

app = Flask(__name__)


def split_reply(text: str) -> list[str]:
    """Divide a resposta em chunks: por \\n\\n, e por ". " se algum pedaço > 800 chars."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []

    for paragraph in paragraphs:
        if len(paragraph) <= 800:
            chunks.append(paragraph)
            continue

        sentences = paragraph.split(". ")
        current = ""
        for i, sentence in enumerate(sentences):
            piece = sentence if i == len(sentences) - 1 else sentence + "."
            candidate = f"{current} {piece}".strip() if current else piece
            if len(candidate) > 800 and current:
                chunks.append(current.strip())
                current = piece
            else:
                current = candidate
        if current.strip():
            chunks.append(current.strip())

    return [c for c in chunks if c]


def handle_flush(user: str, texts: list[str]) -> None:
    send_presence(user, "composing")

    user_turn = "\n".join(texts)
    memory.append(user, "user", user_turn)

    reply = generate_reply(memory.get(user), SYSTEM_PROMPT, tools=None)
    print(f"[llm] reply len={len(reply)}")
    memory.append(user, "model", reply)

    for chunk in split_reply(reply):
        send_presence(user, "composing")
        time.sleep(1 + len(chunk) / 200)
        send_text(user, chunk)

    send_presence(user, "paused")


buffer = MessageBuffer(BUFFER_SECONDS, on_flush=handle_flush)


@app.route("/", methods=["GET"])
def health():
    return "ok"


@app.route("/webhook", methods=["POST"])
def webhook():
    payload = request.get_json(silent=True) or {}

    if payload.get("event") != "message":
        return jsonify({"ok": True})

    data = payload.get("data") or {}

    if data.get("fromMe") or data.get("isGroup"):
        return jsonify({"ok": True})
    if data.get("type") != "text":
        return jsonify({"ok": True})

    number = (data.get("from") or "").split("@")[0]
    body = (data.get("body") or "").strip()
    message_id = data.get("id", "")

    if not number or not body:
        return jsonify({"ok": True})

    print(f"[webhook] mensagem de {number}: {body[:50]!r}")

    mark_read(number, message_id)
    buffer.add(number, body)

    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
