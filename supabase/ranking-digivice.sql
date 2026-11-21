-- Instalar después de schema.sql. Conserva el ranking anterior y reutiliza las partidas ya enviadas.
create or replace function public.get_digivice_leaderboard(
  p_category text, p_map text, p_diff text, p_region text default null, p_limit integer default 50
)
returns table (pos bigint, name text, region text, avatar text, digimon text, mark integer, me boolean)
language sql stable security definer set search_path = '' as $$
  with eligible as (
    select s.id, s.user_id, s.map, s.digimon, s.t, s.kills, s.wave
    from public.scores s
    join public.profiles p on p.user_id = s.user_id
    where (p_region is null or p.region = p_region)
      and not exists (select 1 from public.devs d where d.user_id = s.user_id)
      and s.map in ('bosque', 'desierto', 'nevado')
      and (p_map is null or s.map = p_map)
      and (
        (p_category = 'surv' and s.mode = 'surv' and s.diff = '-')
        or (p_category = 'kills' and s.mode = 'normal' and s.diff = p_diff)
        or (p_category = 'trial' and s.mode = 'normal' and s.diff = p_diff and s.win)
      )
  ), single_mark as (
    select distinct on (s.user_id)
      s.user_id, s.digimon,
      case p_category when 'kills' then s.kills when 'surv' then s.wave else s.t end as mark,
      case p_category when 'surv' then -s.t when 'kills' then s.t else 0 end as tie
    from eligible s
    where p_category <> 'trial' or p_map is not null
    order by s.user_id,
      case p_category when 'kills' then -s.kills when 'surv' then -s.wave else s.t end,
      case p_category when 'surv' then -s.t when 'kills' then s.t else 0 end,
      s.id
  ), fastest as (
    select distinct on (s.user_id, s.map) s.user_id, s.map, s.digimon, s.t, s.id
    from eligible s
    where p_category = 'trial' and p_map is null
    order by s.user_id, s.map, s.t, s.id
  ), marks as (
    select * from single_mark
    union all
    select f.user_id, (array_agg(f.digimon order by f.id desc))[1], sum(f.t)::integer, 0
    from fastest f group by f.user_id having count(*) = 3
  ), ranked as (
    select row_number() over (
      order by case when p_category = 'trial' then m.mark else -m.mark end, m.tie, m.user_id
    ) as pos, p.name, p.region,
      case when s.data->>'digibonk3d-avatar' ~
        '^(tai|matt|sora|izzy|mimi|joe|tk|kari|(agumon|gabumon|biyomon|tentomon|palmon|gomamon|patamon|gatomon|leomon|hagurumon|frigimon|wizardmon)(_(galactico|holografica|lcd|festival|reno|variocolor))?)$'
        then s.data->>'digibonk3d-avatar' end as avatar,
      m.digimon, m.mark, coalesce(m.user_id = auth.uid(), false) as me
    from marks m join public.profiles p on p.user_id = m.user_id
    left join public.saves s on s.user_id = m.user_id
  )
  select r.pos, r.name, r.region, r.avatar, r.digimon, r.mark, r.me
  from ranked r
  where r.pos <= least(greatest(coalesce(p_limit, 50), 1), 100) or r.me
  order by r.pos;
$$;

revoke all on function public.get_digivice_leaderboard(text, text, text, text, integer) from public;
grant execute on function public.get_digivice_leaderboard(text, text, text, text, integer) to anon, authenticated;
