'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ToastProvider } from '@/components/Toast';

const TABS = [
  { href: '/dashboard', label: 'Now' },
  { href: '/dashboard/scenes', label: 'Scenes' },
  { href: '/dashboard/overlays', label: 'Overlays' },
  { href: '/dashboard/playlists', label: 'Playlists' },
  { href: '/dashboard/schedule', label: 'Schedule' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-base/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/dashboard" className="font-display text-lg text-fg-primary">
              Vibes Spaces
            </Link>
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
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
