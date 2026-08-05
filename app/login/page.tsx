"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha inválidos. Verifique e tente novamente.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-marinho px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amarelo mb-4">
            <span className="text-marinho font-bold text-xl">N</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Norauto Rent a Car</h1>
          <p className="text-slate-300 text-sm mt-1">
            Gestão de Não Conformidades e Ações Corretivas
          </p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="label">E-mail corporativo</label>
            <input
              type="email"
              required
              className="input"
              placeholder="voce@norauto.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              required
              className="input"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {erro}
            </p>
          )}

          <button type="submit" disabled={carregando} className="btn-primary w-full">
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-slate-400 text-xs mt-6">
          Acesso restrito a colaboradores autorizados da Norauto.
        </p>
      </div>
    </div>
  );
}
