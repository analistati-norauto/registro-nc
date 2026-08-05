-- =========================================================================
-- Sincroniza auth.users -> public.usuarios automaticamente.
-- Novo usuário entra como perfil 'setor' e inativo até o TI configurar
-- setor e perfil corretos na tela de Administração.
-- =========================================================================

create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, perfil, ativo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'setor',
    false -- TI deve ativar e definir setor/perfil corretos
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_novo_usuario();

-- Primeiro usuário admin: após criar a conta pelo Supabase Auth,
-- rode manualmente (substituindo o e-mail):
--
-- update usuarios set perfil = 'admin_ti', ativo = true
-- where email = 'ti@norauto.com.br';
