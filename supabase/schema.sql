-- DigiBonk: guardado en la nube y ranking por regiones (Supabase / Postgres)
-- Ejecutar una vez en el editor SQL del proyecto de Supabase. Se puede volver a
-- ejecutar: crea lo que falte y sustituye las funciones.
--
-- Tablas
--   profiles: nombre de entrenador y región que se ven en el ranking
--   saves:    una fila por jugador con su progreso (el mismo contenido que el código DBK1-)
--   scores:   una fila por partida enviada al ranking
-- Nadie escribe en las tablas directamente: el juego llama a las funciones de abajo,
-- que comprueban los datos. La lectura de saves solo permite la fila propia.

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 16),
  region     text not null check (region in ('EU','NA','LATAM','ASIA','OCE','AFR')),
  updated_at timestamptz not null default now()
);

create table if not exists public.saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  rev        integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  mode       text not null check (mode in ('normal','surv')),
  map        text not null check (map ~ '^[a-z0-9_]{1,24}$'),
  diff       text not null check (diff ~ '^([a-z0-9_]{1,24}|-)$'),   -- '-' en Supervivencia
  digimon    text not null check (digimon ~ '^[a-z0-9_]{1,32}$'),
  t          integer not null check (t between 0 and 14400),
  kills      integer not null check (kills >= 0),
  lvl        integer not null check (lvl between 1 and 500),
  wave       integer not null default 0 check (wave >= 0),
  win        boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists scores_board_idx on public.scores (mode, map, diff, user_id);
create index if not exists scores_user_idx  on public.scores (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.saves    enable row level security;
alter table public.scores   enable row level security;

-- El jugador solo puede leer su propio guardado; escribir, solo mediante put_save.
drop policy if exists saves_read_own on public.saves;
create policy saves_read_own on public.saves for select to authenticated using (user_id = auth.uid());
-- Perfiles y partidas no se leen directamente: el ranking sale de get_leaderboard.
revoke all on public.profiles, public.saves, public.scores from anon, authenticated;
grant select on public.saves to authenticated;

-- Nombre y región del jugador (se llama al entrar y al cambiarlos)
create or replace function public.set_profile(p_name text, p_region text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g'));
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if v_name = '' then v_name := 'Entrenador'; end if;
  insert into profiles (user_id, name, region, updated_at)
  values (auth.uid(), left(v_name, 16), p_region, now())
  on conflict (user_id) do update set name = excluded.name, region = excluded.region, updated_at = now();
end $$;

-- Guarda el progreso. p_base_rev es la revisión que el juego descargó por última vez:
-- si en la nube hay otra más nueva (otro dispositivo guardó antes), devuelve -1 y no escribe,
-- para que el juego pregunte qué progreso conservar. p_force sobrescribe igualmente.
create or replace function public.put_save(p_data jsonb, p_base_rev integer, p_force boolean default false)
returns integer language plpgsql security definer set search_path = public as $$
declare v_rev integer;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 262144 then raise exception 'bad_save'; end if;
  select rev into v_rev from saves where user_id = auth.uid() for update;
  if v_rev is null then
    insert into saves (user_id, data, rev) values (auth.uid(), p_data, 1);
    return 1;
  end if;
  if not p_force and v_rev <> coalesce(p_base_rev, 0) then return -1; end if;
  update saves set data = p_data, rev = v_rev + 1, updated_at = now() where user_id = auth.uid();
  return v_rev + 1;
end $$;

-- Envía una partida al ranking. Comprobaciones básicas contra trampas:
-- cifras dentro de lo posible y no más tiempo de partida del que ha pasado desde el envío anterior.
create or replace function public.submit_score(p_mode text, p_map text, p_diff text, p_digimon text,
  p_t integer, p_kills integer, p_lvl integer, p_wave integer, p_win boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_last timestamptz;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from profiles where user_id = auth.uid()) then raise exception 'no_profile'; end if;
  if p_t < 30 then return; end if;   -- partidas de menos de 30 s no cuentan
  if p_kills > p_t * 40 + 300 or p_lvl > p_t / 4 + 10 or p_wave > p_t / 60 + 2 then raise exception 'implausible'; end if;
  if p_mode = 'normal' and p_t > 3600 then raise exception 'implausible'; end if;
  -- desde la partida anterior o, si es la primera, desde que se creó la cuenta
  select greatest((select max(created_at) from scores where user_id = auth.uid()),
                  (select created_at from auth.users where id = auth.uid())) into v_last;
  if v_last is not null and extract(epoch from now() - v_last) < p_t * 0.9 then raise exception 'too_fast'; end if;
  insert into scores (user_id, mode, map, diff, digimon, t, kills, lvl, wave, win)
  values (auth.uid(), p_mode, p_map, case when p_mode = 'surv' then '-' else p_diff end, p_digimon,
          p_t, p_kills, p_lvl, coalesce(p_wave, 0), coalesce(p_win, false) and p_mode = 'normal');
end $$;

-- Ranking: la mejor partida de cada jugador en ese modo, mapa y dificultad.
-- Clásico: primero las victorias (la más rápida gana), después el resto (aguantar más gana).
-- Supervivencia: más oleadas, y a igualdad, más tiempo.
-- p_region null = mundial. Devuelve los p_limit primeros y, si no está entre ellos, la fila del jugador.
create or replace function public.get_leaderboard(p_mode text, p_map text, p_diff text, p_region text default null, p_limit integer default 50)
returns table (pos bigint, name text, region text, digimon text, t integer, kills integer, lvl integer, wave integer, win boolean, me boolean)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (s.user_id) s.user_id, s.digimon, s.t, s.kills, s.lvl, s.wave, s.win, s.created_at
    from scores s
    where s.mode = p_mode and s.map = p_map and s.diff = case when p_mode = 'surv' then '-' else p_diff end
    order by s.user_id,
      case when p_mode = 'surv' then -s.wave else (case when s.win then 0 else 1 end) end,
      case when p_mode = 'normal' and s.win then s.t else -s.t end,
      s.created_at
  ), ranked as (
    select row_number() over (order by
        case when p_mode = 'surv' then -b.wave else (case when b.win then 0 else 1 end) end,
        case when p_mode = 'normal' and b.win then b.t else -b.t end,
        b.created_at) as pos,
      pr.name, pr.region, b.digimon, b.t, b.kills, b.lvl, b.wave, b.win, coalesce(b.user_id = auth.uid(), false) as me
    from best b join profiles pr on pr.user_id = b.user_id
    where p_region is null or pr.region = p_region
  )
  select * from ranked where pos <= least(greatest(p_limit, 1), 100) or me order by pos;
$$;

-- Borra todos los datos del jugador en la nube (botón "Eliminar cuenta" del juego)
create or replace function public.delete_my_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from scores   where user_id = auth.uid();
  delete from saves    where user_id = auth.uid();
  delete from profiles where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.set_profile(text, text), public.put_save(jsonb, integer, boolean),
  public.submit_score(text, text, text, text, integer, integer, integer, integer, boolean),
  public.get_leaderboard(text, text, text, text, integer), public.delete_my_data() from public, anon;
grant execute on function public.set_profile(text, text), public.put_save(jsonb, integer, boolean),
  public.submit_score(text, text, text, text, integer, integer, integer, integer, boolean),
  public.delete_my_data() to authenticated;
grant execute on function public.get_leaderboard(text, text, text, text, integer) to anon, authenticated;
