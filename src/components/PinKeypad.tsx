import { useEffect, useState } from 'react';
import { Delete } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import { interpolate } from '../utils/i18n';

interface PinKeypadProps {
  onVerifyPin: (pin: string) => boolean;
  errorMessage: string | null;
  onClearError: () => void;
  autoFocusKeyboard?: boolean;
}

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

export function PinKeypad({
  onVerifyPin,
  errorMessage,
  onClearError,
  autoFocusKeyboard = true,
}: PinKeypadProps) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState('');

  function submitCandidate(candidate: string) {
    if (candidate.length !== 4) return;
    const matched = onVerifyPin(candidate);
    if (!matched) {
      setDigits('');
    }
  }

  function handleDigitPress(digit: string) {
    if (errorMessage) {
      onClearError();
    }
    setDigits((prev) => {
      if (prev.length >= 4) return prev;
      const next = `${prev}${digit}`;
      if (next.length === 4) {
        setTimeout(() => submitCandidate(next), 0);
      }
      return next;
    });
  }

  function handleBackspace() {
    if (errorMessage) onClearError();
    setDigits((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    if (errorMessage) onClearError();
    setDigits('');
  }

  useEffect(() => {
    if (!autoFocusKeyboard) return;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter' && digits.length === 4) {
        e.preventDefault();
        submitCandidate(digits);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="space-y-4">
      {/* 4-dot PIN indicator */}
      <div
        dir="ltr"
        role="status"
        aria-label={interpolate(t.pinLock.pinDigitsAria, { count: digits.length })}
        className="flex items-center justify-center gap-3.5 py-1"
      >
        {[0, 1, 2, 3].map((idx) => {
          const filled = idx < digits.length;
          return (
            <div
              key={idx}
              data-testid={`pin-dot-${idx}`}
              data-filled={filled ? 'true' : 'false'}
              className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-all duration-150 ${
                errorMessage
                  ? 'border-red-300 bg-red-50/70'
                  : filled
                    ? 'border-slate-900 bg-slate-900'
                    : 'border-slate-300 bg-slate-50'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full transition-transform duration-150 ${
                  filled ? 'bg-white scale-100' : 'bg-slate-300/70 scale-75'
                }`}
              />
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div
          role="alert"
          data-testid="pin-error-alert"
          className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-800 text-center"
        >
          {errorMessage}
        </div>
      )}

      {/* 0-9 Keypad */}
      <div
        dir="ltr"
        role="group"
        aria-label={t.pinLock.keypadAria}
        className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto"
      >
        {KEYPAD_ROWS.flat().map((digit) => (
          <button
            key={digit}
            type="button"
            data-testid={`pin-key-${digit}`}
            onClick={() => handleDigitPress(digit)}
            className="min-h-[48px] h-12 rounded-xl border border-slate-200 bg-white text-lg font-mono font-semibold tabular-nums text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          data-testid="pin-key-clear"
          onClick={handleClear}
          className="min-h-[48px] h-12 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.97] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          {t.pinLock.clear}
        </button>

        <button
          type="button"
          data-testid="pin-key-0"
          onClick={() => handleDigitPress('0')}
          className="min-h-[48px] h-12 rounded-xl border border-slate-200 bg-white text-lg font-mono font-semibold tabular-nums text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          0
        </button>

        <button
          type="button"
          data-testid="pin-key-backspace"
          aria-label={t.pinLock.backspace}
          onClick={handleBackspace}
          className="min-h-[48px] h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-[0.97] transition-all duration-150 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <Delete className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
