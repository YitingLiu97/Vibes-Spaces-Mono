-- Vibes Spaces 0004 — server-authoritative timestamps for live overlay + force-play
--
-- Why: clients were writing `live_overlay_started_at` and `force_play_set_at`
-- from `new Date().toISOString()`. Operator clock skew vs venue clock skew was
-- making overlay durations drift. Move the source of truth into Postgres so
-- both clients agree on when a moment started, regardless of their local clocks.

create or replace function set_org_settings_timestamps()
returns trigger as $$
begin
  if new.live_overlay_id is distinct from old.live_overlay_id
     and new.live_overlay_id is not null then
    new.live_overlay_started_at = now();
  end if;
  if new.force_play_scene_id is distinct from old.force_play_scene_id
     and new.force_play_scene_id is not null then
    new.force_play_set_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists org_settings_timestamps on org_settings;
create trigger org_settings_timestamps
  before update on org_settings
  for each row
  execute function set_org_settings_timestamps();
