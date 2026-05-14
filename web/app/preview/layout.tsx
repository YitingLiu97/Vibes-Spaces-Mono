import { ToastProvider } from '@/components/Toast';

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
