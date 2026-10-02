/**
 * Texto literal dentro de `ilike`/`like` do PostgREST.
 *
 * `%` e `_` são curingas: `.ilike('email', 'jo_o@x.com')` casa com
 * `joao@x.com`. Num e-mail isso vira conta errada liberada pelo webhook ou
 * link de senha enviado a partir do perfil errado. O escape padrão do
 * Postgres é a barra invertida.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
