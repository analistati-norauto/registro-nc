"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Evidencia {
  id: string;
  nome: string;
  caminho: string;
  tipo: string | null;
  tamanho: number | null;
  data_envio: string;
  usuarios?: { nome: string } | null;
}

function formatarTamanho(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EvidenciasSection({
  ncId,
  evidencias,
  podeEnviar,
  podeExcluir,
  onAtualizar,
}: {
  ncId: string;
  evidencias: Evidencia[];
  podeEnviar: boolean;
  podeExcluir: boolean;
  onAtualizar: () => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const nomeSanitizado = arquivo.name.replace(/[^\w.\-]/g, "_");
      const caminho = `${ncId}/${Date.now()}_${nomeSanitizado}`;

      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(caminho, arquivo, { upsert: false });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("evidencias").insert({
        nao_conformidade_id: ncId,
        nome: arquivo.name,
        caminho,
        tipo: arquivo.type || null,
        tamanho: arquivo.size,
        enviado_por: user.id,
      });

      if (insertError) throw insertError;

      // Registra no histórico para manter a rastreabilidade completa.
      await supabase.from("historico").insert({
        nao_conformidade_id: ncId,
        usuario_id: user.id,
        acao: "evidencia_anexada",
        detalhes: { nome: arquivo.name },
      });

      onAtualizar();
    } catch (err: any) {
      setErro("Falha ao enviar arquivo: " + (err.message ?? "erro desconhecido"));
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function baixar(ev: Evidencia) {
    const { data, error } = await supabase.storage
      .from("evidencias")
      .createSignedUrl(ev.caminho, 60); // link válido por 60s
    if (error || !data) {
      setErro("Não foi possível gerar o link de download.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function excluir(ev: Evidencia) {
    if (!confirm(`Remover o arquivo "${ev.nome}"?`)) return;
    await supabase.storage.from("evidencias").remove([ev.caminho]);
    await supabase.from("evidencias").delete().eq("id", ev.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("historico").insert({
      nao_conformidade_id: ncId,
      usuario_id: user?.id,
      acao: "evidencia_removida",
      detalhes: { nome: ev.nome },
    });

    onAtualizar();
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-marinho">C. Evidências</h2>
        {podeEnviar && (
          <label className="btn-outline text-sm cursor-pointer">
            {enviando ? "Enviando..." : "+ Anexar arquivo"}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              disabled={enviando}
              onChange={handleUpload}
            />
          </label>
        )}
      </div>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
          {erro}
        </p>
      )}

      {evidencias.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma evidência anexada ainda.</p>
      ) : (
        <div className="space-y-2">
          {evidencias.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-slate-800">{ev.nome}</div>
                <div className="text-xs text-slate-400">
                  {ev.usuarios?.nome ?? "—"} · {new Date(ev.data_envio).toLocaleString("pt-BR")}
                  {ev.tamanho ? ` · ${formatarTamanho(ev.tamanho)}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-marinho font-medium hover:underline" onClick={() => baixar(ev)}>
                  Baixar
                </button>
                {podeExcluir && (
                  <button className="text-red-600 hover:underline" onClick={() => excluir(ev)}>
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
