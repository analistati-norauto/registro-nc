-- =========================================================================
-- NORAUTO | Políticas de Row Level Security (RLS)
-- Regras de acesso aplicadas no banco — não apenas na interface.
--
-- Matriz de permissões:
--  - admin_ti      : vê tudo, administra usuários/setores. NÃO opera etapas
--                     de negócio por padrão, mas TEM acesso total conforme
--                     pedido do cliente (criar NC, editar, etapas E-I).
--  - diretoria     : vê tudo, cria NC, edita, preenche etapas E-I. Acesso total.
--  - controladoria : vê tudo, cria NC (opcional), preenche etapas E-I,
--                     faz triagem, devolve, encerra. Acesso total.
--  - setor         : vê e edita apenas registros do próprio setor,
--                     apenas em status permitido (rascunho / devolvido),
--                     preenche etapas A-D.
-- =========================================================================

alter table usuarios enable row level security;
alter table setores enable row level security;
alter table nao_conformidades enable row level security;
alter table acoes_corretivas enable row level security;
alter table evidencias enable row level security;
alter table historico enable row level security;

-- ---------------------------------------------------------------------
-- USUÁRIOS
-- ---------------------------------------------------------------------

create policy usuarios_select on usuarios
  for select using (
    id = auth.uid() or auth_perfil() in ('admin_ti','diretoria','controladoria')
  );

create policy usuarios_insert_admin on usuarios
  for insert with check ( auth_perfil() = 'admin_ti' );

create policy usuarios_update_admin on usuarios
  for update using ( auth_perfil() = 'admin_ti' or id = auth.uid() );

-- ---------------------------------------------------------------------
-- SETORES
-- ---------------------------------------------------------------------

create policy setores_select on setores
  for select using ( true ); -- todo usuário autenticado precisa ver a lista

create policy setores_admin on setores
  for all using ( auth_perfil() = 'admin_ti' )
  with check ( auth_perfil() = 'admin_ti' );

-- ---------------------------------------------------------------------
-- NÃO CONFORMIDADES
-- ---------------------------------------------------------------------

-- SELECT: setor vê só o próprio; admin_ti/diretoria/controladoria veem tudo
create policy nc_select on nao_conformidades
  for select using (
    auth_tem_acesso_total()
    or setor_id = auth_setor_id()
  );

-- INSERT: qualquer usuário ativo pode criar NC do PRÓPRIO setor;
-- diretoria/admin_ti/controladoria podem criar para qualquer setor.
create policy nc_insert on nao_conformidades
  for insert with check (
    auth_tem_acesso_total()
    or setor_id = auth_setor_id()
  );

-- UPDATE: regra por status e perfil
create policy nc_update on nao_conformidades
  for update using (
    auth_tem_acesso_total()
    or (
      setor_id = auth_setor_id()
      and status in ('rascunho', 'devolvido_complementacao', 'plano_acao_execucao')
    )
  )
  with check (
    auth_tem_acesso_total()
    or (
      setor_id = auth_setor_id()
      and status in ('rascunho', 'enviado_controladoria', 'devolvido_complementacao', 'plano_acao_execucao')
    )
  );

-- ---------------------------------------------------------------------
-- AÇÕES CORRETIVAS
-- ---------------------------------------------------------------------

create policy acoes_select on acoes_corretivas
  for select using (
    exists (
      select 1 from nao_conformidades nc
      where nc.id = acoes_corretivas.nao_conformidade_id
        and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
    )
  );

-- Criação/edição do plano de ação: Controladoria/Diretoria/TI sempre;
-- setor responsável pode atualizar (ex.: status/observações) suas próprias
-- ações quando a NC está em execução.
create policy acoes_insert on acoes_corretivas
  for insert with check ( auth_pode_editar_etapas_controladoria() );

create policy acoes_update on acoes_corretivas
  for update using (
    auth_pode_editar_etapas_controladoria()
    or setor_responsavel_id = auth_setor_id()
  );

create policy acoes_delete on acoes_corretivas
  for delete using ( auth_pode_editar_etapas_controladoria() );

-- ---------------------------------------------------------------------
-- EVIDÊNCIAS
-- ---------------------------------------------------------------------

create policy evidencias_select on evidencias
  for select using (
    exists (
      select 1 from nao_conformidades nc
      where nc.id = evidencias.nao_conformidade_id
        and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
    )
  );

create policy evidencias_insert on evidencias
  for insert with check (
    exists (
      select 1 from nao_conformidades nc
      where nc.id = evidencias.nao_conformidade_id
        and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
    )
  );

-- ---------------------------------------------------------------------
-- HISTÓRICO (somente leitura para os usuários; escrita via triggers)
-- ---------------------------------------------------------------------

create policy historico_select on historico
  for select using (
    exists (
      select 1 from nao_conformidades nc
      where nc.id = historico.nao_conformidade_id
        and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
    )
  );

create policy historico_insert on historico
  for insert with check (
    exists (
      select 1 from nao_conformidades nc
      where nc.id = historico.nao_conformidade_id
        and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
    )
  );
