import { useEffect, useId, useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import { PinKeypad } from './PinKeypad';

interface CounterUnlockModalProps {
  open: boolean;
  onVerifyPin: (enteredPin: string) => boolean;
  onClose: () => void;
}

export function CounterUnlockModal({
  open,
  onVerifyPin,
  onClose,
}: CounterUnlockModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleAttemptPin(enteredPin: string): boolean {
    const ok = onVerifyPin(enteredPin);
    if (!ok) {
      setError(t.pinLock.incorrectPin);
      return false;
    }
    setError(null);
    return true;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="counter-unlock-modal"
      className="modal-backdrop-enter fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="modal-panel-enter bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <LockKeyhole className="w-4 h-4 text-slate-700 shrink-0" aria-hidden="true" />
            <h2 id={titleId} className="text-sm font-bold text-slate-950 truncate">
              {t.pinLock.unlockTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 text-center leading-relaxed">
            {t.pinLock.unlockSubtitle}
          </p>

          <PinKeypad
            onVerifyPin={handleAttemptPin}
            errorMessage={error}
            onClearError={() => setError(null)}
          />

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-150 active:scale-[0.98]"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
