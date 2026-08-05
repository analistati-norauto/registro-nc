"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { Perfil, StatusNC } from "@/types/db";
import { STATUS_LABEL, temAcessoTotal, podeEditarEtapasControladoria } from "@/types/db";

export default function NCDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [meuSetorId, setMeuSetorId] = useState<string | null>(null);
  const [nc, setNc] = useState<any>(null);
  const [acoes, setAcoes] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
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
      setMeuSetorId(usuario.setor_id);
    }

    const { data: registro } = await supabase
      .from("nao_conformidades")
      .select("*, setores(nome)")
      .eq("id", id)
      .single();
    setNc(registro);

    const { data: listaAcoes } = await supabase
      .from("acoes_corretivas")
      .select("*")
      .eq("nao_conformidade_id", id)
      .order("criado_em");
    setAcoes(listaAcoes ?? []);

    const { data: listaHistorico } = await supabase
      .from("historico")
      .select("*, usuarios(nome)")
      .eq("nao_conformidade_id", id)
      .order("data_hora", { ascending: false });
    setHistorico(listaHistorico ?? []);

    const { data: listaSetores } = await supabase.from("setores").select("id, nome").eq("ativo", true);
    setSetores(listaSetores ?? []);

    setCarregando(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando || !nc || !perfil) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-slate-500">Carregando registro...</div>;
  }

  const acessoTotal = temAcessoTotal(perfil);
  const podeEtapasE_I = podeEditarEtapasControladoria(perfil);
  const donoDoSetor = nc.setor_id === meuSetorId;
  const podeEditarA_D =
    acessoTotal || (donoDoSetor && ["rascunho", "devolvido_complementacao", "plano_acao_execucao"].includes(nc.status));

  function set(field: string, value: any) {
    setNc((n: any) => ({ ...n, [field]: value }));
  }

  async function salvarCampos(campos: Record<string, any>) {
    setSalvando(true);
    setMsg(null);
    const { error } = await supabase.from("nao_conformidades").update(campos).eq("id", id);
    setSalvando(false);
    if (error) {
      setMsg("Erro ao salvar: " + error.message);
    } else {
      setMsg("Alterações salvas.");
      carregar();
    }
  }

  async function mudarStatus(novoStatus: StatusNC, extra: Record<string, any> = {}) {
    setSalvando(true);
    setMsg(null);
    const payload: Record<string, any> = { status: novoStatus, ...extra };
    if (novoStatus === "encerrado") payload.encerrado_em = new Date().toISOString();
    const { error } = await supabase.from("nao_conformidades").update(payload).eq("id", id);
    setSalvando(false);
    if (error) {
      setMsg("Erro ao mudar status: " + error.message);
    } else {
      carregar();
    }
  }

  async function adicionarAcao() {
    const { error } = await supabase.from("acoes_corretivas").insert({
      nao_conformidade_id: id,
      descricao: "Nova ação corretiva",
    });
    if (!error) carregar();
  }

  async function atualizarAcao(acaoId: string, campos: Record<string, any>) {
    await supabase.from("acoes_corretivas").update(campos).eq("id", acaoId);
    carregar();
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="bg-marinho text-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">{nc.numero}</h1>
            <p className="text-slate-300 text-sm">
              {nc.setores?.nome} · {STATUS_LABEL[nc.status as StatusNC]}
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => router.push(`/api/nc/${id}/pdf`)}
          >
            Gerar PDF
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-md px-4 py-2">{msg}</div>}

        {/* Ações de fluxo (status) */}
        <section className="card flex flex-wrap gap-3">
          {nc.status === "rascunho" && podeEditarA_D && (
            <button className="btn-primary" disabled={salvando} onClick={() => mudarStatus("enviado_controladoria")}>
              Enviar para a Controladoria
            </button>
          )}
          {podeEtapasE_I && ["enviado_controladoria", "aguardando_triagem"].includes(nc.status) && (
            <button className="btn-primary" disabled={salvando} onClick={() => mudarStatus("em_analise")}>
              Iniciar análise
            </button>
          )}
          {podeEtapasE_I && !["encerrado", "rascunho"].includes(nc.status) && (
            <button
              className="btn-outline"
              disabled={salvando}
              onClick={() => {
                const motivo = prompt("Motivo da devolução:");
                if (motivo) mudarStatus("devolvido_complementacao", { motivo_devolucao: motivo });
              }}
            >
              Solicitar complementação
            </button>
          )}
          {podeEtapasE_I && nc.status === "em_analise" && (
            <button className="btn-primary" disabled={salvando} onClick={() => mudarStatus("plano_acao_execucao")}>
              Iniciar plano de ação
            </button>
          )}
          {podeEtapasE_I && nc.status === "plano_acao_execucao" && (
            <button
              className="btn-primary"
              disabled={salvando}
              onClick={() => mudarStatus("aguardando_verificacao_eficacia")}
            >
              Enviar para verificação de eficácia
            </button>
          )}
          {podeEtapasE_I && nc.status === "aguardando_verificacao_eficacia" && (
            <button className="btn-primary" disabled={salvando} onClick={() => mudarStatus("encerrado")}>
              Encerrar processo
            </button>
          )}
          {podeEtapasE_I && nc.status === "encerrado" && (
            <button className="btn-outline" disabled={salvando} onClick={() => mudarStatus("reaberto")}>
              Reabrir
            </button>
          )}
        </section>

        {nc.status === "devolvido_complementacao" && nc.motivo_devolucao && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-4 py-3">
            <strong>Pendência da Controladoria:</strong> {nc.motivo_devolucao}
          </div>
        )}

        {/* A. IDENTIFICAÇÃO (somente leitura aqui, editado na criação) */}
        <section className="card">
          <h2 className="font-semibold text-marinho mb-3">A. Identificação</h2>
          <dl className="grid md:grid-cols-2 gap-3 text-sm">
            <Info label="Unidade" value={nc.unidade} />
            <Info label="Área/Processo" value={nc.area_processo} />
            <Info label="Contrato/Cliente" value={nc.contrato_cliente} />
            <Info label="Liderança responsável" value={nc.lideranca_responsavel} />
            <Info label="Origem da identificação" value={nc.origem_identificacao} />
            <Info label="Data da ocorrência" value={nc.data_ocorrencia} />
          </dl>
        </section>

        {/* B. DESCRIÇÃO */}
        <section className="card">
          <h2 className="font-semibold text-marinho mb-3">B. Descrição</h2>
          <dl className="space-y-2 text-sm">
            <Info label="Descrição objetiva" value={nc.descricao_objetiva} bloco />
            <Info label="Requisito não atendido" value={nc.requisito_nao_atendido} />
            <Info label="Impacto identificado" value={nc.impacto_identificado} />
            <Info label="Criticidade" value={nc.criticidade} />
          </dl>
        </section>

        {/* E. COMUNICAÇÃO FORMAL — Controladoria/Diretoria/TI */}
        <EditableSection
          titulo="E. Comunicação formal"
          podeEditar={podeEtapasE_I}
          onSalvar={() =>
            salvarCampos({
              comunicacao_data: nc.comunicacao_data || null,
              comunicacao_referencia_email: nc.comunicacao_referencia_email,
              comunicacao_copia_diretoria: nc.comunicacao_copia_diretoria,
              comunicacao_observacoes: nc.comunicacao_observacoes,
            })
          }
          salvando={salvando}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <Campo label="Data do e-mail" tipo="date" value={nc.comunicacao_data} onChange={(v) => set("comunicacao_data", v)} editavel={podeEtapasE_I} />
            <Campo label="Referência do e-mail" value={nc.comunicacao_referencia_email} onChange={(v) => set("comunicacao_referencia_email", v)} editavel={podeEtapasE_I} />
          </div>
          <Campo label="Observações" area value={nc.comunicacao_observacoes} onChange={(v) => set("comunicacao_observacoes", v)} editavel={podeEtapasE_I} />
        </EditableSection>

        {/* F. ANÁLISE DE CAUSA RAIZ */}
        <EditableSection
          titulo="F. Análise de causa raiz"
          podeEditar={podeEtapasE_I}
          onSalvar={() =>
            salvarCampos({
              analise_metodo: nc.analise_metodo,
              causa_imediata: nc.causa_imediata,
              causa_contribuinte: nc.causa_contribuinte,
              causa_raiz: nc.causa_raiz,
              controles_falharam: nc.controles_falharam,
              outras_areas_expostas: nc.outras_areas_expostas,
              participantes_analise: nc.participantes_analise,
            })
          }
          salvando={salvando}
        >
          <Campo label="Método utilizado" value={nc.analise_metodo} onChange={(v) => set("analise_metodo", v)} editavel={podeEtapasE_I} />
          <Campo label="Causa imediata" area value={nc.causa_imediata} onChange={(v) => set("causa_imediata", v)} editavel={podeEtapasE_I} />
          <Campo label="Causa contribuinte" area value={nc.causa_contribuinte} onChange={(v) => set("causa_contribuinte", v)} editavel={podeEtapasE_I} />
          <Campo label="Causa raiz" area value={nc.causa_raiz} onChange={(v) => set("causa_raiz", v)} editavel={podeEtapasE_I} />
          <Campo label="Controles que falharam" area value={nc.controles_falharam} onChange={(v) => set("controles_falharam", v)} editavel={podeEtapasE_I} />
        </EditableSection>

        {/* G. PLANO DE AÇÃO CORRETIVA */}
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-marinho">G. Plano de ação corretiva</h2>
            {podeEtapasE_I && (
              <button className="btn-outline text-sm" onClick={adicionarAcao}>
                + Adicionar ação
              </button>
            )}
          </div>
          {acoes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma ação corretiva cadastrada.</p>
          ) : (
            <div className="space-y-4">
              {acoes.map((a) => (
                <div key={a.id} className="border border-slate-200 rounded-md p-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Campo
                      label="Descrição da ação"
                      value={a.descricao}
                      onChange={(v) => setAcoes((list) => list.map((x) => (x.id === a.id ? { ...x, descricao: v } : x)))}
                      onBlurSalvar={(v) => atualizarAcao(a.id, { descricao: v })}
                      editavel={podeEtapasE_I}
                    />
                    <Campo
                      label="Responsável"
                      value={a.responsavel}
                      onChange={(v) => setAcoes((list) => list.map((x) => (x.id === a.id ? { ...x, responsavel: v } : x)))}
                      onBlurSalvar={(v) => atualizarAcao(a.id, { responsavel: v })}
                      editavel={podeEtapasE_I}
                    />
                    <Campo
                      label="Prazo"
                      tipo="date"
                      value={a.prazo}
                      onChange={(v) => setAcoes((list) => list.map((x) => (x.id === a.id ? { ...x, prazo: v } : x)))}
                      onBlurSalvar={(v) => atualizarAcao(a.id, { prazo: v || null })}
                      editavel={podeEtapasE_I}
                    />
                    <div>
                      <label className="label">Status</label>
                      <select
                        className="input"
                        value={a.status}
                        disabled={!(podeEtapasE_I || a.setor_responsavel_id === meuSetorId)}
                        onChange={(e) => atualizarAcao(a.id, { status: e.target.value })}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em andamento</option>
                        <option value="concluida">Concluída</option>
                        <option value="atrasada">Atrasada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>
                  <Campo
                    label="Critério de eficácia"
                    area
                    value={a.criterio_eficacia}
                    onChange={(v) => setAcoes((list) => list.map((x) => (x.id === a.id ? { ...x, criterio_eficacia: v } : x)))}
                    onBlurSalvar={(v) => atualizarAcao(a.id, { criterio_eficacia: v })}
                    editavel={podeEtapasE_I}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* H. REPLICAÇÃO */}
        <EditableSection
          titulo="H. Replicação da solução"
          podeEditar={podeEtapasE_I}
          onSalvar={() =>
            salvarCampos({
              replicacao_necessaria: nc.replicacao_necessaria,
              replicacao_unidades_avaliadas: nc.replicacao_unidades_avaliadas,
              replicacao_unidades_abrangidas: nc.replicacao_unidades_abrangidas,
              replicacao_responsaveis: nc.replicacao_responsaveis,
              replicacao_prazo: nc.replicacao_prazo || null,
              replicacao_resultado: nc.replicacao_resultado,
            })
          }
          salvando={salvando}
        >
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!nc.replicacao_necessaria}
              disabled={!podeEtapasE_I}
              onChange={(e) => set("replicacao_necessaria", e.target.checked)}
            />
            <label className="text-sm">A solução precisa ser replicada?</label>
          </div>
          <Campo label="Unidades avaliadas" value={nc.replicacao_unidades_avaliadas} onChange={(v) => set("replicacao_unidades_avaliadas", v)} editavel={podeEtapasE_I} />
          <Campo label="Unidades/processos abrangidos" value={nc.replicacao_unidades_abrangidas} onChange={(v) => set("replicacao_unidades_abrangidas", v)} editavel={podeEtapasE_I} />
          <Campo label="Resultado da replicação" area value={nc.replicacao_resultado} onChange={(v) => set("replicacao_resultado", v)} editavel={podeEtapasE_I} />
        </EditableSection>

        {/* I. ENCERRAMENTO */}
        <EditableSection
          titulo="I. Encerramento"
          podeEditar={podeEtapasE_I}
          onSalvar={() =>
            salvarCampos({
              encerramento_conclusao: nc.encerramento_conclusao,
              encerramento_avaliacao_eficacia: nc.encerramento_avaliacao_eficacia,
              encerramento_licoes_aprendidas: nc.encerramento_licoes_aprendidas,
              encerramento_confirma_causa_tratada: nc.encerramento_confirma_causa_tratada,
              encerramento_confirma_acoes_implementadas: nc.encerramento_confirma_acoes_implementadas,
              encerramento_confirma_evidencias_registradas: nc.encerramento_confirma_evidencias_registradas,
              encerramento_confirma_eficacia_verificada: nc.encerramento_confirma_eficacia_verificada,
              encerramento_confirma_processo_controle: nc.encerramento_confirma_processo_controle,
            })
          }
          salvando={salvando}
        >
          <Campo label="Conclusão" area value={nc.encerramento_conclusao} onChange={(v) => set("encerramento_conclusao", v)} editavel={podeEtapasE_I} />
          <Campo label="Avaliação de eficácia" area value={nc.encerramento_avaliacao_eficacia} onChange={(v) => set("encerramento_avaliacao_eficacia", v)} editavel={podeEtapasE_I} />
          <Campo label="Lições aprendidas" area value={nc.encerramento_licoes_aprendidas} onChange={(v) => set("encerramento_licoes_aprendidas", v)} editavel={podeEtapasE_I} />
          <div className="space-y-2 text-sm">
            {[
              ["encerramento_confirma_causa_tratada", "A causa raiz foi tratada"],
              ["encerramento_confirma_acoes_implementadas", "As ações foram implementadas"],
              ["encerramento_confirma_evidencias_registradas", "As evidências foram registradas"],
              ["encerramento_confirma_eficacia_verificada", "A eficácia foi verificada"],
              ["encerramento_confirma_processo_controle", "O processo está sob controle"],
            ].map(([campo, label]) => (
              <div key={campo} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!nc[campo]}
                  disabled={!podeEtapasE_I}
                  onChange={(e) => set(campo, e.target.checked)}
                />
                <label>{label}</label>
              </div>
            ))}
          </div>
        </EditableSection>

        {/* HISTÓRICO */}
        <section className="card">
          <h2 className="font-semibold text-marinho mb-3">Histórico</h2>
          <ul className="space-y-2 text-sm">
            {historico.map((h) => (
              <li key={h.id} className="border-b last:border-0 pb-2">
                <span className="text-slate-400">
                  {new Date(h.data_hora).toLocaleString("pt-BR")}
                </span>{" "}
                — <strong>{h.usuarios?.nome ?? "Sistema"}</strong>: {formatarAcaoHistorico(h)}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function formatarAcaoHistorico(h: any) {
  if (h.acao === "criacao") return "criou o registro";
  if (h.acao === "mudanca_status")
    return `alterou o status de "${STATUS_LABEL[h.detalhes?.de as StatusNC] ?? h.detalhes?.de}" para "${
      STATUS_LABEL[h.detalhes?.para as StatusNC] ?? h.detalhes?.para
    }"`;
  return h.acao;
}

function Info({ label, value, bloco }: { label: string; value: any; bloco?: boolean }) {
  return (
    <div className={bloco ? "md:col-span-2" : ""}>
      <dt className="text-slate-400 text-xs">{label}</dt>
      <dd className="text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  onBlurSalvar,
  editavel,
  area,
  tipo = "text",
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  onBlurSalvar?: (v: any) => void;
  editavel: boolean;
  area?: boolean;
  tipo?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {area ? (
        <textarea
          className="input"
          rows={2}
          value={value || ""}
          disabled={!editavel}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlurSalvar?.(e.target.value)}
        />
      ) : (
        <input
          type={tipo}
          className="input"
          value={value || ""}
          disabled={!editavel}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlurSalvar?.(e.target.value)}
        />
      )}
    </div>
  );
}

function EditableSection({
  titulo,
  podeEditar,
  onSalvar,
  salvando,
  children,
}: {
  titulo: string;
  podeEditar: boolean;
  onSalvar: () => void;
  salvando: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-marinho">{titulo}</h2>
        {!podeEditar && (
          <span className="text-xs text-slate-400">Preenchido pela Controladoria</span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
      {podeEditar && (
        <div className="mt-4">
          <button className="btn-outline text-sm" disabled={salvando} onClick={onSalvar}>
            {salvando ? "Salvando..." : "Salvar seção"}
          </button>
        </div>
      )}
    </section>
  );
}
