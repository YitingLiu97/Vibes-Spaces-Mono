-- Vibes Spaces 0005 — RPCs for re-tap restart semantics
--
-- The 0004 trigger only sets started_at when live_overlay_id (or
-- force_play_scene_id) CHANGES. That means re-tapping the same overlay
-- doesn't reset its timer — the renderer sees elapsed > duration and
-- nothing happens.
--
-- These RPCs atomically set BOTH fields to (id, now()) regardless of
-- whether the id is changing, so re-tap behaves like a fresh trigger.

create or replace function trigger_live_overlay(p_org_id uuid, p_overlay_id uuid)
returns void
language sql
as $$
  update org_settings
  set live_overlay_id = p_overlay_id,
      live_overlay_started_at = now()
  where org_id = p_org_id;
$$;

create or replace function trigger_force_play(p_org_id uuid, p_scene_id uuid)
returns void
language sql
as $$
  update org_settings
  set force_play_scene_id = p_scene_id,
      force_play_set_at = now()
  where org_id = p_org_id;
$$;

-- Allow anon to call these (matches v0 anon-CRUD policy on the table)
grant execute on function trigger_live_overlay(uuid, uuid) to anon, authenticated;
grant execute on function trigger_force_play(uuid, uuid) to anon, authenticated;
