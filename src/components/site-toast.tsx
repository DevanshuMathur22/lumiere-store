'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import { CheckCircle2, X } from 'lucide-react';

type Toast = { id: number; message: string };
type ToastApi = { notify: (message: string) => void };

const Context = createContext<ToastApi | null>(null);

export function SiteToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string) => {
    setToasts(old => [
      ...old.slice(-2),
      { id: Date.now() + Math.random(), message }
    ]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(old => old.filter(item => item.id !== id));
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map(item =>
      window.setTimeout(() => dismiss(item.id), 3000)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, dismiss]);

  return (
    <Context.Provider value={{ notify }}>
      {children}
      <div className="site-toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map(item => (
          <div className="site-toast" role="status" key={item.id}>
            <CheckCircle2 size={19} aria-hidden="true" />
            <span>{item.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}

export function useSiteToast() {
  const context = useContext(Context);
  if (!context) throw new Error('SiteToastProvider is missing');
  return context;
}
