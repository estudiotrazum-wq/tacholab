import { useEffect, useRef } from 'react';
import { create } from 'zustand';

/**
 * Confirmaciones dentro de la aplicación (sustituyen a window.confirm, que
 * algunos visores bloquean y que no encaja con el diseño).
 */
interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

const useConfirmStore = create<{ request: ConfirmRequest | null }>(() => ({ request: null }));

export function askConfirm(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().request?.resolve(false);
    useConfirmStore.setState({ request: { message, confirmLabel: opts.confirmLabel ?? 'Aceptar', danger: opts.danger ?? false, resolve } });
  });
}

/** Ejecuta `action` solo si el usuario confirma. */
export function confirmThen(message: string, action: () => void, opts?: { confirmLabel?: string; danger?: boolean }): void {
  void askConfirm(message, opts).then((ok) => ok && action());
}

export function ConfirmDialog() {
  const request = useConfirmStore((s) => s.request);
  const okRef = useRef<HTMLButtonElement>(null);
  const close = (ok: boolean) => {
    request?.resolve(ok);
    useConfirmStore.setState({ request: null });
  };
  useEffect(() => {
    if (!request) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  if (!request) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg" onClick={() => close(false)}>
      <div className="glass-strong w-full max-w-sm rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <p id="confirm-msg" className="text-sm leading-relaxed text-slate-100">{request.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => close(false)} className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5" data-testid="confirm-cancel">Cancelar</button>
          <button
            ref={okRef}
            type="button"
            onClick={() => close(true)}
            data-testid="confirm-ok"
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${request.danger ? 'bg-rose-500 text-white' : 'bg-white text-slate-900'}`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** La aplicación se muestra dentro de otro sitio (p. ej. un visor): imprimir y descargar pueden estar bloqueados. */
export const isEmbedded = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
