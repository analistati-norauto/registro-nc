-- =========================================================================
-- CORREÇÃO: recursão infinita nas políticas RLS de "usuarios"
-- (erro Postgres 54001 "stack depth limit exceeded")
--
-- Causa: auth_perfil() e auth_setor_id() faziam um SELECT na própria
-- tabela "usuarios", o que reacionava a política de RLS dessa tabela,
-- que por sua vez chamava auth_perfil() de novo — loop infinito.
--
-- Correção: marcar as funções como SECURITY DEFINER, para que rodem com
-- privilégios elevados e NÃO passem pela checagem de RLS ao consultar
-- "usuarios" internamente. Rode este script inteiro no SQL Editor do
-- Supabase.
-- =========================================================================

create or replace function auth_perfil()
returns perfil_usuario
language sql stable security definer
set search_path = public
as $$
  select perfil from usuarios where id = auth.uid();
$$;

create or replace function auth_setor_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select setor_id from usuarios where id = auth.uid();
$$;

-- auth_tem_acesso_total() e auth_pode_editar_etapas_controladoria() chamam
-- auth_perfil(), então herdam a correção automaticamente — mas recriamos
-- para garantir que apontem para a versão nova.
create or replace function auth_tem_acesso_total()
returns boolean
language sql stable
as $$
  select auth_perfil() in ('admin_ti', 'diretoria', 'controladoria');
$$;

create or replace function auth_pode_editar_etapas_controladoria()
returns boolean
language sql stable
as $$
  select auth_perfil() in ('controladoria', 'diretoria', 'admin_ti');
$$;
