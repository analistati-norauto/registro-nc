"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { Perfil } from "@/types/db";

const PERFIL_LABEL: Record<Perfil, string> = {
  admin_ti: "TI",
  diretoria: "Diretoria",
  controladoria: "Controladoria",
  setor: "Setor",
};

export default function NavBar({
  nome,
  perfil,
  setor,
}: {
  nome: string;
  perfil: Perfil;
  setor?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-marinho text-white">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <span className="w-8 h-8 rounded-full bg-amarelo text-marinho flex items-center justify-center text-sm">
              N
            </span>
            Gestão de NC
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-200 hover:text-white">
            Painel
          </Link>
          <Link href="/nc/new" className="text-sm text-slate-200 hover:text-white">
            Nova Não Conformidade
          </Link>
          {perfil === "admin_ti" && (
            <Link href="/admin/usuarios" className="text-sm text-slate-200 hover:text-white">
              Usuários
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right leading-tight">
            <div className="font-medium">{nome}</div>
            <div className="text-slate-300 text-xs">
              {PERFIL_LABEL[perfil]}
              {setor ? ` · ${setor}` : ""}
            </div>
          </div>
          <button onClick={sair} className="btn-secondary !py-1.5 !px-3 text-xs">
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}
