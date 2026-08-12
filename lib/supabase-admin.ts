import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ATENÇÃO: usa a service role key — bypassa RLS completamente.
// Só pode ser usado em código de servidor (route handlers), NUNCA
// exposto ao navegador. A variável SUPABASE_SERVICE_ROLE_KEY não tem
// o prefixo NEXT_PUBLIC_ propositalmente, para não vazar para o cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
