import type { OrgSettings, ScheduleEntry, ResolvedSlot } from './types.js';

function timeToSeconds(s: string): number {
  const [h, m, sec] = s.split(':').map(Number);
  return h * 3600 + m * 60 + (sec ?? 0);
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toSlot(e: ScheduleEntry): ResolvedSlot {
  return { sceneId: e.sceneId, playlistId: e.playlistId, sourceEntryId: e.id };
}

export function resolve(
  now: Date,
  settings: OrgSettings,
  entries: ScheduleEntry[],
): ResolvedSlot {
  if (settings.forcePlaySceneId) {
    return { sceneId: settings.forcePlaySceneId, playlistId: null, sourceEntryId: 'force_play' };
  }

  const today = dateKey(now);
  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const oneOff = entries.find(
    (e) =>
      e.overrideDate === today &&
      nowSecs >= timeToSeconds(e.startTime) &&
      nowSecs < timeToSeconds(e.endTime),
  );
  if (oneOff) return toSlot(oneOff);

  const todayMask = 1 << now.getDay();
  const weekly = entries.find(
    (e) =>
      e.weekdayMask !== null &&
      (e.weekdayMask & todayMask) !== 0 &&
      nowSecs >= timeToSeconds(e.startTime) &&
      nowSecs < timeToSeconds(e.endTime),
  );
  if (weekly) return toSlot(weekly);

  return {
    sceneId: settings.defaultSceneId,
    playlistId: null,
    sourceEntryId: 'default',
  };
}
