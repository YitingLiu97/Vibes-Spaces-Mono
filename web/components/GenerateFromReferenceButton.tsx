'use client';

import { Sparkles } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { useToast } from './Toast';

interface Props {
  surface: string;
}

export function GenerateFromReferenceButton({ surface }: Props) {
  const { toast } = useToast();

  async function handleClick() {
    try {
      await getSupabase()
        .from('feature_interest')
        .insert({
          org_id: ORG_ID,
          feature: 'reference_to_style',
          metadata: { surface, page: window.location.pathname },
        });
    } catch {
      // Silent — we don't want to discourage exploration.
    }
    toast({
      title: 'Coming soon',
      description: 'Reference-to-style generation. We logged your interest.',
    });
  }

  return (
    <button
      onClick={handleClick}
      className="relative inline-flex items-center gap-2 rounded-md border border-border bg-bg-elevated px-4 py-3 text-sm font-medium text-fg-primary hover:bg-bg-pressed min-h-[44px]"
    >
      <Sparkles className="h-4 w-4 text-accent animate-sparkle-pulse" strokeWidth={1.5} />
      Generate from reference
      <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
        Soon
      </span>
    </button>
  );
}
