import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { dangerButton, primaryButton, secondaryButton } from '../ui';

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (request: ConfirmRequest) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside ConfirmProvider');
  }
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmRequest) => {
    resolver.current?.(false);
    setRequest(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request ? (
        <ConfirmDialog request={request} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
      ) : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  request,
  onConfirm,
  onCancel,
}: {
  request: ConfirmRequest;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const messageId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/70"
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-panel p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
          {request.title}
        </h2>
        <p id={messageId} className="mt-2 text-sm leading-6 text-zinc-400">
          {request.message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button className={secondaryButton} type="button" onClick={onCancel}>
            {request.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            className={request.danger ? dangerButton : primaryButton}
            type="button"
            onClick={onConfirm}
          >
            {request.confirmLabel ?? 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
