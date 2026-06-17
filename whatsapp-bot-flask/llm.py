import os
from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

_client = genai.Client(api_key=GEMINI_API_KEY)


def generate_reply(history: list[dict], system: str, tools: list | None = None) -> str:
    """Chama Gemini generate_content. tools=None hoje; preparado pra function calling depois."""
    config = types.GenerateContentConfig(
        system_instruction=system,
        max_output_tokens=1024,
        tools=tools,  # None hoje
    )
    response = _client.models.generate_content(
        model=GEMINI_MODEL,
        contents=history,
        config=config,
    )
    # TODO: quando tools for usado, percorrer response.candidates[0].content.parts
    # procurando part.function_call, executar a função local e enviar o resultado
    # de volta pro Gemini antes de extrair o texto final.
    return (response.text or "").strip()
