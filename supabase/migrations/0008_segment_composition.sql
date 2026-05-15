-- Vibes Spaces 0008 — composition layer on segments
--
-- SegmentsTab now pre-builds a SceneComposition when a segment is saved,
-- so the Build tab can preview/use it without re-running the layout logic.
-- Stored as jsonb to mirror scenes.composition (added in 0003).

alter table segments
  add column if not exists composition jsonb;

comment on column segments.composition is
  'Auto-built scene composition (zones + caption + tint). Mirrors scenes.composition; see shared/src/buildSegmentComposition.ts.';
