import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificar se as credenciais do Supabase estão configuradas e não são valores de exemplo/placeholders
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseUrl.includes('example') &&
  !supabaseAnonKey.includes('placeholder') && 
  !supabaseAnonKey.includes('example');

// Cliente real do Supabase
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // OAuth (Google): o token volta no hash da URL e o SDK o captura no
        // cliente, que então chama a action de servidor pra montar o cookie do Lume.
        detectSessionInUrl: true,
        flowType: 'implicit',
      }
    })
  : (null as any); // Evita erros de compilação em desenvolvimento local sem .env

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Função para obter dinamicamente o cliente admin (service_role) no servidor
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey || url.includes('placeholder') || url.includes('example')) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

// Cliente admin do Supabase com privilégios de bypass de RLS (mantido para compatibilidade de exportação)
export const supabaseAdmin = isSupabaseConfigured && !!supabaseServiceKey
  ? getSupabaseAdmin()
  : null;

export default supabase;

