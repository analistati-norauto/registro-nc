-- =========================================================================
-- CORREÇÃO: "column reference "ano" is ambiguous"
--
-- Causa: a variável local "ano" dentro da função tinha o mesmo nome da
-- coluna "ano" da tabela nc_numero_controle, e o Postgres não conseguia
-- decidir qual dos dois você queria dizer.
--
-- Correção: renomear a variável local para v_ano / v_seq.
-- Rode este script no SQL Editor do Supabase.
-- =========================================================================

create or replace function gerar_numero_nc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano int := extract(year from now())::int;
  v_seq int;
begin
  if new.numero is null then
    insert into nc_numero_controle (ano, ultimo)
    values (v_ano, 1)
    on conflict (ano)
    do update set ultimo = nc_numero_controle.ultimo + 1
    returning ultimo into v_seq;

    new.numero := 'NC-' || v_ano::text || '-' || lpad(v_seq::text, 4, '0');
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;
