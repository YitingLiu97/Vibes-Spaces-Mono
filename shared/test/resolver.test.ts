import { describe, it, expect } from 'vitest';
import { resolve } from '../src/resolver.js';
import type { OrgSettings, QueueItem, ScheduleEntry } from '../src/types.js';

const qItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'q1',
  position: 0,
  sceneId: 'q-scene',
  playlistId: null,
  durationSeconds: 300,
  ...overrides,
});

const settings = (overrides: Partial<OrgSettings> = {}): OrgSettings => ({
  orgId: 'test',
  defaultSceneId: 'default-scene',
  attributionEnabled: true,
  forcePlaySceneId: null,
  liveOverlayId: null,
  liveOverlayStartedAt: null,
  queueCurrentItemId: null,
  queueStartedAt: null,
  ...overrides,
});

const entry = (overrides: Partial<ScheduleEntry> = {}): ScheduleEntry => ({
  id: 'e1',
  sceneId: 'scene-a',
  playlistId: null,
  startTime: '09:00:00',
  endTime: '17:00:00',
  weekdayMask: null,
  overrideDate: null,
  ...overrides,
});

describe('resolver', () => {
  it('force_play beats everything', () => {
    const slot = resolve(
      new Date('2026-05-16T12:00:00'),
      settings({ forcePlaySceneId: 'forced' }),
      [
        entry({
          id: 'e1',
          sceneId: 'scheduled',
          startTime: '00:00:00',
          endTime: '23:59:59',
          overrideDate: '2026-05-16',
        }),
      ],
    );
    expect(slot.sceneId).toBe('forced');
    expect(slot.sourceEntryId).toBe('force_play');
    expect(slot.playlistId).toBeNull();
  });

  it('one-off override beats weekly', () => {
    const saturday = new Date('2026-05-16T12:00:00');
    const slot = resolve(saturday, settings(), [
      entry({
        id: 'weekly',
        sceneId: 'weekly-scene',
        weekdayMask: 0b1111111,
        startTime: '00:00:00',
        endTime: '23:59:59',
      }),
      entry({
        id: 'oneoff',
        sceneId: 'oneoff-scene',
        overrideDate: '2026-05-16',
        startTime: '10:00:00',
        endTime: '14:00:00',
      }),
    ]);
    expect(slot.sceneId).toBe('oneoff-scene');
    expect(slot.sourceEntryId).toBe('oneoff');
  });

  it('weekly fires on matching weekday mask', () => {
    const saturday = new Date('2026-05-16T12:00:00');
    const saturdayBit = 1 << 6;
    const slot = resolve(saturday, settings(), [
      entry({
        id: 'sat-only',
        sceneId: 'sat-scene',
        weekdayMask: saturdayBit,
      }),
    ]);
    expect(slot.sceneId).toBe('sat-scene');
    expect(slot.sourceEntryId).toBe('sat-only');
  });

  it('weekly does not fire when weekday bit is unset', () => {
    const saturday = new Date('2026-05-16T12:00:00');
    const sundayBit = 1 << 0;
    const slot = resolve(saturday, settings(), [
      entry({
        id: 'sun-only',
        sceneId: 'sun-scene',
        weekdayMask: sundayBit,
      }),
    ]);
    expect(slot.sceneId).toBe('default-scene');
    expect(slot.sourceEntryId).toBe('default');
  });

  it('endTime is exclusive (boundary returns default)', () => {
    const at5pm = new Date('2026-05-16T17:00:00');
    const saturdayBit = 1 << 6;
    const slot = resolve(at5pm, settings(), [
      entry({
        id: 'morning',
        sceneId: 'morning-scene',
        weekdayMask: saturdayBit,
        startTime: '09:00:00',
        endTime: '17:00:00',
      }),
    ]);
    expect(slot.sceneId).toBe('default-scene');
    expect(slot.sourceEntryId).toBe('default');
  });

  it('Sunday is bit 0 (mask=1)', () => {
    const sunday = new Date('2026-05-17T12:00:00');
    expect(sunday.getDay()).toBe(0);
    const sundayBit = 1 << 0;
    const slot = resolve(sunday, settings(), [
      entry({
        id: 'sun',
        sceneId: 'sun-scene',
        weekdayMask: sundayBit,
      }),
    ]);
    expect(slot.sceneId).toBe('sun-scene');
  });

  it('no match + no default returns null sceneId', () => {
    const slot = resolve(
      new Date('2026-05-16T03:00:00'),
      settings({ defaultSceneId: null }),
      [],
    );
    expect(slot.sceneId).toBeNull();
    expect(slot.sourceEntryId).toBe('default');
  });

  it('playlist entry returns playlistId', () => {
    const saturday = new Date('2026-05-16T12:00:00');
    const saturdayBit = 1 << 6;
    const slot = resolve(saturday, settings(), [
      entry({
        id: 'pl-entry',
        sceneId: null,
        playlistId: 'pl-1',
        weekdayMask: saturdayBit,
      }),
    ]);
    expect(slot.playlistId).toBe('pl-1');
    expect(slot.sourceEntryId).toBe('pl-entry');
  });

  // ── Queue ──────────────────────────────────────────────────────────────

  it('queue auto-starts at items[0] when cursor is null', () => {
    const now = new Date('2026-05-16T12:00:00');
    const slot = resolve(now, settings(), [], [qItem({ id: 'q1', sceneId: 'q-scene' })]);
    expect(slot.sceneId).toBe('q-scene');
    expect(slot.queueItemId).toBe('q1');
    expect(slot.sourceEntryId).toBe('queue:q1');
  });

  it('queue beats schedule/default but loses to force_play', () => {
    const now = new Date('2026-05-16T12:00:00');
    const forced = resolve(
      now,
      settings({ forcePlaySceneId: 'forced' }),
      [],
      [qItem({ sceneId: 'q-scene' })],
    );
    expect(forced.sceneId).toBe('forced');
    expect(forced.queueItemId).toBeNull();

    const queued = resolve(now, settings(), [], [qItem({ sceneId: 'q-scene' })]);
    expect(queued.sceneId).toBe('q-scene');
  });

  it('queue catch-up jumps to the item whose window contains elapsed', () => {
    // started 12 minutes ago. items: A(5min) B(5min) C(5min).
    // accumulated: A=5, A+B=10, A+B+C=15. elapsed=12 → in window of C.
    const startedAt = new Date('2026-05-16T12:00:00');
    const now = new Date('2026-05-16T12:12:00');
    const slot = resolve(
      now,
      settings({ queueCurrentItemId: 'q-a', queueStartedAt: startedAt.toISOString() }),
      [],
      [
        qItem({ id: 'q-a', position: 0, durationSeconds: 300, sceneId: 'a' }),
        qItem({ id: 'q-b', position: 1, durationSeconds: 300, sceneId: 'b' }),
        qItem({ id: 'q-c', position: 2, durationSeconds: 300, sceneId: 'c' }),
      ],
    );
    expect(slot.sceneId).toBe('c');
    expect(slot.queueItemId).toBe('q-c');
  });

  it('queue exhaustion returns null and falls through to default', () => {
    // started 1 hour ago, 3 items of 5min each = 15min total. elapsed=60 > 15.
    const startedAt = new Date('2026-05-16T11:00:00');
    const now = new Date('2026-05-16T12:00:00');
    const slot = resolve(
      now,
      settings({ queueCurrentItemId: 'q-a', queueStartedAt: startedAt.toISOString() }),
      [],
      [
        qItem({ id: 'q-a', position: 0, durationSeconds: 300 }),
        qItem({ id: 'q-b', position: 1, durationSeconds: 300 }),
        qItem({ id: 'q-c', position: 2, durationSeconds: 300 }),
      ],
    );
    expect(slot.sceneId).toBe('default-scene');
    expect(slot.sourceEntryId).toBe('default');
    expect(slot.queueItemId).toBeNull();
  });

  it('queue restarts at items[0] when the cursor item was deleted', () => {
    // cursor points to q-gone, which isn't in the list anymore.
    const now = new Date('2026-05-16T12:00:00');
    const startedAt = new Date('2026-05-16T11:59:00').toISOString();
    const slot = resolve(
      now,
      settings({ queueCurrentItemId: 'q-gone', queueStartedAt: startedAt }),
      [],
      [
        qItem({ id: 'q-a', position: 0, sceneId: 'a' }),
        qItem({ id: 'q-b', position: 1, sceneId: 'b' }),
      ],
    );
    expect(slot.queueItemId).toBe('q-a');
  });

  it('queue stays put when startedAt is in the future (clock skew)', () => {
    const now = new Date('2026-05-16T12:00:00');
    const future = new Date('2026-05-16T13:00:00').toISOString();
    const slot = resolve(
      now,
      settings({ queueCurrentItemId: 'q-b', queueStartedAt: future }),
      [],
      [
        qItem({ id: 'q-a', position: 0 }),
        qItem({ id: 'q-b', position: 1, sceneId: 'on-b' }),
      ],
    );
    expect(slot.queueItemId).toBe('q-b');
    expect(slot.sceneId).toBe('on-b');
  });
});
