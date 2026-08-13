-- =========================================================================
-- Permite excluir registros de Não Conformidade — restrito ao perfil TI.
-- Isso é intencional: apagar um registro é uma ação sensível do ponto de
-- vista de auditoria/ISO 9001 (o processo normal é encerrar, não apagar).
-- Mantemos aberto só para TI conseguir limpar registros de teste.
--
-- Ações corretivas, evidências e histórico são apagados automaticamente
-- junto (relação "on delete cascade" já definida no schema).
--
-- Rode este script no SQL Editor do Supabase.
-- =========================================================================

create policy nc_delete on nao_conformidades
  for delete using ( auth_perfil() = 'admin_ti' );
