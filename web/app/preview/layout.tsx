import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ToastProvider>
  );
}
