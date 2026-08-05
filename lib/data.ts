import { createClient } from "@/lib/supabase-server";
import type { Usuario } from "@/types/db";

export async function getUsuarioAtual(): Promise<Usuario | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("id, nome, email, setor_id, cargo, perfil, ativo, setores(nome)")
    .eq("id", user.id)
    .single();

  return data as unknown as Usuario;
}

export async function getContadoresPainel(setorId: string | null, acessoTotal: boolean) {
  const supabase = createClient();
  let query = supabase.from("nao_conformidades").select("status", { count: "exact" });

  if (!acessoTotal && setorId) {
    query = query.eq("setor_id", setorId);
  }

  const { data } = await query;

  const contagem: Record<string, number> = {};
  (data ?? []).forEach((row: any) => {
    contagem[row.status] = (contagem[row.status] ?? 0) + 1;
  });

  return contagem;
}

export async function getRegistrosRecentes(setorId: string | null, acessoTotal: boolean, limit = 10) {
  const supabase = createClient();
  let query = supabase
    .from("nao_conformidades")
    .select("id, numero, status, criticidade, descricao_objetiva, unidade, criado_em, setores(nome)")
    .order("criado_em", { ascending: false })
    .limit(limit);

  if (!acessoTotal && setorId) {
    query = query.eq("setor_id", setorId);
  }

  const { data } = await query;
  return data ?? [];
}
