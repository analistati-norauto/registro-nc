import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

// Cliente Supabase para uso em Server Components / Route Handlers.
// Usa getAll/setAll (padrão recomendado pelo Supabase) para evitar perder
// partes do cookie de sessão quando o token é dividido em múltiplos pedaços.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component — ignorado, o middleware cuida disso
          }
        },
      },
    }
  );
}
