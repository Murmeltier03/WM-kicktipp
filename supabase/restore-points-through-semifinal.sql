begin;

-- Restore the points shown in the Kicktipp screenshots for matchdays 1-10
-- and all knockout rounds through the semifinal. The final (round 15) is
-- intentionally left untouched.

alter table public.point_entries
drop constraint if exists point_entries_kicktipp_matchday_check;

alter table public.point_entries
add constraint point_entries_kicktipp_matchday_check
check (kicktipp_matchday between 1 and 15);

do $$
declare
  matched_players integer;
begin
  select count(*)
  into matched_players
  from public.players
  where tournament_slug = 'wm-2026'
    and display_name in (
      'Gero',
      'Quy',
      'Robin',
      'Denis',
      'Yannic',
      'Anka',
      'Yannick',
      'Marius',
      'Moritz'
    );

  if matched_players <> 9 then
    raise exception 'Expected 9 matching WM players, found %', matched_players;
  end if;
end
$$;

with input_points (display_name, kicktipp_matchday, points) as (
  values
    -- Gero = Marcosau
    ('Gero', 1, 9),
    ('Gero', 2, 4),
    ('Gero', 3, 14),
    ('Gero', 4, 14),
    ('Gero', 5, 10),
    ('Gero', 6, 15),
    ('Gero', 7, 13),
    ('Gero', 8, 4),
    ('Gero', 9, 8),
    ('Gero', 10, 8),
    ('Gero', 11, 30),
    ('Gero', 12, 11),
    ('Gero', 13, 9),
    ('Gero', 14, 2),

    -- Quy = Kimi
    ('Quy', 1, 10),
    ('Quy', 2, 6),
    ('Quy', 3, 15),
    ('Quy', 4, 7),
    ('Quy', 5, 10),
    ('Quy', 6, 16),
    ('Quy', 7, 11),
    ('Quy', 8, 5),
    ('Quy', 9, 8),
    ('Quy', 10, 10),
    ('Quy', 11, 29),
    ('Quy', 12, 14),
    ('Quy', 13, 11),
    ('Quy', 14, 2),

    ('Robin', 1, 6),
    ('Robin', 2, 4),
    ('Robin', 3, 11),
    ('Robin', 4, 8),
    ('Robin', 5, 11),
    ('Robin', 6, 13),
    ('Robin', 7, 10),
    ('Robin', 8, 4),
    ('Robin', 9, 8),
    ('Robin', 10, 11),
    ('Robin', 11, 22),
    ('Robin', 12, 13),
    ('Robin', 13, 7),
    ('Robin', 14, 2),

    -- Denis = SexySch...
    ('Denis', 1, 7),
    ('Denis', 2, 8),
    ('Denis', 3, 15),
    ('Denis', 4, 12),
    ('Denis', 5, 8),
    ('Denis', 6, 13),
    ('Denis', 7, 11),
    ('Denis', 8, 7),
    ('Denis', 9, 9),
    ('Denis', 10, 8),
    ('Denis', 11, 27),
    ('Denis', 12, 12),
    ('Denis', 13, 11),
    ('Denis', 14, 2),

    -- Yannic = Yannios
    ('Yannic', 1, 8),
    ('Yannic', 2, 4),
    ('Yannic', 3, 16),
    ('Yannic', 4, 11),
    ('Yannic', 5, 10),
    ('Yannic', 6, 14),
    ('Yannic', 7, 10),
    ('Yannic', 8, 4),
    ('Yannic', 9, 10),
    ('Yannic', 10, 9),
    ('Yannic', 11, 28),
    ('Yannic', 12, 12),
    ('Yannic', 13, 5),
    ('Yannic', 14, 3),

    -- Anka = Anker
    ('Anka', 1, 5),
    ('Anka', 2, 7),
    ('Anka', 3, 13),
    ('Anka', 4, 14),
    ('Anka', 5, 10),
    ('Anka', 6, 13),
    ('Anka', 7, 12),
    ('Anka', 8, 4),
    ('Anka', 9, 10),
    ('Anka', 10, 8),
    ('Anka', 11, 30),
    ('Anka', 12, 12),
    ('Anka', 13, 9),
    ('Anka', 14, 4),

    -- Yannick = Murmeltier
    ('Yannick', 1, 7),
    ('Yannick', 2, 7),
    ('Yannick', 3, 14),
    ('Yannick', 4, 12),
    ('Yannick', 5, 10),
    ('Yannick', 6, 15),
    ('Yannick', 7, 12),
    ('Yannick', 8, 5),
    ('Yannick', 9, 8),
    ('Yannick', 10, 8),
    ('Yannick', 11, 31),
    ('Yannick', 12, 15),
    ('Yannick', 13, 6),
    ('Yannick', 14, 3),

    -- Marius = mariuz
    ('Marius', 1, 9),
    ('Marius', 2, 4),
    ('Marius', 3, 12),
    ('Marius', 4, 13),
    ('Marius', 5, 10),
    ('Marius', 6, 13),
    ('Marius', 7, 8),
    ('Marius', 8, 6),
    ('Marius', 9, 11),
    ('Marius', 10, 10),
    ('Marius', 11, 33),
    ('Marius', 12, 12),
    ('Marius', 13, 10),
    ('Marius', 14, 0),

    ('Moritz', 1, 6),
    ('Moritz', 2, 6),
    ('Moritz', 3, 15),
    ('Moritz', 4, 12),
    ('Moritz', 5, 11),
    ('Moritz', 6, 15),
    ('Moritz', 7, 11),
    ('Moritz', 8, 4),
    ('Moritz', 9, 8),
    ('Moritz', 10, 10),
    ('Moritz', 11, 31),
    ('Moritz', 12, 10),
    ('Moritz', 13, 9),
    ('Moritz', 14, 0)
)
insert into public.point_entries (
  tournament_slug,
  player_id,
  kicktipp_matchday,
  points,
  updated_at
)
select
  'wm-2026',
  player.id,
  input.kicktipp_matchday,
  input.points,
  now()
from input_points as input
join public.players as player
  on player.tournament_slug = 'wm-2026'
 and player.display_name = input.display_name
on conflict (player_id, kicktipp_matchday)
do update set
  tournament_slug = excluded.tournament_slug,
  points = excluded.points,
  updated_at = excluded.updated_at;

do $$
declare
  restored_rows integer;
  restored_points integer;
begin
  select count(*), coalesce(sum(entry.points), 0)
  into restored_rows, restored_points
  from public.point_entries as entry
  join public.players as player on player.id = entry.player_id
  where entry.tournament_slug = 'wm-2026'
    and entry.kicktipp_matchday between 1 and 14
    and player.display_name in (
      'Gero',
      'Quy',
      'Robin',
      'Denis',
      'Yannic',
      'Anka',
      'Yannick',
      'Marius',
      'Moritz'
    );

  if restored_rows <> 126 then
    raise exception 'Expected 126 restored point rows, found %', restored_rows;
  end if;

  if restored_points <> 1332 then
    raise exception 'Expected 1332 restored points, found %', restored_points;
  end if;
end
$$;

update public.tournaments
set player_count = 9,
    updated_at = now()
where slug = 'wm-2026';

commit;
