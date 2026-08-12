-- =========================================================================
-- CORREÇÃO: "duplicate key value violates unique constraint
-- nao_conformidades_numero_key"
--
-- Causa: a numeração (NC-2026-0001, NC-2026-0002...) era calculada como
-- "maior número existente + 1". Se dois registros forem salvos quase ao
-- mesmo tempo (duplo clique, ou dois usuários salvando junto), os dois
-- podem calcular o mesmo próximo número antes de qualquer um ser gravado,
-- gerando uma colisão.
--
-- Correção: usar uma tabela de controle por ano com UPSERT atômico
-- (o próprio Postgres serializa esses updates), garantindo que cada
-- número seja emitido uma única vez mesmo sob concorrência.
--
-- Rode este script inteiro no SQL Editor do Supabase.
-- =========================================================================

create table if not exists nc_numero_controle (
  ano int primary key,
  ultimo int not null default 0
);

create or replace function gerar_numero_nc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ano int := extract(year from now())::int;
  seq int;
begin
  if new.numero is null then
    insert into nc_numero_controle (ano, ultimo)
    values (ano, 1)
    on conflict (ano)
    do update set ultimo = nc_numero_controle.ultimo + 1
    returning ultimo into seq;

    new.numero := 'NC-' || ano::text || '-' || lpad(seq::text, 4, '0');
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

-- Alinha o contador com o que já existe hoje na tabela (evita colisão
-- com números que já foram gerados pelo método antigo).
insert into nc_numero_controle (ano, ultimo)
select
  cast(split_part(numero, '-', 2) as int) as ano,
  max(cast(split_part(numero, '-', 3) as int)) as ultimo
from nao_conformidades
where numero like 'NC-%'
group by cast(split_part(numero, '-', 2) as int)
on conflict (ano) do update set ultimo = greatest(nc_numero_controle.ultimo, excluded.ultimo);
