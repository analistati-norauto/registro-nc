import { createClient } from "@/lib/supabase-server";
import type { Usuario } from "@/types/db";

export async function getUsuarioAtual(): Promise<Usuario | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, setor_id, cargo, perfil, ativo, setores(nome)")
    .eq("id", user.id)
    .single();

  if (error) {
    // Loga no servidor (aparece nos Logs da Vercel) para diagnosticar
    // sem precisar adivinhar — evita mascarar o problema como um
    // simples "usuário não encontrado" que gera loop de redirect.
    console.error("Erro ao buscar usuário em getUsuarioAtual:", error.message, error);
    return null;
  }

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

export async function getAcoesEmAtraso(setorId: string | null, acessoTotal: boolean, limit = 10) {
  const supabase = createClient();

  // Ações vencidas (prazo passado e ainda não concluídas) — o banco já
  // marca automaticamente como "atrasada" via trigger ao serem lidas/gravadas,
  // mas aqui também cobrimos o caso "ainda não recalculado" verificando o
  // prazo diretamente.
  let query = supabase
    .from("acoes_corretivas")
    .select(
      "id, descricao, responsavel, prazo, status, nao_conformidade_id, nao_conformidades!inner(numero, setor_id, setores(nome))"
    )
    .in("status", ["pendente", "em_andamento", "atrasada"])
    .lt("prazo", new Date().toISOString().slice(0, 10))
    .order("prazo", { ascending: true })
    .limit(limit);

  if (!acessoTotal && setorId) {
    query = query.eq("nao_conformidades.setor_id", setorId);
  }

  const { data } = await query;
  return data ?? [];
}
