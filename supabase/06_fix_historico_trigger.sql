-- =========================================================================
-- CORREÇÃO: "new row violates row-level security policy for table historico"
--
-- Causa: o trigger nc_registra_historico() insere automaticamente em
-- "historico" a cada criação/mudança de status de uma NC. Como esse insert
-- roda com o papel do usuário logado (authenticated) e não existe política
-- de INSERT na tabela "historico" (só existe a de SELECT), o banco bloqueia
-- a gravação — e como o insert está dentro da mesma transação do
-- INSERT/UPDATE em "nao_conformidades", a operação inteira falha.
--
-- Correção: marcar a função do trigger como SECURITY DEFINER, para que
-- grave o histórico com privilégio elevado (é lógica interna do sistema,
-- não uma ação livre do usuário). Rode este script no SQL Editor do
-- Supabase.
-- =========================================================================

create or replace function nc_registra_historico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into historico (nao_conformidade_id, usuario_id, acao, detalhes)
    values (new.id, new.criado_por, 'criacao', jsonb_build_object('status', new.status));
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into historico (nao_conformidade_id, usuario_id, acao, detalhes)
    values (new.id, auth.uid(), 'mudanca_status',
      jsonb_build_object('de', old.status, 'para', new.status));
  end if;
  return new;
end;
$$;

-- Verificação: deve retornar "true"
select proname as funcao, prosecdef as e_security_definer
from pg_proc
where proname = 'nc_registra_historico';
