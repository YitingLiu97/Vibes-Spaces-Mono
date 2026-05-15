-- ============================================================================
-- Future of NYC Design 2026 — Segments seed
-- ============================================================================
-- Companion to fond_2026_event.sql. Pre-populates the Segments tab with the
-- five at-a-glance speaker clusters that map to the event's stage moments:
--   1. Opening Keynote & Live Portfolio Review (Christie, CJ)
--   2. Three Scales of NYC Design — Panel (Shandy, Siddiq, Dotun; mod Yiting)
--   3. Community Roundtable (Stacey, Shandy, Cherie; mod Chelsea)
--   4. Lightning Talks (Soo Yun, Lee-Sean, Mustafa, Michelle)
--   5. Closing Keynote (Gazi)
--
-- Speakers seen on futureofnycdesign.com but not on stage at one of the five
-- segments above (Somya, May, Hedy, David, Craig, Jessica, Christine) are
-- still inserted so they appear in the editor's speaker picker — the user
-- can drop them into segments as plans firm up.
--
-- Re-runnable: explicit UUIDs + ON CONFLICT DO NOTHING.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Speakers (21 — the 20 on the FOND speakers page + Yiting Liu as moderator)
-- ----------------------------------------------------------------------------
-- Only the headshots already referenced in fond_2026_event.sql are seeded
-- with photo_url. The rest fall back to initials in the UI; the operator can
-- attach a photo from the segment editor.
-- ----------------------------------------------------------------------------

-- Names + photo URLs sourced from futureofnycdesign.com/speakers (2026-05-15).
insert into speakers (id, org_id, name, photo_url) values
  ('eeeeeeee-5555-5555-5555-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'Christie Shin',        'https://www.futureofnycdesign.com/public/speakers/christie-shin.png'),
  ('eeeeeeee-5555-5555-5555-000000000002'::uuid, '00000000-0000-0000-0000-000000000001',
   'C.J. Yeh',             'https://www.futureofnycdesign.com/public/speakers/cj-yeh.png'),
  ('eeeeeeee-5555-5555-5555-000000000003'::uuid, '00000000-0000-0000-0000-000000000001',
   'Shandy Tsai',          'https://www.futureofnycdesign.com/public/speakers/shandy-tsai.png'),
  ('eeeeeeee-5555-5555-5555-000000000004'::uuid, '00000000-0000-0000-0000-000000000001',
   'Siddiq Nasar',         'https://www.futureofnycdesign.com/public/speakers/siddiq-nasar.png'),
  ('eeeeeeee-5555-5555-5555-000000000005'::uuid, '00000000-0000-0000-0000-000000000001',
   'Dotun Abeshinbioke',   'https://www.futureofnycdesign.com/public/speakers/dotun-abeshinbioke.jpeg'),
  ('eeeeeeee-5555-5555-5555-000000000006'::uuid, '00000000-0000-0000-0000-000000000001',
   'Soo Yun Kim',          'https://www.futureofnycdesign.com/public/speakers/soo-yun-kim.jpg'),
  ('eeeeeeee-5555-5555-5555-000000000007'::uuid, '00000000-0000-0000-0000-000000000001',
   'Michelle Chiu',        'https://www.futureofnycdesign.com/public/speakers/michelle-chiu.png'),
  ('eeeeeeee-5555-5555-5555-000000000008'::uuid, '00000000-0000-0000-0000-000000000001',
   'Lee-Sean Huang',       'https://www.futureofnycdesign.com/public/speakers/lee-sean-huang.png'),
  ('eeeeeeee-5555-5555-5555-000000000009'::uuid, '00000000-0000-0000-0000-000000000001',
   'Mustafa Bağdatlı',     'https://www.futureofnycdesign.com/public/speakers/mustafa-bagdatli.png'),
  ('eeeeeeee-5555-5555-5555-000000000010'::uuid, '00000000-0000-0000-0000-000000000001',
   'Somya Gupta',          'https://www.futureofnycdesign.com/public/speakers/somya-gupta.png'),
  ('eeeeeeee-5555-5555-5555-000000000011'::uuid, '00000000-0000-0000-0000-000000000001',
   'May Zhou',             'https://www.futureofnycdesign.com/public/speakers/may-zhou.png'),
  ('eeeeeeee-5555-5555-5555-000000000012'::uuid, '00000000-0000-0000-0000-000000000001',
   'Hedy Deng',            'https://www.futureofnycdesign.com/public/speakers/hedy-deng.png'),
  ('eeeeeeee-5555-5555-5555-000000000013'::uuid, '00000000-0000-0000-0000-000000000001',
   'David Mendez',         'https://www.futureofnycdesign.com/public/speakers/david-mendez.png'),
  ('eeeeeeee-5555-5555-5555-000000000014'::uuid, '00000000-0000-0000-0000-000000000001',
   'Chelsea Acheampong',   'https://www.futureofnycdesign.com/public/speakers/chelsea-acheampong.jpg'),
  ('eeeeeeee-5555-5555-5555-000000000015'::uuid, '00000000-0000-0000-0000-000000000001',
   'Cherie Animashaun',    'https://www.futureofnycdesign.com/public/speakers/cherie-animashaun.jpeg'),
  ('eeeeeeee-5555-5555-5555-000000000016'::uuid, '00000000-0000-0000-0000-000000000001',
   'Stacey Panousopoulos', 'https://www.futureofnycdesign.com/public/speakers/Stacey-Panousopoulos.webp'),
  ('eeeeeeee-5555-5555-5555-000000000017'::uuid, '00000000-0000-0000-0000-000000000001',
   'Craig Spaeth',         'https://www.futureofnycdesign.com/public/speakers/craig-spaeth.png'),
  ('eeeeeeee-5555-5555-5555-000000000018'::uuid, '00000000-0000-0000-0000-000000000001',
   'Jessica Moon',         'https://www.futureofnycdesign.com/public/speakers/jessica-moon.png'),
  ('eeeeeeee-5555-5555-5555-000000000019'::uuid, '00000000-0000-0000-0000-000000000001',
   'Christine Keeley',     'https://www.futureofnycdesign.com/public/speakers/christine-keeley.png'),
  ('eeeeeeee-5555-5555-5555-000000000020'::uuid, '00000000-0000-0000-0000-000000000001',
   'Gazi Jarin',           'https://www.futureofnycdesign.com/public/speakers/gazi-jarin.jpg'),
  ('eeeeeeee-5555-5555-5555-000000000021'::uuid, '00000000-0000-0000-0000-000000000001',
   'Yiting Liu',           'https://pub-c7bfd822648643beb268d18309576c40.r2.dev/profile_square.jpg')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Segments
-- ----------------------------------------------------------------------------

insert into segments (id, org_id, title, subtitle, position) values
  ('ffffffff-6666-6666-6666-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'Opening Keynote & Live Portfolio Review', 'Keynote', 0),
  ('ffffffff-6666-6666-6666-000000000002'::uuid, '00000000-0000-0000-0000-000000000001',
   'Three Scales of NYC Design', 'Panel', 1),
  ('ffffffff-6666-6666-6666-000000000003'::uuid, '00000000-0000-0000-0000-000000000001',
   'Community Roundtable', 'Roundtable', 2),
  ('ffffffff-6666-6666-6666-000000000004'::uuid, '00000000-0000-0000-0000-000000000001',
   'Lightning Talks', 'Lightning Talks', 3),
  ('ffffffff-6666-6666-6666-000000000005'::uuid, '00000000-0000-0000-0000-000000000001',
   'Closing Keynote — Make Weird Things', 'Keynote', 4),
  ('ffffffff-6666-6666-6666-000000000006'::uuid, '00000000-0000-0000-0000-000000000001',
   'Design Awards Judges', 'Judges', 5)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Segment ↔ speakers
-- ----------------------------------------------------------------------------
-- role='moderator' visually distinguishes the apex node; everyone else is a
-- panel/cluster node. position controls left-to-right order along the arc.
-- ----------------------------------------------------------------------------

insert into segment_speakers (segment_id, speaker_id, role, position) values
  -- Opening Keynote & Live Portfolio Review — Christie + CJ
  ('ffffffff-6666-6666-6666-000000000001', 'eeeeeeee-5555-5555-5555-000000000001', 'speaker', 0),
  ('ffffffff-6666-6666-6666-000000000001', 'eeeeeeee-5555-5555-5555-000000000002', 'speaker', 1),

  -- Three Scales Panel — Shandy / Siddiq / Dotun, moderator Yiting
  ('ffffffff-6666-6666-6666-000000000002', 'eeeeeeee-5555-5555-5555-000000000021', 'moderator', 0),
  ('ffffffff-6666-6666-6666-000000000002', 'eeeeeeee-5555-5555-5555-000000000003', 'speaker', 1),
  ('ffffffff-6666-6666-6666-000000000002', 'eeeeeeee-5555-5555-5555-000000000004', 'speaker', 2),
  ('ffffffff-6666-6666-6666-000000000002', 'eeeeeeee-5555-5555-5555-000000000005', 'speaker', 3),

  -- Community Roundtable — Stacey / Shandy / Cherie, moderator Chelsea
  ('ffffffff-6666-6666-6666-000000000003', 'eeeeeeee-5555-5555-5555-000000000014', 'moderator', 0),
  ('ffffffff-6666-6666-6666-000000000003', 'eeeeeeee-5555-5555-5555-000000000016', 'speaker', 1),
  ('ffffffff-6666-6666-6666-000000000003', 'eeeeeeee-5555-5555-5555-000000000003', 'speaker', 2),
  ('ffffffff-6666-6666-6666-000000000003', 'eeeeeeee-5555-5555-5555-000000000015', 'speaker', 3),

  -- Lightning Talks — Soo Yun / Lee-Sean / Mustafa / Michelle
  ('ffffffff-6666-6666-6666-000000000004', 'eeeeeeee-5555-5555-5555-000000000006', 'speaker', 0),
  ('ffffffff-6666-6666-6666-000000000004', 'eeeeeeee-5555-5555-5555-000000000008', 'speaker', 1),
  ('ffffffff-6666-6666-6666-000000000004', 'eeeeeeee-5555-5555-5555-000000000009', 'speaker', 2),
  ('ffffffff-6666-6666-6666-000000000004', 'eeeeeeee-5555-5555-5555-000000000007', 'speaker', 3),

  -- Closing Keynote — Gazi
  ('ffffffff-6666-6666-6666-000000000005', 'eeeeeeee-5555-5555-5555-000000000020', 'speaker', 0),

  -- Design Awards Judges — Craig / Jessica / Christine / CJ / Christie / Soo Yun
  ('ffffffff-6666-6666-6666-000000000006', 'eeeeeeee-5555-5555-5555-000000000017', 'speaker', 0),
  ('ffffffff-6666-6666-6666-000000000006', 'eeeeeeee-5555-5555-5555-000000000018', 'speaker', 1),
  ('ffffffff-6666-6666-6666-000000000006', 'eeeeeeee-5555-5555-5555-000000000019', 'speaker', 2),
  ('ffffffff-6666-6666-6666-000000000006', 'eeeeeeee-5555-5555-5555-000000000002', 'speaker', 3),
  ('ffffffff-6666-6666-6666-000000000006', 'eeeeeeee-5555-5555-5555-000000000001', 'speaker', 4),
  ('ffffffff-6666-6666-6666-000000000006', 'eeeeeeee-5555-5555-5555-000000000006', 'speaker', 5)
on conflict (segment_id, speaker_id) do nothing;

-- Note: compositions are auto-built by the SegmentsTab editor on next save.
-- See shared/src/buildSegmentComposition.ts. The remote DB has been backfilled
-- with computed JSON for the six seeded segments above; re-running this seed
-- on a fresh DB will leave composition=NULL until each segment is saved once.

commit;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- delete from segment_speakers where segment_id::text like 'ffffffff-6666-%';
-- delete from segments          where id::text like 'ffffffff-6666-%';
-- delete from speakers          where id::text like 'eeeeeeee-5555-%';
