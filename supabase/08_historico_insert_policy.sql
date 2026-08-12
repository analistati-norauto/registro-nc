-- =========================================================================
-- FASE 2 — Permite que o navegador grave no histórico ao anexar/remover
-- evidências (até aqui, só o trigger interno de mudança de status gravava,
-- via função com privilégio elevado). Rode no SQL Editor do Supabase.
-- =========================================================================

create policy historico_insert on historico
  for insert with check (
    exists (
      select 1 from nao_conformidades nc
      where nc.id = historico.nao_conformidade_id
        and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
    )
  );
