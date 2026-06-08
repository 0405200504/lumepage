/**
 * Conta DEMO ("Conta teste" — Amanda Costa).
 * É uma conta de exemplo: lê dados reais (seed no banco), mas as ESCRITAS são
 * ignoradas (no-op) — então qualquer alteração some ao atualizar a página,
 * voltando ao estado inicial configurado.
 */
export const DEMO_PROFESSIONAL_ID = 'deadbeef-0000-4000-a000-000000000001';
export const DEMO_PROFILE_ID = 'deadbeef-0000-4000-a000-0000000000a2';
export const DEMO_EMAIL = 'demo@lumeagenda.app';
export const DEMO_NAME = 'Amanda Costa';
export const DEMO_SLUG = 'amanda-costa-demo';

/** É a conta demo? (escritas devem ser ignoradas) */
export function isDemo(professionalId?: string | null): boolean {
  return professionalId === DEMO_PROFESSIONAL_ID;
}
