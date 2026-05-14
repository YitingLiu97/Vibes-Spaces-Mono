'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Scene } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { useToast } from './Toast';

export function SettingsTab() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [defaultSceneId, setDefaultSceneId] = useState<string | null>(null);
  const [attributionEnabled, setAttributionEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const [scenesRes, settingsRes] = await Promise.all([
      supabase.from('scenes').select('id,name').eq('org_id', ORG_ID),
      supabase.from('org_settings').select('*').eq('org_id', ORG_ID).maybeSingle(),
    ]);
    setScenes(
      (scenesRes.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        videoUrl: '',
        hideAttribution: false,
        loopEnabled: true,
        composition: null,
      })),
    );
    if (settingsRes.data) {
      setDefaultSceneId(settingsRes.data.default_scene_id);
      setAttributionEnabled(settingsRes.data.attribution_enabled);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  async function updateDefault(sceneId: string) {
    setDefaultSceneId(sceneId || null);
    try {
      await getSupabase()
        .from('org_settings')
        .update({ default_scene_id: sceneId || null })
        .eq('org_id', ORG_ID);
      toast({ title: 'Default scene updated' });
    } catch {
      toast({ variant: 'destructive', title: 'Couldn’t save' });
      refresh();
    }
  }

  async function updateAttribution(enabled: boolean) {
    setAttributionEnabled(enabled);
    try {
      await getSupabase()
        .from('org_settings')
        .update({ attribution_enabled: enabled })
        .eq('org_id', ORG_ID);
      toast({ title: enabled ? 'Attribution shown' : 'Attribution hidden' });
    } catch {
      refresh();
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-bg-elevated" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-fg-primary">Settings</h1>

      <section className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-5">
        <h2 className="text-base font-medium text-fg-primary">Default scene</h2>
        <p className="text-sm text-fg-secondary">
          What plays when no schedule entry matches.
        </p>
        <select
          value={defaultSceneId ?? ''}
          onChange={(e) => updateDefault(e.target.value)}
          className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary"
        >
          <option value="">— None —</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-5">
        <h2 className="text-base font-medium text-fg-primary">Attribution</h2>
        <p className="text-sm text-fg-secondary">
          Show the Vibes wordmark on the venue display. Per-scene overrides on the Scenes tab.
        </p>
        <label className="flex items-center gap-3 text-sm text-fg-primary">
          <input
            type="checkbox"
            checked={attributionEnabled}
            onChange={(e) => updateAttribution(e.target.checked)}
          />
          Show Vibes wordmark by default
        </label>
      </section>
    </div>
  );
}
