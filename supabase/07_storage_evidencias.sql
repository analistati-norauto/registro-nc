-- =========================================================================
-- FASE 2 — Armazenamento de evidências (Supabase Storage)
-- Rode este script no SQL Editor do Supabase.
-- =========================================================================

-- 1) Cria o bucket "evidencias" (privado — só acessível via URL assinada
-- ou por quem tem permissão de leitura via política abaixo).
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

-- 2) Políticas de acesso aos arquivos.
-- Convenção de caminho usada pelo app: evidencias/{nao_conformidade_id}/{arquivo}
-- Isso permite checar a permissão olhando o primeiro segmento do path.

-- Leitura: mesma regra de quem pode ver a NC (próprio setor, ou acesso total)
create policy "evidencias_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'evidencias'
  and exists (
    select 1 from nao_conformidades nc
    where nc.id::text = (storage.foldername(name))[1]
      and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
  )
);

-- Upload: mesma regra de quem pode ver a NC (setor dono, ou acesso total)
create policy "evidencias_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'evidencias'
  and exists (
    select 1 from nao_conformidades nc
    where nc.id::text = (storage.foldername(name))[1]
      and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
  )
);

-- Exclusão: só quem tem acesso total (Controladoria/Diretoria/TI) ou o
-- próprio setor dono do registro
create policy "evidencias_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'evidencias'
  and exists (
    select 1 from nao_conformidades nc
    where nc.id::text = (storage.foldername(name))[1]
      and (auth_tem_acesso_total() or nc.setor_id = auth_setor_id())
  )
);
