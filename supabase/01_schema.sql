-- =========================================================================
-- NORAUTO | Gestão de Não Conformidades e Ações Corretivas
-- POL.QUA-013 — Schema Postgres/Supabase — Fase 1
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------

create type perfil_usuario as enum (
  'admin_ti',
  'diretoria',
  'controladoria',
  'setor'
);

create type status_nc as enum (
  'rascunho',
  'enviado_controladoria',
  'aguardando_triagem',
  'devolvido_complementacao',
  'em_analise',
  'aguardando_plano_acao',
  'plano_acao_execucao',
  'aguardando_verificacao_eficacia',
  'encerrado',
  'reaberto'
);

create type criticidade_nc as enum ('baixa', 'media', 'alta');

create type status_acao as enum (
  'pendente',
  'em_andamento',
  'concluida',
  'atrasada',
  'cancelada'
);

-- ---------------------------------------------------------------------
-- SETORES
-- ---------------------------------------------------------------------

create table setores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into setores (nome) values
  ('Operação'), ('Manutenção'), ('Recursos Humanos'),
  ('Financeiro'), ('Comercial'), ('Administrativo');

-- ---------------------------------------------------------------------
-- USUÁRIOS (espelha auth.users do Supabase)
-- ---------------------------------------------------------------------

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  setor_id uuid references setores(id),
  cargo text,
  perfil perfil_usuario not null default 'setor',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Helper: perfil do usuário autenticado (usado nas políticas RLS)
create or replace function auth_perfil()
returns perfil_usuario
language sql stable
as $$
  select perfil from usuarios where id = auth.uid();
$$;

create or replace function auth_setor_id()
returns uuid
language sql stable
as $$
  select setor_id from usuarios where id = auth.uid();
$$;

create or replace function auth_tem_acesso_total()
returns boolean
language sql stable
as $$
  -- Diretoria, TI (admin) e Controladoria têm acesso total de leitura
  -- e, no caso de Diretoria/TI, também de criação e das etapas E-I.
  select auth_perfil() in ('admin_ti', 'diretoria', 'controladoria');
$$;

create or replace function auth_pode_editar_etapas_controladoria()
returns boolean
language sql stable
as $$
  -- Controladoria, Diretoria e TI podem preencher as etapas E a I
  select auth_perfil() in ('controladoria', 'diretoria', 'admin_ti');
$$;

-- ---------------------------------------------------------------------
-- NÃO CONFORMIDADES (campos A até I do Anexo I)
-- ---------------------------------------------------------------------

create table nao_conformidades (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique, -- NC-2026-0001

  status status_nc not null default 'rascunho',
  criticidade criticidade_nc,

  setor_id uuid not null references setores(id),
  criado_por uuid not null references usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  encerrado_em timestamptz,

  -- A. IDENTIFICAÇÃO
  data_registro date not null default current_date,
  data_ocorrencia date,
  unidade text,
  area_processo text,
  contrato_cliente text,
  lideranca_responsavel text,
  responsavel_preenchimento text,
  origem_identificacao text,

  -- B. DESCRIÇÃO
  descricao_objetiva text,
  requisito_nao_atendido text,
  local_ocorrencia text,
  pessoas_veiculos_documentos text,
  impacto_identificado text,
  risco_relacionado text,

  -- C. EVIDÊNCIAS
  justificativa_sem_evidencia text,

  -- D. CORREÇÃO IMEDIATA
  acao_contencao text,
  correcao_responsavel text,
  correcao_data date,
  correcao_resultado text,
  comunicacao_cliente boolean,
  comunicacao_cliente_detalhe text,

  -- E. COMUNICAÇÃO FORMAL (preenchido pela Controladoria/Diretoria/TI)
  comunicacao_data date,
  comunicacao_destinatario text default 'Controladoria',
  comunicacao_copia_diretoria boolean default false,
  comunicacao_referencia_email text,
  comunicacao_observacoes text,

  -- F. ANÁLISE DE CAUSA RAIZ (Controladoria/Diretoria/TI)
  analise_metodo text,
  causa_imediata text,
  causa_contribuinte text,
  causa_raiz text,
  controles_falharam text,
  outras_areas_expostas text,
  participantes_analise text,

  -- H. REPLICAÇÃO DA SOLUÇÃO (Controladoria/Diretoria/TI)
  replicacao_necessaria boolean,
  replicacao_unidades_avaliadas text,
  replicacao_unidades_abrangidas text,
  replicacao_responsaveis text,
  replicacao_prazo date,
  replicacao_resultado text,
  replicacao_observacoes text,

  -- I. ENCERRAMENTO (Controladoria/Diretoria/TI)
  encerramento_conclusao text,
  encerramento_resultado_acoes text,
  encerramento_avaliacao_eficacia text,
  encerramento_responsavel_area text,
  encerramento_controladoria text,
  encerramento_ouvidoria text,
  encerramento_qualidade text,
  encerramento_diretoria text,
  encerramento_licoes_aprendidas text,
  encerramento_confirma_causa_tratada boolean default false,
  encerramento_confirma_acoes_implementadas boolean default false,
  encerramento_confirma_evidencias_registradas boolean default false,
  encerramento_confirma_eficacia_verificada boolean default false,
  encerramento_confirma_processo_controle boolean default false,

  -- Devolução
  motivo_devolucao text
);

create index idx_nc_setor on nao_conformidades(setor_id);
create index idx_nc_status on nao_conformidades(status);
create index idx_nc_criticidade on nao_conformidades(criticidade);
create index idx_nc_numero on nao_conformidades(numero);

-- Numeração automática NC-AAAA-#### -----------------------------------
create sequence if not exists nc_numero_seq;

create or replace function gerar_numero_nc()
returns trigger
language plpgsql
as $$
declare
  ano text := to_char(now(), 'YYYY');
  seq int;
begin
  if new.numero is null then
    select coalesce(max(
      cast(split_part(numero, '-', 3) as int)
    ), 0) + 1
    into seq
    from nao_conformidades
    where numero like 'NC-' || ano || '-%';

    new.numero := 'NC-' || ano || '-' || lpad(seq::text, 4, '0');
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_nc_numero
before insert on nao_conformidades
for each row execute function gerar_numero_nc();

create or replace function nc_atualiza_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_nc_update
before update on nao_conformidades
for each row execute function nc_atualiza_timestamp();

-- ---------------------------------------------------------------------
-- AÇÕES CORRETIVAS (G. PLANO DE AÇÃO — 1:N)
-- ---------------------------------------------------------------------

create table acoes_corretivas (
  id uuid primary key default gen_random_uuid(),
  nao_conformidade_id uuid not null references nao_conformidades(id) on delete cascade,
  descricao text not null,
  objetivo text,
  responsavel text,
  setor_responsavel_id uuid references setores(id),
  prazo date,
  recursos_necessarios text,
  evidencia_esperada text,
  criterio_eficacia text,
  unidade_area_aplicacao text,
  status status_acao not null default 'pendente',
  data_conclusao date,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_acoes_nc on acoes_corretivas(nao_conformidade_id);
create index idx_acoes_status on acoes_corretivas(status);

create or replace function acoes_atualiza_timestamp()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  -- marca automaticamente como atrasada
  if new.status in ('pendente','em_andamento') and new.prazo is not null and new.prazo < current_date then
    new.status := 'atrasada';
  end if;
  return new;
end; $$;

create trigger trg_acoes_update
before update on acoes_corretivas
for each row execute function acoes_atualiza_timestamp();

create trigger trg_acoes_insert
before insert on acoes_corretivas
for each row execute function acoes_atualiza_timestamp();

-- ---------------------------------------------------------------------
-- EVIDÊNCIAS / ARQUIVOS
-- ---------------------------------------------------------------------

create table evidencias (
  id uuid primary key default gen_random_uuid(),
  nao_conformidade_id uuid not null references nao_conformidades(id) on delete cascade,
  nome text not null,
  caminho text not null, -- path no Supabase Storage
  tipo text,
  tamanho bigint,
  enviado_por uuid references usuarios(id),
  data_envio timestamptz not null default now()
);

create index idx_evidencias_nc on evidencias(nao_conformidade_id);

-- ---------------------------------------------------------------------
-- HISTÓRICO / RASTREABILIDADE
-- ---------------------------------------------------------------------

create table historico (
  id uuid primary key default gen_random_uuid(),
  nao_conformidade_id uuid not null references nao_conformidades(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  acao text not null,
  detalhes jsonb,
  data_hora timestamptz not null default now()
);

create index idx_historico_nc on historico(nao_conformidade_id);

-- Registro automático de criação e mudança de status --------------------
create or replace function nc_registra_historico()
returns trigger
language plpgsql
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

create trigger trg_nc_historico_insert
after insert on nao_conformidades
for each row execute function nc_registra_historico();

create trigger trg_nc_historico_update
after update on nao_conformidades
for each row execute function nc_registra_historico();
