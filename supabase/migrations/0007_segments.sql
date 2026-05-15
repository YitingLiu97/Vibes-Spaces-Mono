-- Vibes Spaces 0007 — Segments + Speakers
--
-- Segments are a visualization-only concept: clusters of speakers grouped by
-- agenda block (e.g. "Opening Keynote", "Three Scales Panel"). They do not
-- drive playback — they exist so an operator can see, at a glance, who is on
-- stage together and which person is moderating.
--
-- Speakers are stored as a separate, deduped table so the same person can
-- belong to multiple segments without re-uploading their photo.

create table if not exists speakers (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null,
  name text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_speakers_org on speakers(org_id);

create table if not exists segments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null,
  title text not null,
  subtitle text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_segments_org_position on segments(org_id, position);

create table if not exists segment_speakers (
  segment_id uuid not null references segments(id) on delete cascade,
  speaker_id uuid not null references speakers(id) on delete cascade,
  role text not null default 'speaker' check (role in ('speaker', 'moderator')),
  position int not null default 0,
  primary key (segment_id, speaker_id)
);

create index if not exists idx_segment_speakers_segment on segment_speakers(segment_id, position);

-- Storage bucket for speaker headshots — run via Supabase Studio or CLI:
-- insert into storage.buckets (id, name, public) values ('speaker-photos', 'speaker-photos', true)
--   on conflict (id) do nothing;
