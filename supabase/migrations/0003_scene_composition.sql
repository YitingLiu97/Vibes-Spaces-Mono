-- Vibes Spaces 0003 — per-scene composition layer
-- Adds an authored, persistent visual layer attached to each scene
-- (3 image zones + 1 caption + tint + frame accent override).
-- Renders beneath the live-overlay layer.

alter table scenes
  add column if not exists composition jsonb;

comment on column scenes.composition is
  'Optional scene composition (zones: header/center/footer image slots, caption with font/size/color/position, tint, accent). Renders persistently with the scene; live overlays render on top.';
