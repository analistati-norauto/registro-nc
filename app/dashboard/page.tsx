import Link from "next/link";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import { getUsuarioAtual, getContadoresPainel, getRegistrosRecentes } from "@/lib/data";
import { STATUS_LABEL, CRITICIDADE_LABEL, temAcessoTotal, type StatusNC } from "@/types/db";

export const dynamic = "force-dynamic";

const CRITICIDADE_COR: Record<string, string> = {
  baixa: "bg-slate-100 text-slate-700",
  media: "bg-amber-100 text-amber-800",
  alta: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const acessoTotal = temAcessoTotal(usuario.perfil);
  const setorNome = (usuario as any).setores?.nome ?? null;

  const contadores = await getContadoresPainel(usuario.setor_id, acessoTotal);
  const registros = await getRegistrosRecentes(usuario.setor_id, acessoTotal);

  const total = Object.values(contadores).reduce((a, b) => a + b, 0);

  const cardsResumo: { label: string; status?: StatusNC; valor: number }[] = acessoTotal
    ? [
        { label: "Total de registros", valor: total },
        { label: "Aguardando triagem", status: "aguardando_triagem", valor: contadores["aguardando_triagem"] ?? 0 },
        { label: "Em análise", status: "em_analise", valor: contadores["em_analise"] ?? 0 },
        { label: "Plano de ação em execução", status: "plano_acao_execucao", valor: contadores["plano_acao_execucao"] ?? 0 },
        { label: "Aguardando verificação de eficácia", status: "aguardando_verificacao_eficacia", valor: contadores["aguardando_verificacao_eficacia"] ?? 0 },
        { label: "Encerrados", status: "encerrado", valor: contadores["encerrado"] ?? 0 },
      ]
    : [
        { label: "Registros do meu setor", valor: total },
        { label: "Rascunhos", status: "rascunho", valor: contadores["rascunho"] ?? 0 },
        { label: "Enviados", status: "enviado_controladoria", valor: contadores["enviado_controladoria"] ?? 0 },
        { label: "Devolvidos p/ complementação", status: "devolvido_complementacao", valor: contadores["devolvido_complementacao"] ?? 0 },
        { label: "Em andamento", status: "plano_acao_execucao", valor: contadores["plano_acao_execucao"] ?? 0 },
        { label: "Encerrados", status: "encerrado", valor: contadores["encerrado"] ?? 0 },
      ];

  return (
    <div>
      <NavBar nome={usuario.nome} perfil={usuario.perfil} setor={setorNome} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-marinho">
              {acessoTotal ? "Painel Geral" : `Painel — ${setorNome ?? "Meu Setor"}`}
            </h1>
            <p className="text-slate-500 text-sm">
              {acessoTotal
                ? "Visão completa de todas as não conformidades da Norauto."
                : "Não conformidades do seu setor."}
            </p>
          </div>
          <Link href="/nc/new" className="btn-primary">
            + Nova Não Conformidade
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {cardsResumo.map((c) => (
            <div key={c.label} className="card">
              <div className="text-3xl font-bold text-marinho">{c.valor}</div>
              <div className="text-xs text-slate-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="font-semibold text-marinho mb-4">Registros recentes</h2>
          {registros.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum registro encontrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-4">Número</th>
                    <th className="py-2 pr-4">Descrição</th>
                    <th className="py-2 pr-4">Setor</th>
                    <th className="py-2 pr-4">Criticidade</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2 pr-4">
                        <Link href={`/nc/${r.id}`} className="text-marinho font-medium hover:underline">
                          {r.numero}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 max-w-xs truncate">{r.descricao_objetiva || "—"}</td>
                      <td className="py-2 pr-4">{r.setores?.nome ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {r.criticidade ? (
                          <span className={`badge ${CRITICIDADE_COR[r.criticidade]}`}>
                            {CRITICIDADE_LABEL[r.criticidade as keyof typeof CRITICIDADE_LABEL]}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-4">{STATUS_LABEL[r.status as StatusNC]}</td>
                      <td className="py-2 pr-4 text-slate-500">
                        {new Date(r.criado_em).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
