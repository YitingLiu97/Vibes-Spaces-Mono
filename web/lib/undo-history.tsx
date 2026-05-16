'use client';

// Undo / redo history shared across the dashboard.
//
// Why this shape:
//   - Actions are plain JSON (no closures), so we can persist the stack to
//     localStorage and survive page reloads.
//   - The framework is agnostic to which tab fired an action — applying an
//     undo/redo just runs `apply(action, direction)` against Supabase.
//   - Surfaces that mutate data call `record(action)` after a successful
//     mutation. They include `signal` in their data-load deps so undo /
//     redo causes a refetch.
//
// To wire a NEW surface:
//   1. Add a kind to `UndoAction` below + handle it in `applyAction`.
//   2. After your supabase write succeeds, call
//        record({ kind: '...', description: '...', ...payload })
//   3. In the surface's data-load effect, depend on `useHistorySignal()` so
//      an undo / redo re-fetches.
//
// Persisted across reloads via localStorage. Stack bounded to 100 each side.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getSupabase } from './supabase';

// ---------------------------------------------------------------------------
// Action shapes
// ---------------------------------------------------------------------------

export interface ScheduleEntryRow {
  id: string;
  org_id: string;
  scene_id: string | null;
  playlist_id: string | null;
  start_time: string;
  end_time: string;
  weekday_mask: number | null;
  override_date: string | null;
}

export interface SchedulePatch {
  start_time?: string;
  end_time?: string;
  scene_id?: string | null;
  playlist_id?: string | null;
  weekday_mask?: number | null;
  override_date?: string | null;
}

export interface SceneRow {
  id: string;
  org_id: string;
  name: string;
  video_url: string;
  hide_attribution: boolean;
  loop_enabled: boolean;
  composition: unknown;
}

export type UndoAction =
  // ── Schedule ────────────────────────────────────────────────────────────
  | { kind: 'schedule.create'; description: string; row: ScheduleEntryRow }
  | { kind: 'schedule.delete'; description: string; row: ScheduleEntryRow }
  | {
      kind: 'schedule.update';
      description: string;
      id: string;
      before: SchedulePatch;
      after: SchedulePatch;
    }
  // ── Scenes ──────────────────────────────────────────────────────────────
  | {
      kind: 'scene.update_composition';
      description: string;
      sceneId: string;
      before: unknown;
      after: unknown;
    }
  | {
      kind: 'scene.update_video_url';
      description: string;
      sceneId: string;
      before: string;
      after: string;
    }
  | {
      kind: 'scene.update_toggle';
      description: string;
      sceneId: string;
      field: 'hide_attribution' | 'loop_enabled';
      before: boolean;
      after: boolean;
    }
  | { kind: 'scene.create'; description: string; row: SceneRow }
  | { kind: 'scene.delete'; description: string; row: SceneRow };

// ---------------------------------------------------------------------------
// applyAction — runs the DB mutation in the chosen direction.
// ---------------------------------------------------------------------------

async function applyAction(action: UndoAction, direction: 'undo' | 'redo'): Promise<void> {
  const supabase = getSupabase();
  switch (action.kind) {
    // ── Schedule ──────────────────────────────────────────────────────────
    case 'schedule.create': {
      // redo creates, undo deletes.
      if (direction === 'redo') {
        const { error } = await supabase
          .from('schedule_entries')
          .upsert(action.row, { onConflict: 'id' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('schedule_entries').delete().eq('id', action.row.id);
        if (error) throw error;
      }
      return;
    }
    case 'schedule.delete': {
      // redo deletes, undo recreates.
      if (direction === 'redo') {
        const { error } = await supabase.from('schedule_entries').delete().eq('id', action.row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('schedule_entries')
          .upsert(action.row, { onConflict: 'id' });
        if (error) throw error;
      }
      return;
    }
    case 'schedule.update': {
      const patch = direction === 'redo' ? action.after : action.before;
      const { error } = await supabase.from('schedule_entries').update(patch).eq('id', action.id);
      if (error) throw error;
      return;
    }
    // ── Scenes ────────────────────────────────────────────────────────────
    case 'scene.update_composition': {
      const value = direction === 'redo' ? action.after : action.before;
      const { error } = await supabase
        .from('scenes')
        .update({ composition: value })
        .eq('id', action.sceneId);
      if (error) throw error;
      return;
    }
    case 'scene.update_video_url': {
      const value = direction === 'redo' ? action.after : action.before;
      const { error } = await supabase
        .from('scenes')
        .update({ video_url: value })
        .eq('id', action.sceneId);
      if (error) throw error;
      return;
    }
    case 'scene.update_toggle': {
      const value = direction === 'redo' ? action.after : action.before;
      const { error } = await supabase
        .from('scenes')
        .update({ [action.field]: value })
        .eq('id', action.sceneId);
      if (error) throw error;
      return;
    }
    case 'scene.create': {
      if (direction === 'redo') {
        const { error } = await supabase.from('scenes').upsert(action.row, { onConflict: 'id' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scenes').delete().eq('id', action.row.id);
        if (error) throw error;
      }
      return;
    }
    case 'scene.delete': {
      if (direction === 'redo') {
        const { error } = await supabase.from('scenes').delete().eq('id', action.row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scenes').upsert(action.row, { onConflict: 'id' });
        if (error) throw error;
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Provider + hooks
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'vibes:undo-history:v1';
const MAX_STACK = 100;

type State = { past: UndoAction[]; future: UndoAction[] };

interface ContextValue {
  record: (action: UndoAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  nextUndoLabel: string | null;
  nextRedoLabel: string | null;
  signal: number;
  busy: boolean;
}

const HistoryContext = createContext<ContextValue | null>(null);

function loadFromStorage(): State {
  if (typeof window === 'undefined') return { past: [], future: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { past: [], future: [] };
    const parsed = JSON.parse(raw) as State;
    if (!Array.isArray(parsed.past) || !Array.isArray(parsed.future)) {
      return { past: [], future: [] };
    }
    return parsed;
  } catch {
    return { past: [], future: [] };
  }
}

function saveToStorage(state: State) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage disabled — silently drop persistence; the
    // in-memory stack still works for the current session.
  }
}

export function UndoHistoryProvider({ children }: { children: React.ReactNode }) {
  // Start empty on both server and client so SSR markup matches the first
  // client render (no hydration warning). The real stack is hydrated from
  // localStorage in the effect below, after mount.
  const [state, setState] = useState<State>({ past: [], future: [] });
  const [hydrated, setHydrated] = useState(false);
  const [signal, setSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(loadFromStorage());
    setHydrated(true);
  }, []);

  // Persist on every change — but skip the initial render (before hydration)
  // so we don't blow away the persisted stack with our empty seed value.
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(state);
  }, [state, hydrated]);

  const record = useCallback((action: UndoAction) => {
    // eslint-disable-next-line no-console
    console.debug('[undo] record', action.kind, action.description);
    setState((prev) => {
      const past = [...prev.past, action];
      if (past.length > MAX_STACK) past.shift();
      // A fresh action invalidates the redo branch.
      const next = { past, future: [] };
      // eslint-disable-next-line no-console
      console.debug('[undo] stack now past=' + past.length + ' future=0');
      return next;
    });
  }, []);

  const undo = useCallback(async () => {
    const action = stateRef.current.past[stateRef.current.past.length - 1];
    if (!action || busy) return;
    setBusy(true);
    try {
      await applyAction(action, 'undo');
      setState((prev) => ({
        past: prev.past.slice(0, -1),
        future: [...prev.future, action],
      }));
      setSignal((s) => s + 1);
    } catch (err) {
      // Pop the bad action so the user isn't stuck on it. Surface the kind
      // so they have a hint about what failed.
      setState((prev) => ({ past: prev.past.slice(0, -1), future: prev.future }));
      throw err;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const redo = useCallback(async () => {
    const action = stateRef.current.future[stateRef.current.future.length - 1];
    if (!action || busy) return;
    setBusy(true);
    try {
      await applyAction(action, 'redo');
      setState((prev) => ({
        past: [...prev.past, action],
        future: prev.future.slice(0, -1),
      }));
      setSignal((s) => s + 1);
    } catch (err) {
      setState((prev) => ({ past: prev.past, future: prev.future.slice(0, -1) }));
      throw err;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const value = useMemo<ContextValue>(
    () => ({
      record,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      nextUndoLabel: state.past[state.past.length - 1]?.description ?? null,
      nextRedoLabel: state.future[state.future.length - 1]?.description ?? null,
      signal,
      busy,
    }),
    [record, undo, redo, state, signal, busy],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useUndoHistory(): ContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useUndoHistory must be used inside <UndoHistoryProvider>');
  return ctx;
}

// Convenience: subscribe to the bump-counter from a data-loading effect.
export function useHistorySignal(): number {
  return useUndoHistory().signal;
}
