-- ============================================================================
-- Future of NYC Design 2026 — event-day seed
-- ============================================================================
-- Date:      May 16, 2026 (Saturday), Brooklyn
-- Generated: 2026-05-15, evening before event
-- Org:       00000000-0000-0000-0000-000000000001 (the v0 hardcoded org)
--
-- WHAT THIS CREATES
--   15 scenes (11 session scenes + 4 sponsor scenes)
--   1  playlist  ("Sponsor Reel" — rotates the 4 sponsor scenes)
--   16 schedule entries (one_off override_date = 2026-05-16)
--
-- BACKDROP VIDEO
--   Every scene's video_url is set to a sentinel 'PLACEHOLDER://fond-bg.mp4'.
--   After running this script, replace it with your real backdrop URL using
--   the bulk-update statement at the bottom of this file (commented out).
--
-- RE-RUNNING
--   This script uses explicit UUIDs and ON CONFLICT DO NOTHING, so it is
--   safe to re-run. To wipe and reseed, delete the rows by org_id first.
--
-- VERIFICATION CHECKLIST (after running)
--   1. Dashboard /scenes → should list 15 scenes
--   2. Dashboard /playlists → should show "Sponsor Reel" with 4 scenes
--   3. Dashboard /schedule → should show 16 entries on 2026-05-16
--   4. Update video_url for all 15 scenes (see bottom of file)
--   5. Settings → pick a default scene for outside-event-hours fallback
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Session scenes
-- ----------------------------------------------------------------------------
-- Convention for compositions:
--   Single speaker → center zone holds their headshot.
--   2 speakers    → header + center.
--   3 speakers    → header + center + footer.
--   4+ speakers   → no zone headshots (would be unfair to relegate any to text);
--                    all names go in caption.
-- ----------------------------------------------------------------------------

insert into scenes (id, org_id, name, video_url, hide_attribution, loop_enabled, composition) values

-- 1. Arrival + Registration (12:00–12:30) — no speakers
('aaaaaaaa-1111-1111-1111-000000000001'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Arrival + Registration',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": null, "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "WELCOME TO\nFUTURE OF NYC DESIGN 2026\nRegistration is open — grab your badge",
     "font": "bebas", "size": 64, "color": "#FFFFFF",
     "h": "center", "v": "middle"
   },
   "tint": {"color": "#000000", "opacity": 0.45},
   "accent": null
 }'::jsonb),

-- 2. Welcome + Keynote (12:30–13:00) — C.J. Yeh, Christie Shin, Yiting Liu
('aaaaaaaa-1111-1111-1111-000000000002'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Welcome + Keynote',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": "https://www.futureofnycdesign.com/public/speakers/cj-yeh.png", "position": "left"},
     "center": {"imageUrl": "https://www.futureofnycdesign.com/public/speakers/christie-shin.png", "position": "center"},
     "footer": {"imageUrl": "https://pub-c7bfd822648643beb268d18309576c40.r2.dev/profile_square.jpg", "position": "right"}
   },
   "caption": {
     "text": "WELCOME + KEYNOTE\nEmpowering the Next Generation of Creative Heroes\nC.J. Yeh · Christie Shin · Yiting Liu",
     "font": "bebas", "size": 48, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.4},
   "accent": null
 }'::jsonb),

-- 3. Transition + Wonder Demo (13:00–13:15)
('aaaaaaaa-1111-1111-1111-000000000003'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Transition + Wonder Demo',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": null, "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "WONDER DEMO\nUp next: Three Scales of NYC Design Panel at 2:00",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "middle"
   },
   "tint": {"color": "#000000", "opacity": 0.45},
   "accent": null
 }'::jsonb),

-- 4. Panel: Three Scales of NYC Design (14:00–14:45) — Siddiq, Shandy, Dotun (mod Yiting)
('aaaaaaaa-1111-1111-1111-000000000004'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Panel — Three Scales of NYC Design',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": "https://www.futureofnycdesign.com/public/speakers/siddiq-nasar.png", "position": "left"},
     "center": {"imageUrl": "https://www.futureofnycdesign.com/public/speakers/shandy-tsai.png", "position": "center"},
     "footer": {"imageUrl": "https://www.futureofnycdesign.com/public/speakers/dotun-abeshinbioke.jpeg", "position": "right"}
   },
   "caption": {
     "text": "PANEL\nThree Scales of NYC Design, Three Bets on What Comes Next\nSiddiq Nasar · Shandy Tsai · Dotun Abeshinbioke\nModerator: Yiting Liu",
     "font": "bebas", "size": 44, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.4},
   "accent": null
 }'::jsonb),

-- 5. Live Portfolio Review (15:00–16:00) — Christie + CJ
('aaaaaaaa-1111-1111-1111-000000000005'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Live Portfolio Review',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": "https://www.futureofnycdesign.com/public/speakers/christie-shin.png", "position": "left"},
     "center": {"imageUrl": "https://www.futureofnycdesign.com/public/speakers/cj-yeh.png", "position": "right"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "LIVE PORTFOLIO REVIEW\nChristie Shin · C.J. Yeh",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.4},
   "accent": null
 }'::jsonb),

-- 6. Break + Vibes Installation (16:00–16:15)
('aaaaaaaa-1111-1111-1111-000000000006'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Break + Vibes Installation',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": null, "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "BREAK\nCheck out the Vibes Installation\nLightning Talks resume at 4:15",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "middle"
   },
   "tint": {"color": "#000000", "opacity": 0.45},
   "accent": null
 }'::jsonb),

-- 7. Lightning Talks (16:15–17:05) — Soo Yun, Lee-Sean, Mustafa, Michelle (4 speakers, text-only)
('aaaaaaaa-1111-1111-1111-000000000007'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Lightning Talks — Four Perspectives',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": null, "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "LIGHTNING TALKS\nFour Perspectives\nSoo Yun Kim · Lee-Sean Huang · Mustafa Bağdatlı · Michelle Chiu",
     "font": "bebas", "size": 44, "color": "#FFFFFF",
     "h": "center", "v": "middle"
   },
   "tint": {"color": "#000000", "opacity": 0.45},
   "accent": null
 }'::jsonb),

-- 8. Community Roundtable (17:20–18:10) — Chelsea, Cherie, Stacey, Shandy (4 speakers, text-only)
('aaaaaaaa-1111-1111-1111-000000000008'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Community Roundtable',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": null, "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "COMMUNITY ROUNDTABLE\nChelsea Acheampong · Cherie Animashaun · Stacey Panousopoulos · Shandy Tsai",
     "font": "bebas", "size": 40, "color": "#FFFFFF",
     "h": "center", "v": "middle"
   },
   "tint": {"color": "#000000", "opacity": 0.45},
   "accent": null
 }'::jsonb),

-- 9. Design Awards Ceremony + Live Pitches (18:25–19:00)
('aaaaaaaa-1111-1111-1111-000000000009'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Design Awards Ceremony + Live Pitches',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": null, "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "DESIGN AWARDS CEREMONY\n+ Live Pitches",
     "font": "bebas", "size": 64, "color": "#FFFFFF",
     "h": "center", "v": "middle"
   },
   "tint": {"color": "#000000", "opacity": 0.45},
   "accent": null
 }'::jsonb),

-- 10. Closing Keynote (19:00–19:10) — Gazi Jarin (single speaker)
('aaaaaaaa-1111-1111-1111-000000000010'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Closing Keynote — Make Weird Things',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "https://www.futureofnycdesign.com/public/speakers/gazi-jarin.jpg", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "CLOSING KEYNOTE\nMake Weird Things\nGazi Jarin · Software Engineer, Google",
     "font": "bebas", "size": 48, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.4},
   "accent": null
 }'::jsonb),

-- 11. Award Ceremony + Reception (19:15–20:00)
('aaaaaaaa-1111-1111-1111-000000000011'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Award Ceremony + Reception',
 'PLACEHOLDER://fond-bg.mp4',
 false, true,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": null, "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "AWARD CEREMONY + RECEPTION\nThank you for joining us\nFuture of NYC Design 2026",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "middle"
   },
   "tint": {"color": "#000000", "opacity": 0.4},
   "accent": null
 }'::jsonb)

on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Sponsor scenes (4 tier sponsors with logos on the FOND site)
-- ----------------------------------------------------------------------------
-- Each sponsor scene shows the logo centered with the brand name as caption.
-- Logos are transparent PNGs, so we use a dark tint for contrast.
-- These chain together via the "Sponsor Reel" playlist below.
-- ----------------------------------------------------------------------------

insert into scenes (id, org_id, name, video_url, hide_attribution, loop_enabled, composition) values

-- Sanders Studios
('bbbbbbbb-2222-2222-2222-000000000001'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Sponsor — Sanders Studios',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,  -- loop_enabled=false so the playlist can advance to the next sponsor
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "https://www.futureofnycdesign.com/public/logos/sanders_studio_transparent.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "PRESENTED BY\nSanders Studios",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

-- Vision Brew Interactive
('bbbbbbbb-2222-2222-2222-000000000002'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Sponsor — Vision Brew Interactive',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "https://www.futureofnycdesign.com/public/logos/visionbrew_transparent.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "PRESENTED BY\nVision Brew Interactive",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

-- Vibescape
('bbbbbbbb-2222-2222-2222-000000000003'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Sponsor — Vibescape',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "https://www.futureofnycdesign.com/public/logos/vibes.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "PRESENTED BY\nVibescape",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb),

-- 241 Members
('bbbbbbbb-2222-2222-2222-000000000004'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Sponsor — 241 Members',
 'PLACEHOLDER://fond-bg.mp4',
 false, false,
 '{
   "zones": {
     "header": {"imageUrl": null, "position": "center"},
     "center": {"imageUrl": "https://www.futureofnycdesign.com/public/logos/241members.png", "position": "center"},
     "footer": {"imageUrl": null, "position": "center"}
   },
   "caption": {
     "text": "PRESENTED BY\n241 Members",
     "font": "bebas", "size": 56, "color": "#FFFFFF",
     "h": "center", "v": "bottom"
   },
   "tint": {"color": "#000000", "opacity": 0.55},
   "accent": null
 }'::jsonb)

on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Sponsor Reel playlist (rotates the 4 sponsor scenes)
-- ----------------------------------------------------------------------------
-- loop_enabled=false on each sponsor scene means onEnded fires per-scene;
-- the playlist advances; the renderer wraps around at the end.
-- ----------------------------------------------------------------------------

insert into playlists (id, org_id, name) values
('cccccccc-3333-3333-3333-000000000001'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'Sponsor Reel')
on conflict (id) do nothing;

insert into playlist_scenes (playlist_id, scene_id, position) values
('cccccccc-3333-3333-3333-000000000001'::uuid, 'bbbbbbbb-2222-2222-2222-000000000001'::uuid, 0),
('cccccccc-3333-3333-3333-000000000001'::uuid, 'bbbbbbbb-2222-2222-2222-000000000002'::uuid, 1),
('cccccccc-3333-3333-3333-000000000001'::uuid, 'bbbbbbbb-2222-2222-2222-000000000003'::uuid, 2),
('cccccccc-3333-3333-3333-000000000001'::uuid, 'bbbbbbbb-2222-2222-2222-000000000004'::uuid, 3)
on conflict (playlist_id, scene_id) do nothing;

-- ----------------------------------------------------------------------------
-- Schedule entries for May 16, 2026
-- ----------------------------------------------------------------------------
-- Strategy: each agenda block gets its own entry. Time gaps between sessions
-- are filled with the Sponsor Reel playlist. Anything outside event hours
-- (before 12:00, after 20:00) falls back to org_settings.default_scene_id.
-- ----------------------------------------------------------------------------

insert into schedule_entries
  (id, org_id, scene_id, playlist_id, start_time, end_time, weekday_mask, override_date)
values

-- 12:00–12:30 → Arrival + Registration
('dddddddd-4444-4444-4444-000000000001'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000001'::uuid, null,
 '12:00:00', '12:30:00', null, '2026-05-16'),

-- 12:30–13:00 → Welcome + Keynote
('dddddddd-4444-4444-4444-000000000002'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000002'::uuid, null,
 '12:30:00', '13:00:00', null, '2026-05-16'),

-- 13:00–13:15 → Transition + Wonder Demo
('dddddddd-4444-4444-4444-000000000003'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000003'::uuid, null,
 '13:00:00', '13:15:00', null, '2026-05-16'),

-- 13:15–14:00 → Sponsor Reel (lunch gap)
('dddddddd-4444-4444-4444-000000000004'::uuid,
 '00000000-0000-0000-0000-000000000001',
 null, 'cccccccc-3333-3333-3333-000000000001'::uuid,
 '13:15:00', '14:00:00', null, '2026-05-16'),

-- 14:00–14:45 → Panel
('dddddddd-4444-4444-4444-000000000005'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000004'::uuid, null,
 '14:00:00', '14:45:00', null, '2026-05-16'),

-- 14:45–15:00 → Sponsor Reel (transition)
('dddddddd-4444-4444-4444-000000000006'::uuid,
 '00000000-0000-0000-0000-000000000001',
 null, 'cccccccc-3333-3333-3333-000000000001'::uuid,
 '14:45:00', '15:00:00', null, '2026-05-16'),

-- 15:00–16:00 → Live Portfolio Review
('dddddddd-4444-4444-4444-000000000007'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000005'::uuid, null,
 '15:00:00', '16:00:00', null, '2026-05-16'),

-- 16:00–16:15 → Break + Vibes Installation
('dddddddd-4444-4444-4444-000000000008'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000006'::uuid, null,
 '16:00:00', '16:15:00', null, '2026-05-16'),

-- 16:15–17:05 → Lightning Talks
('dddddddd-4444-4444-4444-000000000009'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000007'::uuid, null,
 '16:15:00', '17:05:00', null, '2026-05-16'),

-- 17:05–17:20 → Sponsor Reel (transition)
('dddddddd-4444-4444-4444-000000000010'::uuid,
 '00000000-0000-0000-0000-000000000001',
 null, 'cccccccc-3333-3333-3333-000000000001'::uuid,
 '17:05:00', '17:20:00', null, '2026-05-16'),

-- 17:20–18:10 → Community Roundtable
('dddddddd-4444-4444-4444-000000000011'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000008'::uuid, null,
 '17:20:00', '18:10:00', null, '2026-05-16'),

-- 18:10–18:25 → Sponsor Reel (transition)
('dddddddd-4444-4444-4444-000000000012'::uuid,
 '00000000-0000-0000-0000-000000000001',
 null, 'cccccccc-3333-3333-3333-000000000001'::uuid,
 '18:10:00', '18:25:00', null, '2026-05-16'),

-- 18:25–19:00 → Design Awards Ceremony + Live Pitches
('dddddddd-4444-4444-4444-000000000013'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000009'::uuid, null,
 '18:25:00', '19:00:00', null, '2026-05-16'),

-- 19:00–19:10 → Closing Keynote
('dddddddd-4444-4444-4444-000000000014'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000010'::uuid, null,
 '19:00:00', '19:10:00', null, '2026-05-16'),

-- 19:10–19:15 → Sponsor Reel (final transition)
('dddddddd-4444-4444-4444-000000000015'::uuid,
 '00000000-0000-0000-0000-000000000001',
 null, 'cccccccc-3333-3333-3333-000000000001'::uuid,
 '19:10:00', '19:15:00', null, '2026-05-16'),

-- 19:15–20:00 → Award Ceremony + Reception
('dddddddd-4444-4444-4444-000000000016'::uuid,
 '00000000-0000-0000-0000-000000000001',
 'aaaaaaaa-1111-1111-1111-000000000011'::uuid, null,
 '19:15:00', '20:00:00', null, '2026-05-16')

on conflict (id) do nothing;

commit;

-- ============================================================================
-- POST-IMPORT STEPS — run these AFTER the commit above
-- ============================================================================

-- Step 1: Set the backdrop video for every seeded scene.
-- Replace the URL below with your actual backdrop video URL
-- (a Supabase Storage URL, an Mux URL, or any HTTPS-served MP4).
-- Then uncomment the UPDATE and run it.

-- update scenes
--   set video_url = 'https://arnfcguwmsgazpsybvth.supabase.co/storage/v1/object/public/scenes-videos/00000000-0000-0000-0000-000000000001/19fb9f7f-5b03-44f9-8abe-1ca5585e2554.mp4'
--   where org_id = '00000000-0000-0000-0000-000000000001'
--     and video_url = 'PLACEHOLDER://fond-bg.mp4';

-- Step 2 (optional): set a default scene for outside-event-hours fallback.
-- Pick whichever scene id you want shown when no schedule entry matches.

-- update org_settings
--   set default_scene_id = 'aaaaaaaa-1111-1111-1111-000000000001'  -- Registration scene
--   where org_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- ROLLBACK (if something looks wrong)
-- ============================================================================
-- All seeded rows share these UUID prefixes:
--   aaaa…1111 → session scenes
--   bbbb…2222 → sponsor scenes
--   cccc…3333 → playlist
--   dddd…4444 → schedule entries
-- To wipe everything seeded by this script:

-- delete from schedule_entries where id::text like 'dddddddd-4444-%';
-- delete from playlist_scenes  where playlist_id::text like 'cccccccc-3333-%';
-- delete from playlists        where id::text like 'cccccccc-3333-%';
-- delete from scenes           where id::text like 'aaaaaaaa-1111-%' or id::text like 'bbbbbbbb-2222-%';
