import { describe, it, expect } from 'vitest';
import { resolve } from '../src/resolver.js';
import type { OrgSettings, ScheduleEntry } from '../src/types.js';

const settings = (overrides: Partial<OrgSettings> = {}): OrgSettings => ({
  orgId: 'test',
  defaultSceneId: 'default-scene',
  attributionEnabled: true,
  forcePlaySceneId: null,
  liveOverlayId: null,
  liveOverlayStartedAt: null,
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
});
