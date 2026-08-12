import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import AdminUsuariosClient from "@/components/AdminUsuariosClient";
import { getUsuarioAtual } from "@/lib/data";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.perfil !== "admin_ti") redirect("/dashboard");

  const supabase = createClient();
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nome, email, setor_id, perfil, ativo, setores(nome)")
    .order("nome");

  const { data: setores } = await supabase.from("setores").select("id, nome, ativo").order("nome");

  return (
    <div>
      <NavBar nome={usuario.nome} perfil={usuario.perfil} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-marinho mb-1">Administração de usuários</h1>
        <AdminUsuariosClient usuariosIniciais={(usuarios as any) ?? []} setores={(setores as any) ?? []} />
      </main>
    </div>
  );
}
