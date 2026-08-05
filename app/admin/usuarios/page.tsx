import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import { getUsuarioAtual } from "@/lib/data";
import { createClient } from "@/lib/supabase-server";

export default async function AdminUsuariosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.perfil !== "admin_ti") redirect("/dashboard");

  const supabase = createClient();
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, ativo, setores(nome)")
    .order("nome");

  return (
    <div>
      <NavBar nome={usuario.nome} perfil={usuario.perfil} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-marinho mb-1">Administração de usuários</h1>
        <p className="text-slate-500 text-sm mb-6">
          Criação e gestão de contas ficam disponíveis aqui. Novas contas devem ser criadas
          primeiro em Supabase Auth e depois vinculadas a um perfil/setor nesta tela
          (fluxo completo de convite por e-mail entra na Fase 2).
        </p>
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
              {(usuarios ?? []).map((u: any) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{u.nome}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">{u.setores?.nome ?? "—"}</td>
                  <td className="py-2 pr-4">{u.perfil}</td>
                  <td className="py-2 pr-4">{u.ativo ? "Ativo" : "Inativo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
