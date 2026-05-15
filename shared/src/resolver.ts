import type {
  OrgSettings,
  ScheduleEntry,
  QueueItem,
  ResolvedSlot,
} from './types.js';

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
  return {
    sceneId: e.sceneId,
    playlistId: e.playlistId,
    sourceEntryId: e.id,
    queueItemId: null,
  };
}

function queueSlot(item: QueueItem): ResolvedSlot {
  return {
    sceneId: item.sceneId,
    playlistId: item.playlistId,
    sourceEntryId: `queue:${item.id}`,
    queueItemId: item.id,
  };
}

/**
 * Pick the queue item that should be playing right now, or null if the
 * queue is exhausted / not active.
 *
 * Behavior chosen by the operator:
 *   1. No active cursor (queueCurrentItemId or queueStartedAt is null) and
 *      items exist → auto-start at items[0].
 *   2. Cursor item was deleted (id not found in current list) → treat the
 *      queue as ended. Removing the currently-playing item is an explicit
 *      operator action ("get this off"); silently restarting from the top
 *      would surprise them. Falls through to schedule/default. (Postgres
 *      FK ON DELETE SET NULL clears the cursor too, sending us through
 *      rule 1 instead next time around.)
 *   3. Late catch-up: if elapsed-since-startedAt is way past the current
 *      item's duration, sum durations forward from the cursor and jump
 *      to whichever item the elapsed time has caught up to. Treats the
 *      queue like a timeline ("where would we be by now?").
 *   4. Cursor was on the LAST item and its duration has elapsed → return
 *      null. Resolver falls through to schedule/default.
 *
 * Pure: no Date.now(), no DB writes. The caller (Scheduler.tick) compares
 * the returned item.id to settings.queueCurrentItemId and writes the new
 * cursor when they differ.
 */
function pickQueueItem(
  now: Date,
  settings: OrgSettings,
  sortedItems: QueueItem[],
): QueueItem | null {
  if (sortedItems.length === 0) return null;

  // Rule 1: no cursor → auto-start at the top.
  if (!settings.queueCurrentItemId || !settings.queueStartedAt) {
    return sortedItems[0];
  }

  // Rule 2: cursor item is gone → treat queue as ended (fall through).
  const cursorIdx = sortedItems.findIndex((i) => i.id === settings.queueCurrentItemId);
  if (cursorIdx === -1) {
    return null;
  }

  // Clock-skew defense: a startedAt in the future would otherwise produce
  // a negative elapsed and infinite-loop the catch-up walk. Stay put.
  const elapsedSec = (now.getTime() - new Date(settings.queueStartedAt).getTime()) / 1000;
  if (elapsedSec < 0) return sortedItems[cursorIdx];

  // Rules 3 + 4: sum durations from the cursor forward; pick the item
  // whose window contains elapsedSec. Past the end → exhausted (null).
  let accumulated = 0;
  for (let i = cursorIdx; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    if (elapsedSec < accumulated + item.durationSeconds) {
      return item;
    }
    accumulated += item.durationSeconds;
  }
  return null;
}

export function resolve(
  now: Date,
  settings: OrgSettings,
  entries: ScheduleEntry[],
  queueItems: QueueItem[] = [],
): ResolvedSlot {
  if (settings.forcePlaySceneId) {
    return {
      sceneId: settings.forcePlaySceneId,
      playlistId: null,
      sourceEntryId: 'force_play',
      queueItemId: null,
    };
  }

  const sortedQueue = [...queueItems].sort((a, b) => a.position - b.position);
  const queueItem = pickQueueItem(now, settings, sortedQueue);
  if (queueItem) return queueSlot(queueItem);

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
    queueItemId: null,
  };
}
