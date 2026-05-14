'use client';

import Link from 'next/link';
import { Upload, Eye, Sparkles } from 'lucide-react';

interface Props {
  hasOverlays: boolean;
}

export function QuickStart({ hasOverlays }: Props) {
  return (
    <section
      aria-labelledby="quickstart-heading"
      className="rounded-xl border border-accent/30 bg-bg-elevated p-6"
      style={{ background: 'linear-gradient(180deg, rgba(192,127,212,0.06), var(--color-bg-elevated))' }}
    >
      <div className="mb-4 flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-[2px] text-accent">Get started</span>
        <h2 id="quickstart-heading" className="font-display text-2xl tracking-wider text-fg-primary">
          Two minutes to your first venue display
        </h2>
        <p className="text-sm text-fg-secondary">
          Three steps. Everything else is optional.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        <Step
          n={1}
          done={false}
          title="Upload your first scene"
          body="A video file becomes a Scene. The venue plays whatever's scheduled — or whatever you press Play on."
          cta={
            <Link
              href="/dashboard/scenes"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-fg-on-accent hover:bg-accent-hover"
            >
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              Open Scenes
            </Link>
          }
        />
        <Step
          n={2}
          done={false}
          title="Open the preview"
          body="See exactly what the venue display is showing, in a browser tab. Keep it open while you work."
          cta={
            <a
              href="/preview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-border bg-bg-base px-4 py-2 text-sm font-medium text-fg-primary hover:border-accent"
            >
              <Eye className="h-4 w-4" strokeWidth={1.5} />
              Open preview ↗
            </a>
          }
        />
        <Step
          n={3}
          done={hasOverlays}
          title="(Optional) Build cards for live moments"
          body="Speaker names, quotes, logos. Tap one to pop it on top of the playing scene."
          cta={
            <Link
              href="/dashboard/overlays"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-border bg-bg-base px-4 py-2 text-sm font-medium text-fg-primary hover:border-accent"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              Open Cards
            </Link>
          }
        />
      </ol>
    </section>
  );
}

function Step({
  n,
  done,
  title,
  body,
  cta,
}: {
  n: number;
  done: boolean;
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-base/40 p-4 sm:flex-row sm:items-start sm:gap-4">
      <div
        className={
          done
            ? 'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success text-bg-base font-mono text-xs font-bold'
            : 'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-accent text-accent font-mono text-xs font-bold'
        }
      >
        {done ? '✓' : n}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="font-display tracking-wider text-base text-fg-primary">{title}</div>
        <p className="text-sm text-fg-secondary">{body}</p>
      </div>
      <div className="flex-shrink-0">{cta}</div>
    </li>
  );
}
