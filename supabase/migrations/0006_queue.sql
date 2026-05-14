-- Vibes Spaces 0006 — Queue model
--
-- Queue is a manually-ordered list of upcoming items that overrides the
-- time-based Schedule while it has items, then falls back to the schedule
-- (and ultimately the default scene) when exhausted.
--
-- Cursor (queue_current_item_id + queue_started_at) lives on org_settings
-- so the resolver stays stateless: it reads the cursor, decides whether
-- to advance based on elapsed time vs the current item's duration, and
-- the runtime writes the new cursor back when an advance occurs.

create table if not exists queue_items (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null,
  position int not null,
  scene_id uuid references scenes(id) on delete cascade,
  playlist_id uuid references playlists(id) on delete cascade,
  duration_seconds int not null default 300,
  created_at timestamptz not null default now(),
  constraint queue_scene_or_playlist check (
    (scene_id is not null and playlist_id is null) or
    (scene_id is null and playlist_id is not null)
  ),
  constraint queue_duration_positive check (duration_seconds > 0)
);

create index if not exists idx_queue_items_org_position
  on queue_items(org_id, position);

alter table org_settings
  add column if not exists queue_current_item_id uuid references queue_items(id) on delete set null,
  add column if not exists queue_started_at timestamptz;
