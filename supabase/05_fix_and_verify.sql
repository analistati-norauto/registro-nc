-- 1) Reaplica a correção (seguro rodar de novo)
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

-- 2) Verifica se a correção realmente está ativa.
-- "e_security_definer" precisa aparecer como "true" nas duas linhas.
select
  proname as funcao,
  prosecdef as e_security_definer
from pg_proc
where proname in ('auth_perfil', 'auth_setor_id');
