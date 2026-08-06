"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { Perfil, Setor } from "@/types/db";
import { temAcessoTotal } from "@/types/db";

export const dynamic = "force-dynamic";

const CAMPOS_INICIAIS = {
  // A. Identificação
  setor_id: "",
  data_ocorrencia: "",
  unidade: "",
  area_processo: "",
  contrato_cliente: "",
  lideranca_responsavel: "",
  responsavel_preenchimento: "",
  origem_identificacao: "",
  // B. Descrição
  descricao_objetiva: "",
  requisito_nao_atendido: "",
  local_ocorrencia: "",
  pessoas_veiculos_documentos: "",
  impacto_identificado: "",
  risco_relacionado: "",
  criticidade: "",
  // C. Evidências
  justificativa_sem_evidencia: "",
  // D. Correção imediata
  acao_contencao: "",
  correcao_responsavel: "",
  correcao_data: "",
  correcao_resultado: "",
  comunicacao_cliente: false,
  comunicacao_cliente_detalhe: "",
};

export default function NovaNCPage() {
  const router = useRouter();
  const supabase = createClient();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [salvando, setSalvando] = useState<"rascunho" | "enviar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("perfil, setor_id")
        .eq("id", user.id)
        .single();

      if (usuario) {
        setPerfil(usuario.perfil as Perfil);
        setCampos((c) => ({ ...c, setor_id: usuario.setor_id ?? "" }));
      }

      const { data: listaSetores } = await supabase
        .from("setores")
        .select("id, nome, ativo")
        .eq("ativo", true)
        .order("nome");
      setSetores(listaSetores ?? []);
    })();
  }, []);

  function update(field: keyof typeof CAMPOS_INICIAIS, value: any) {
    setCampos((c) => ({ ...c, [field]: value }));
  }

  const acessoTotal = perfil ? temAcessoTotal(perfil) : false;

  async function salvar(destino: "rascunho" | "enviar") {
    setErro(null);
    if (!campos.setor_id) {
      setErro("Selecione o setor relacionado à ocorrência.");
      return;
    }
    if (destino === "enviar" && !campos.descricao_objetiva) {
      setErro("Descreva a não conformidade antes de enviar para a Controladoria.");
      return;
    }

    setSalvando(destino);

    const payload = {
      ...campos,
      criticidade: campos.criticidade || null,
      correcao_data: campos.correcao_data || null,
      data_ocorrencia: campos.data_ocorrencia || null,
      status: destino === "enviar" ? "enviado_controladoria" : "rascunho",
    };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("nao_conformidades")
      .insert({ ...payload, criado_por: user!.id })
      .select("id")
      .single();

    setSalvando(null);

    if (error) {
      setErro("Não foi possível salvar o registro: " + error.message);
      return;
    }

    router.push(`/nc/${data.id}`);
  }

  return (
    <div className="min-h-screen">
      <div className="bg-marinho text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold">Nova Não Conformidade</h1>
          <p className="text-slate-300 text-sm">Formulário de Registro de Não Conformidade e Ação Corretiva (Anexo I)</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
            {erro}
          </div>
        )}

        {/* A. IDENTIFICAÇÃO */}
        <section className="card">
          <h2 className="font-semibold text-marinho mb-4">A. Identificação</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Setor relacionado *</label>
              <select
                className="input"
                value={campos.setor_id}
                onChange={(e) => update("setor_id", e.target.value)}
                disabled={!acessoTotal && !!campos.setor_id}
              >
                <option value="">Selecione...</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Data da ocorrência</label>
              <input
                type="date"
                className="input"
                value={campos.data_ocorrencia}
                onChange={(e) => update("data_ocorrencia", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Unidade</label>
              <input className="input" value={campos.unidade} onChange={(e) => update("unidade", e.target.value)} />
            </div>
            <div>
              <label className="label">Área / Processo</label>
              <input
                className="input"
                value={campos.area_processo}
                onChange={(e) => update("area_processo", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Contrato / Cliente</label>
              <input
                className="input"
                value={campos.contrato_cliente}
                onChange={(e) => update("contrato_cliente", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Liderança responsável</label>
              <input
                className="input"
                value={campos.lideranca_responsavel}
                onChange={(e) => update("lideranca_responsavel", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Responsável pelo preenchimento</label>
              <input
                className="input"
                value={campos.responsavel_preenchimento}
                onChange={(e) => update("responsavel_preenchimento", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Origem da identificação</label>
              <input
                className="input"
                placeholder="Ex.: inspeção, auditoria, reclamação de cliente..."
                value={campos.origem_identificacao}
                onChange={(e) => update("origem_identificacao", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* B. DESCRIÇÃO */}
        <section className="card">
          <h2 className="font-semibold text-marinho mb-4">B. Descrição</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Descrição objetiva da não conformidade *</label>
              <textarea
                className="input"
                rows={3}
                value={campos.descricao_objetiva}
                onChange={(e) => update("descricao_objetiva", e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Requisito não atendido</label>
                <input
                  className="input"
                  value={campos.requisito_nao_atendido}
                  onChange={(e) => update("requisito_nao_atendido", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Local da ocorrência</label>
                <input
                  className="input"
                  value={campos.local_ocorrencia}
                  onChange={(e) => update("local_ocorrencia", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Pessoas / veículos / documentos envolvidos</label>
              <input
                className="input"
                value={campos.pessoas_veiculos_documentos}
                onChange={(e) => update("pessoas_veiculos_documentos", e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="label">Impacto identificado</label>
                <input
                  className="input"
                  value={campos.impacto_identificado}
                  onChange={(e) => update("impacto_identificado", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Risco relacionado</label>
                <input
                  className="input"
                  value={campos.risco_relacionado}
                  onChange={(e) => update("risco_relacionado", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Classificação da criticidade</label>
                <select
                  className="input"
                  value={campos.criticidade}
                  onChange={(e) => update("criticidade", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* C. EVIDÊNCIAS */}
        <section className="card">
          <h2 className="font-semibold text-marinho mb-4">C. Evidências</h2>
          <p className="text-sm text-slate-500 mb-3">
            O upload de arquivos fica disponível após salvar o registro (aba de evidências na tela de detalhe).
          </p>
          <div>
            <label className="label">Justificativa (quando não houver evidência)</label>
            <textarea
              className="input"
              rows={2}
              value={campos.justificativa_sem_evidencia}
              onChange={(e) => update("justificativa_sem_evidencia", e.target.value)}
            />
          </div>
        </section>

        {/* D. CORREÇÃO IMEDIATA */}
        <section className="card">
          <h2 className="font-semibold text-marinho mb-4">D. Correção imediata</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Ação de contenção / correção executada</label>
              <textarea
                className="input"
                rows={2}
                value={campos.acao_contencao}
                onChange={(e) => update("acao_contencao", e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="label">Responsável</label>
                <input
                  className="input"
                  value={campos.correcao_responsavel}
                  onChange={(e) => update("correcao_responsavel", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Data</label>
                <input
                  type="date"
                  className="input"
                  value={campos.correcao_data}
                  onChange={(e) => update("correcao_data", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Resultado imediato</label>
                <input
                  className="input"
                  value={campos.correcao_resultado}
                  onChange={(e) => update("correcao_resultado", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="comunicacao_cliente"
                checked={campos.comunicacao_cliente}
                onChange={(e) => update("comunicacao_cliente", e.target.checked)}
              />
              <label htmlFor="comunicacao_cliente" className="text-sm text-slate-700">
                Houve comunicação ao cliente
              </label>
            </div>
            {campos.comunicacao_cliente && (
              <textarea
                className="input"
                rows={2}
                placeholder="Detalhamento da comunicação"
                value={campos.comunicacao_cliente_detalhe}
                onChange={(e) => update("comunicacao_cliente_detalhe", e.target.value)}
              />
            )}
          </div>
        </section>

        {!acessoTotal && (
          <p className="text-sm text-slate-500">
            As etapas E a I (comunicação formal, análise de causa raiz, plano de ação, replicação e
            encerramento) são preenchidas pela Controladoria após o envio deste registro.
          </p>
        )}

        <div className="flex items-center gap-3 pb-10">
          <button
            className="btn-outline"
            disabled={salvando !== null}
            onClick={() => salvar("rascunho")}
          >
            {salvando === "rascunho" ? "Salvando..." : "Salvar rascunho"}
          </button>
          <button
            className="btn-primary"
            disabled={salvando !== null}
            onClick={() => salvar("enviar")}
          >
            {salvando === "enviar" ? "Enviando..." : "Enviar para a Controladoria"}
          </button>
        </div>
      </main>
    </div>
  );
}
