-- Clasificación de temporada. Ejecutar una vez en el editor SQL de Supabase.
-- Lee las partidas admitidas por submit_score y devuelve solo datos del ranking.
create or replace function public.get_season_leaderboard(
  p_metric text, p_maps text[], p_start timestamptz, p_end timestamptz,
  p_digimon text default null, p_limit integer default 50
)
returns table (pos bigint, name text, digimon text, score bigint, map_count bigint, me boolean)
language sql stable security definer set search_path = public as $$
  with per_map as (
    select s.user_id, s.map, sum(s.kills) as kills,
      min(s.t) as fastest, max(s.t) as longest,
      (array_agg(s.digimon order by
        case p_metric when 'trial' then s.t when 'survival' then -s.t else -s.kills end, s.id))[1] as digimon
    from public.scores s
    where s.created_at >= p_start and s.created_at < p_end
      and s.map = any(p_maps)
      and (p_digimon is null or s.digimon = p_digimon)
      and (p_metric = 'kills'
        or (p_metric = 'trial' and s.mode = 'normal' and s.win)
        or (p_metric = 'survival' and s.mode = 'surv'))
    group by s.user_id, s.map
  ), totals as (
    select m.user_id, count(*) as map_count,
      (case p_metric when 'trial' then sum(m.fastest)
        when 'survival' then sum(m.longest) else sum(m.kills) end)::bigint as score,
      (array_agg(m.digimon order by
        case p_metric when 'trial' then m.fastest when 'survival' then -m.longest else -m.kills end, m.map))[1] as digimon
    from per_map m
    group by m.user_id
    having p_metric <> 'trial' or count(*) = cardinality(p_maps)
  ), ranked as (
    select row_number() over (order by
      case when p_metric = 'trial' then t.score else -t.score end, t.user_id) as pos,
      pr.name, t.digimon, t.score, t.map_count, coalesce(t.user_id = auth.uid(), false) as me
    from totals t join public.profiles pr on pr.user_id = t.user_id
    where not exists (select 1 from public.devs d where d.user_id = t.user_id)
  )
  select * from ranked where pos <= least(greatest(p_limit, 1), 100) or me order by pos;
$$;

revoke all on function public.get_season_leaderboard(text, text[], timestamptz, timestamptz, text, integer) from public;
grant execute on function public.get_season_leaderboard(text, text[], timestamptz, timestamptz, text, integer) to anon, authenticated;
