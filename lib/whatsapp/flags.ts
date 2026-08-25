/**
 * Atendimento por IA no WhatsApp.
 *
 * Desligado por enquanto: o painel do WhatsApp só conecta o número e configura
 * as mensagens automáticas. Nada foi apagado — a persona, a palavra-chave de
 * atendimento humano e os números bloqueados continuam gravados em
 * `whatsapp_settings`, e o webhook volta a responder quando esta flag virar
 * `true` (aí a UI da IA e a aba "Conversas" também voltam).
 */
export const AI_ATTENDANCE_ENABLED = false;
