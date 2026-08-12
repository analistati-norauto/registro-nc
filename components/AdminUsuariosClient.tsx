"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Perfil, Setor } from "@/types/db";

interface UsuarioLinha {
  id: string;
  nome: string;
  email: string;
  setor_id: string | null;
  perfil: Perfil;
  ativo: boolean;
  setores?: { nome: string } | null;
}

const PERFIL_LABEL: Record<Perfil, string> = {
  admin_ti: "TI (acesso total + admin)",
  diretoria: "Diretoria (acesso total)",
  controladoria: "Controladoria (acesso total)",
  setor: "Setor (só o próprio setor)",
};

export default function AdminUsuariosClient({
  usuariosIniciais,
  setores,
}: {
  usuariosIniciais: UsuarioLinha[];
  setores: Setor[];
}) {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState(usuariosIniciais);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const [novo, setNovo] = useState({
    nome: "",
    email: "",
    senha: "",
    setor_id: "",
    perfil: "setor" as Perfil,
    cargo: "",
  });
  const [criando, setCriando] = useState(false);
  const [erroCriacao, setErroCriacao] = useState<string | null>(null);
  const [sucessoCriacao, setSucessoCriacao] = useState<string | null>(null);

  async function recarregar() {
    const { data } = await supabase
      .from("usuarios")
      .select("id, nome, email, setor_id, perfil, ativo, setores(nome)")
      .order("nome");
    setUsuarios((data as any) ?? []);
  }

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setErroCriacao(null);
    setSucessoCriacao(null);
    setCriando(true);

    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo),
    });
    const json = await res.json();

    setCriando(false);

    if (!res.ok) {
      setErroCriacao(json.error ?? "Erro ao criar usuário.");
      return;
    }

    setSucessoCriacao(`Usuário ${novo.email} criado com sucesso.`);
    setNovo({ nome: "", email: "", senha: "", setor_id: "", perfil: "setor", cargo: "" });
    setMostrarForm(false);
    recarregar();
  }

  async function atualizarCampo(id: string, campo: string, valor: any) {
    setSalvandoId(id);
    await supabase.from("usuarios").update({ [campo]: valor }).eq("id", id);
    setSalvandoId(null);
    recarregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm max-w-xl">
          Crie contas de teste com setores e perfis diferentes para validar a
          hierarquia (ex.: um usuário "Operação" só vê o que criar; a
          Controladoria vê tudo).
        </p>
        <button className="btn-primary whitespace-nowrap" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Novo usuário"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={criarUsuario} className="card mb-6 space-y-4">
          <h2 className="font-semibold text-marinho">Criar novo usuário</h2>

          {erroCriacao && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {erroCriacao}
            </p>
          )}
          {sucessoCriacao && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {sucessoCriacao}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome</label>
              <input
                required
                className="input"
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                required
                type="email"
                className="input"
                value={novo.email}
                onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Senha provisória</label>
              <input
                required
                type="text"
                minLength={6}
                className="input"
                placeholder="mínimo 6 caracteres"
                value={novo.senha}
                onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cargo (opcional)</label>
              <input
                className="input"
                value={novo.cargo}
                onChange={(e) => setNovo({ ...novo, cargo: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Perfil de acesso</label>
              <select
                className="input"
                value={novo.perfil}
                onChange={(e) => setNovo({ ...novo, perfil: e.target.value as Perfil })}
              >
                <option value="setor">Setor</option>
                <option value="controladoria">Controladoria</option>
                <option value="diretoria">Diretoria</option>
                <option value="admin_ti">TI (admin)</option>
              </select>
            </div>
            <div>
              <label className="label">Setor</label>
              <select
                className="input"
                value={novo.setor_id}
                onChange={(e) => setNovo({ ...novo, setor_id: e.target.value })}
                disabled={novo.perfil !== "setor"}
              >
                <option value="">
                  {novo.perfil === "setor" ? "Selecione..." : "Não se aplica a este perfil"}
                </option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={criando} className="btn-primary">
            {criando ? "Criando..." : "Criar usuário"}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2 pr-4">Nome</th>
              <th className="py-2 pr-4">E-mail</th>
              <th className="py-2 pr-4">Setor</th>
              <th className="py-2 pr-4">Perfil</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{u.nome}</td>
                <td className="py-2 pr-4 text-slate-500">{u.email}</td>
                <td className="py-2 pr-4">
                  <select
                    className="input !py-1 text-xs"
                    value={u.setor_id ?? ""}
                    disabled={salvandoId === u.id}
                    onChange={(e) => atualizarCampo(u.id, "setor_id", e.target.value || null)}
                  >
                    <option value="">— sem setor —</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <select
                    className="input !py-1 text-xs"
                    value={u.perfil}
                    disabled={salvandoId === u.id}
                    onChange={(e) => atualizarCampo(u.id, "perfil", e.target.value)}
                  >
                    {Object.entries(PERFIL_LABEL).map(([valor, label]) => (
                      <option key={valor} value={valor}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <button
                    className={`badge ${u.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                    disabled={salvandoId === u.id}
                    onClick={() => atualizarCampo(u.id, "ativo", !u.ativo)}
                  >
                    {u.ativo ? "Ativo" : "Inativo"} · clique p/ alternar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
