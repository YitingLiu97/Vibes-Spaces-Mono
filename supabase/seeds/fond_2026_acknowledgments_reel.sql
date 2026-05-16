-- ============================================================================
-- Future of NYC Design 2026 — Acknowledgments Reel
-- ============================================================================
-- Companion to fond_2026_event.sql + fond_2026_segments.sql.
--
-- Purpose: rotate Presenters → Sponsors → Community Partners during the
-- opening (12:00–12:30) and reception (19:15–20:00) windows on 2026-05-16.
--
-- WHAT THIS CREATES
--   • 8 new scenes  (3 sponsor + 5 community-partner brand cards)
--   • 1 new playlist  "Acknowledgments Reel" — 12 scenes in order
--       Presenters (4)  → Sponsors (3) → Community Partners (5)
--   • 2 schedule UPDATEs — repoints the existing Arrival and Reception
--       entries from a single scene to the new playlist.
--
-- WHAT THIS REUSES
--   The four bbbb-…-0001..0004 scenes seeded by fond_2026_event.sql are named
--   "Sponsor — Sanders Studios / Vision Brew / Vibescape / 241 Members" but
--   their captions already read "PRESENTED BY". They are the canonical
--   presenters per fond_2026_segments.sql and are reused as the first four
--   stops of the reel without renaming (the daytime "Sponsor Reel" playlist
--   also references them by id; renaming would break that label).
--
-- LOGO PATHS
--   Centre-zone image URLs use /logos/<group>/<file>, served by web/public/.
--   These resolve from the dashboard origin in /preview. If the Electron
--   client renders from a different origin, rewrite to absolute URLs before
--   the show.
--
-- BACKDROP
--   New scenes default to 'PLACEHOLDER://fond-bg.mp4'. If the bulk
--   video_url update at the bottom of fond_2026_event.sql has already run,
--   re-run the same UPDATE (commented at the end of this file) to pick up
--   the 8 new rows.
--
-- RE-RUNNING
--   Explicit UUIDs + ON CONFLICT DO NOTHING on inserts. Schedule UPDATEs
--   are guarded by old-value checks, so re-running after a rollback works.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. New Sponsor scenes (Figma, Mobbin, Wonder)
-- ----------------------------------------------------------------------------
-- loop_enabled=false so the playlist advances on onEnded.
-- ----------------------------------------------------------------------------

insert into scenes (id, org_id, name, video_url, hide_attribution, loop_enabled, composition) values

('bbbbbbbb-2222-2222-2222-000000000005'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Sponsor — Figma',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "/logos/sponsors/Figma.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "SPONSORED BY\nFigma",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

('bbbbbbbb-2222-2222-2222-000000000006'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Sponsor — Mobbin',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "/logos/sponsors/mobbin.svg", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "SPONSORED BY\nMobbin",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

('bbbbbbbb-2222-2222-2222-000000000007'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Sponsor — Wonder',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "/logos/sponsors/wonder.svg", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "SPONSORED BY\nWonder",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb)

on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. New Community Partner scenes
-- ----------------------------------------------------------------------------
-- Filenames with spaces are URL-encoded so they survive the JSON → <img src>
-- round-trip. Long brand names use size:48 to avoid two-line caption wrap.
-- ----------------------------------------------------------------------------

insert into scenes (id, org_id, name, video_url, hide_attribution, loop_enabled, composition) values

('bbbbbbbb-2222-2222-2222-000000000008'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Partner — AIGA NY',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "/logos/community%20partners/AIGA%20NY%20Logo_KeyArt_White.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "IN PARTNERSHIP WITH\nAIGA NY",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

('bbbbbbbb-2222-2222-2222-000000000009'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Partner — Asian Creative Foundation',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "/logos/community%20partners/acf.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "IN PARTNERSHIP WITH\nAsian Creative Foundation",
     "font": "bebas", "size": 48, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

('bbbbbbbb-2222-2222-2222-000000000010'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Partner — Brooklyn Product Design',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "/logos/community%20partners/bkpd.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "IN PARTNERSHIP WITH\nBrooklyn Product Design",
     "font": "bebas", "size": 48, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

('bbbbbbbb-2222-2222-2222-000000000011'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Partner — Black Style Matters',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "/logos/community%20partners/bsm.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "IN PARTNERSHIP WITH\nBlack Style Matters",
     "font": "bebas", "size": 48, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

('bbbbbbbb-2222-2222-2222-000000000012'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Partner — Her Rising',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "/logos/community%20partners/her-rising.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "IN PARTNERSHIP WITH\nHer Rising",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb)

on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Acknowledgments Reel playlist
-- ----------------------------------------------------------------------------
-- Reuses the four existing presenter scenes (bbbb-…-0001..0004) followed by
-- the three new sponsor scenes (…0005..0007) and the five new community
-- partner scenes (…0008..0012).
-- ----------------------------------------------------------------------------

insert into playlists (id, org_id, name) values
('cccccccc-3333-3333-3333-000000000002'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Acknowledgments Reel')
on conflict (id) do nothing;

insert into playlist_scenes (playlist_id, scene_id, position) values
  -- Presenters (4)
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000003'::uuid,  0), -- Vibescape
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000004'::uuid,  1), -- 241 Members
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000001'::uuid,  2), -- Sanders Studios
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000002'::uuid,  3), -- Vision Brew
  -- Sponsors (3)
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000005'::uuid,  4), -- Figma
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000006'::uuid,  5), -- Mobbin
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000007'::uuid,  6), -- Wonder
  -- Community Partners (5)
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000008'::uuid,  7), -- AIGA NY
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000009'::uuid,  8), -- ACF
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000010'::uuid,  9), -- BKPD
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000011'::uuid, 10), -- BSM
  ('cccccccc-3333-3333-3333-000000000002'::uuid, 'bbbbbbbb-2222-2222-2222-000000000012'::uuid, 11)  -- Her Rising
on conflict (playlist_id, scene_id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Repoint the Opening + Reception schedule entries to the new playlist
-- ----------------------------------------------------------------------------
-- schedule_entries has a CHECK that exactly one of scene_id / playlist_id is
-- set, so both columns must move in one UPDATE.
-- ----------------------------------------------------------------------------

-- 12:00–12:30 Opening (was: Arrival + Registration scene) → Acknowledgments Reel
update schedule_entries
   set scene_id    = null,
       playlist_id = 'cccccccc-3333-3333-3333-000000000002'::uuid
 where id = 'dddddddd-4444-4444-4444-000000000001'::uuid
   and scene_id = 'aaaaaaaa-1111-1111-1111-000000000001'::uuid;

-- 19:15–20:00 Reception (was: Award Ceremony + Reception scene) → Acknowledgments Reel
update schedule_entries
   set scene_id    = null,
       playlist_id = 'cccccccc-3333-3333-3333-000000000002'::uuid
 where id = 'dddddddd-4444-4444-4444-000000000016'::uuid
   and scene_id = 'aaaaaaaa-1111-1111-1111-000000000011'::uuid;

commit;

-- ============================================================================
-- POST-IMPORT — propagate the real backdrop video to the 8 new scenes
-- ============================================================================
-- Only needed if fond_2026_event.sql's bulk update has already run. Uses the
-- same WHERE clause so a re-run is harmless.

-- update scenes
--   set video_url = 'https://arnfcguwmsgazpsybvth.supabase.co/storage/v1/object/public/scenes-videos/00000000-0000-0000-0000-000000000001/19fb9f7f-5b03-44f9-8abe-1ca5585e2554.mp4'
--   where org_id = '00000000-0000-0000-0000-000000000001'
--     and video_url = 'PLACEHOLDER://fond-bg.mp4';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- 1. Dashboard /scenes → 23 scenes total (was 15)
-- 2. Dashboard /playlists → "Acknowledgments Reel" with 12 scenes
-- 3. Dashboard /schedule → 12:00–12:30 and 19:15–20:00 entries show the
--    playlist (not a scene)
-- 4. Open /preview at 12:00–12:30 or 19:15–20:00 (override system clock) and
--    watch the 12 brand cards rotate.

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- begin;
-- update schedule_entries
--    set scene_id = 'aaaaaaaa-1111-1111-1111-000000000001'::uuid, playlist_id = null
--   where id = 'dddddddd-4444-4444-4444-000000000001'::uuid;
-- update schedule_entries
--    set scene_id = 'aaaaaaaa-1111-1111-1111-000000000011'::uuid, playlist_id = null
--   where id = 'dddddddd-4444-4444-4444-000000000016'::uuid;
-- delete from playlist_scenes where playlist_id = 'cccccccc-3333-3333-3333-000000000002'::uuid;
-- delete from playlists       where id          = 'cccccccc-3333-3333-3333-000000000002'::uuid;
-- delete from scenes where id in (
--   'bbbbbbbb-2222-2222-2222-000000000005'::uuid,
--   'bbbbbbbb-2222-2222-2222-000000000006'::uuid,
--   'bbbbbbbb-2222-2222-2222-000000000007'::uuid,
--   'bbbbbbbb-2222-2222-2222-000000000008'::uuid,
--   'bbbbbbbb-2222-2222-2222-000000000009'::uuid,
--   'bbbbbbbb-2222-2222-2222-000000000010'::uuid,
--   'bbbbbbbb-2222-2222-2222-000000000011'::uuid,
--   'bbbbbbbb-2222-2222-2222-000000000012'::uuid
-- );
-- commit;
