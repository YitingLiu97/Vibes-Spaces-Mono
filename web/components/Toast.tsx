'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';

type ToastVariant = 'default' | 'destructive';

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastInternal extends ToastInput {
  id: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      const duration = input.durationMs ?? 4000;
      setToasts((prev) => [...prev, { ...input, id }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-5 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({
  toast,
  onDismiss,
}: {
  toast: ToastInternal;
  onDismiss: () => void;
}) {
  const isDestructive = toast.variant === 'destructive';
  const Icon = isDestructive ? AlertCircle : Check;

  return (
    <div
      className={clsx(
        'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg',
        'animate-[slideUp_200ms_ease-out]',
        isDestructive
          ? 'bg-danger-soft border-danger/40'
          : 'bg-bg-elevated border-border',
      )}
      style={{ background: isDestructive ? 'var(--color-danger-soft)' : 'var(--color-bg-elevated)' }}
    >
      <Icon
        className={clsx('mt-0.5 h-5 w-5 flex-shrink-0', isDestructive ? 'text-danger' : 'text-success')}
        strokeWidth={1.5}
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-fg-primary">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs text-fg-secondary">{toast.description}</div>
        )}
        {toast.action && (
          <button
            className="mt-2 text-xs font-medium text-accent hover:text-accent-hover"
            onClick={() => {
              toast.action!.onClick();
              onDismiss();
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-fg-tertiary hover:text-fg-secondary">
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
