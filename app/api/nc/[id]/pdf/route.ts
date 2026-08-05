import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Fase 3 (prioridade): geração de PDF a partir dos dados do banco.
// Placeholder funcional: retorna os dados em JSON por enquanto.
// Ao implementar, usar @react-pdf/renderer para montar o layout A-I
// e responder com Content-Type: application/pdf.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: nc, error } = await supabase
    .from("nao_conformidades")
    .select("*, setores(nome)")
    .eq("id", params.id)
    .single();

  if (error || !nc) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
  }

  const { data: acoes } = await supabase
    .from("acoes_corretivas")
    .select("*")
    .eq("nao_conformidade_id", params.id);

  // TODO (Fase 3): renderizar PDF real com @react-pdf/renderer.
  return NextResponse.json({ nc, acoes, aviso: "Geração de PDF será implementada na Fase 3." });
}
