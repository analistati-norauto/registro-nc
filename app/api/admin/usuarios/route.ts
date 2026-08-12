import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Cria um novo colaborador: conta de login (Supabase Auth) + linha na
// tabela "usuarios" já com setor/perfil/status definidos. Só quem está
// logado como admin_ti pode chamar esta rota.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: quemPede } = await supabase
    .from("usuarios")
    .select("perfil")
    .eq("id", user.id)
    .single();

  if (quemPede?.perfil !== "admin_ti") {
    return NextResponse.json(
      { error: "Só o perfil de TI pode criar usuários." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { nome, email, senha, setor_id, perfil, cargo } = body;

  if (!nome || !email || !senha || !perfil) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter ao menos 6 caracteres." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: novoAuthUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (authError || !novoAuthUser.user) {
    return NextResponse.json(
      { error: "Erro ao criar login: " + (authError?.message ?? "erro desconhecido") },
      { status: 400 }
    );
  }

  // O trigger on_auth_user_created já cria a linha em "usuarios" (com
  // perfil 'setor' e ativo=false por padrão) — aqui sobrescrevemos com
  // os valores escolhidos pelo TI.
  const { error: updateError } = await admin
    .from("usuarios")
    .update({ setor_id: setor_id || null, perfil, cargo: cargo || null, ativo: true })
    .eq("id", novoAuthUser.user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Login criado, mas falhou ao definir perfil: " + updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: novoAuthUser.user.id });
}
