'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { clsx } from 'clsx';
import { ToastProvider, useToast } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UndoHistoryProvider, useUndoHistory } from '@/lib/undo-history';

const TABS = [
  { href: '/dashboard', label: 'Now' },
  { href: '/dashboard/build', label: 'Build' },
  { href: '/dashboard/scenes', label: 'Scenes' },
  { href: '/dashboard/segments', label: 'Segments' },
  { href: '/dashboard/overlays', label: 'Cards' },
  { href: '/dashboard/playlists', label: 'Playlists' },
  { href: '/dashboard/queue', label: 'Queue' },
  { href: '/dashboard/schedule', label: 'Schedule' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <UndoHistoryProvider>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-base/95 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
              <Link href="/dashboard" className="font-display text-lg text-fg-primary">
                Vibes Spaces
              </Link>
              <UndoRedoControls />
            </div>
            <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-3" role="navigation">
              {TABS.map((tab) => {
                const active =
                  tab.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={clsx(
                      'rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-overlay',
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </UndoHistoryProvider>
    </ToastProvider>
  );
}

// Header lockup for undo/redo. Two icon buttons + global Cmd/Ctrl+Z handler.
function UndoRedoControls() {
  const { undo, redo, canUndo, canRedo, nextUndoLabel, nextRedoLabel, busy } = useUndoHistory();
  const { toast } = useToast();

  // Cmd+Z / Ctrl+Z → undo, Cmd+Shift+Z / Ctrl+Shift+Z / Ctrl+Y → redo.
  // Skip when the user is typing in an editable field so we don't hijack
  // native input undo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const isRedo = (key === 'z' && e.shiftKey) || key === 'y';
      const isUndo = key === 'z' && !e.shiftKey;
      if (!isUndo && !isRedo) return;
      e.preventDefault();
      (isRedo ? handleRedo : handleUndo)();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // handleUndo / handleRedo are stable enough; including them would re-bind
    // on every render. The closure captures the latest `undo`/`redo` because
    // those are themselves recreated each render and we re-bind on rerender.
  });

  async function handleUndo() {
    if (!canUndo || busy) return;
    const label = nextUndoLabel;
    try {
      await undo();
      toast({ title: 'Undone', description: label ?? undefined });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t undo',
        description: 'The target may have been changed or removed elsewhere.',
      });
    }
  }

  async function handleRedo() {
    if (!canRedo || busy) return;
    const label = nextRedoLabel;
    try {
      await redo();
      toast({ title: 'Redone', description: label ?? undefined });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t redo',
        description: 'The target may have been changed or removed elsewhere.',
      });
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-border-subtle bg-bg-elevated p-1">
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo || busy}
        title={canUndo ? `Undo: ${nextUndoLabel ?? ''} (Ctrl+Z)` : 'Nothing to undo yet'}
        aria-label="Undo"
        className="inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium text-fg-secondary hover:bg-bg-overlay hover:text-fg-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-fg-secondary"
      >
        <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        Undo
      </button>
      <button
        type="button"
        onClick={handleRedo}
        disabled={!canRedo || busy}
        title={canRedo ? `Redo: ${nextRedoLabel ?? ''} (Ctrl+Shift+Z)` : 'Nothing to redo yet'}
        aria-label="Redo"
        className="inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium text-fg-secondary hover:bg-bg-overlay hover:text-fg-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-fg-secondary"
      >
        <Redo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        Redo
      </button>
    </div>
  );
}
