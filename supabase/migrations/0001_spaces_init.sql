-- Vibes Spaces — initial schema
-- v0: RLS disabled for development velocity. TODO(v0.1): enable RLS on every table before second tenant.

create extension if not exists "uuid-ossp";

create table if not exists scenes (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null,
  name text not null,
  video_url text not null,
  hide_attribution boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists playlists (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists playlist_scenes (
  playlist_id uuid not null references playlists(id) on delete cascade,
  scene_id uuid not null references scenes(id) on delete cascade,
  position int not null,
  primary key (playlist_id, scene_id)
);

create index if not exists idx_playlist_scenes_playlist
  on playlist_scenes(playlist_id, position);

create table if not exists schedule_entries (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null,
  scene_id uuid references scenes(id) on delete cascade,
  playlist_id uuid references playlists(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  weekday_mask int,
  override_date date,
  created_at timestamptz not null default now(),
  constraint scene_or_playlist check (
    (scene_id is not null and playlist_id is null) or
    (scene_id is null and playlist_id is not null)
  ),
  constraint weekly_or_oneoff check (
    (weekday_mask is not null and override_date is null) or
    (weekday_mask is null and override_date is not null)
  )
);

create index if not exists idx_schedule_entries_org
  on schedule_entries(org_id);

create table if not exists org_settings (
  org_id uuid primary key,
  default_scene_id uuid references scenes(id) on delete set null,
  attribution_enabled boolean not null default true,
  force_play_scene_id uuid references scenes(id) on delete set null,
  force_play_set_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists client_status (
  org_id uuid primary key,
  client_version text,
  current_scene_id uuid,
  current_scene_name text,
  current_source_entry_id text,
  last_heartbeat_at timestamptz not null default now()
);

create index if not exists idx_client_status_heartbeat
  on client_status(last_heartbeat_at);

create table if not exists feature_interest (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  feature text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demo_requests (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  name text,
  venue text,
  message text,
  source text,
  created_at timestamptz not null default now()
);

-- Seed the single hardcoded org for v0
insert into org_settings (org_id, attribution_enabled)
values ('00000000-0000-0000-0000-000000000001', true)
on conflict (org_id) do nothing;

-- TODO(v0.1): enable RLS, add policies tied to auth.uid()
-- alter table scenes enable row level security;
-- alter table playlists enable row level security;
-- alter table playlist_scenes enable row level security;
-- alter table schedule_entries enable row level security;
-- alter table org_settings enable row level security;
-- alter table client_status enable row level security;

-- Storage bucket (run separately via Supabase Studio or CLI):
-- insert into storage.buckets (id, name, public) values ('scenes-videos', 'scenes-videos', true);
