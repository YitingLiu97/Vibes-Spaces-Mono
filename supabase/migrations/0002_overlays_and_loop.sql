-- Vibes Spaces 0002 — overlays + scene looping
-- Adds live-trigger overlay templates, per-scene loop toggle, and live-overlay state on org_settings.

-- 1. Per-scene loop. Default on — matches ambient-clip use; long-form scenes can opt out.
alter table scenes
  add column if not exists loop_enabled boolean not null default true;

-- 2. Overlay templates. Three types ship in v1:
--      speaker_card → { name, role }
--      text         → { lines: [string], align? }
--      image_logo   → { url, position }
create table if not exists overlays (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null,
  name text not null,
  type text not null check (type in ('speaker_card', 'text', 'image_logo')),
  content jsonb not null,
  animation text not null default 'fade' check (animation in ('fade', 'slide-left', 'slide-up')),
  duration_ms int not null default 6000 check (duration_ms between 1000 and 60000),
  created_at timestamptz not null default now()
);

create index if not exists idx_overlays_org on overlays(org_id);

-- 3. Live overlay state on org_settings. live_overlay_id + started_at form the trigger;
--    the renderer holds for `overlays.duration_ms` from started_at, then auto-clears visually.
--    Clearing the trigger row-side requires setting live_overlay_id = null.
alter table org_settings
  add column if not exists live_overlay_id uuid references overlays(id) on delete set null,
  add column if not exists live_overlay_started_at timestamptz;
