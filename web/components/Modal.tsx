'use client';

import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        className={clsx(
          'relative z-10 flex w-full max-w-md flex-col rounded-t-xl border border-border-subtle',
          'bg-bg-elevated max-h-[92vh] sm:rounded-xl',
        )}
        style={{ background: 'var(--color-bg-elevated)' }}
      >
        <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-fg-tertiary hover:text-fg-secondary"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border-subtle bg-bg-elevated px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
