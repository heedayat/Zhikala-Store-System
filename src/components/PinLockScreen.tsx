import { useState } from 'react';
import { Lock, LogOut } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { NetworkSyncStatus, UserRole } from '../types/inventory';
import { LanguageToggle } from './LanguageToggle';
import { PinKeypad } from './PinKeypad';
import { StoreLogo } from './StoreLogo';
import { SyncStatusBadge } from './SyncStatusBadge';

interface PinLockScreenProps {
  shopName: string;
  storeSubtitle?: string;
  logoUrl?: string;
  userDisplayName: string;
  userEmail: string;
  userRole: UserRole;
  syncStatus: NetworkSyncStatus;
  hasPendingSync: boolean;
  onVerifyPin: (enteredPin: string) => boolean;
  onSignOut: () => void;
  showSwitchAccount?: boolean;
}

export function PinLockScreen({
  shopName,
  storeSubtitle,
  logoUrl,
  userDisplayName,
  userEmail,
  userRole,
  syncStatus,
  hasPendingSync,
  onVerifyPin,
  onSignOut,
  showSwitchAccount = true,
}: PinLockScreenProps) {
  const { t, roleLabel } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const displaySubtitle = storeSubtitle?.trim() || t.common.defaultSubtitle;

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
      data-testid="pin-lock-screen"
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8"
    >
      <main className="modal-panel-enter w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <StoreLogo logoUrl={logoUrl} shopName={shopName} />
            <div className="min-w-0 text-start">
              <h1 className="text-lg font-bold text-slate-950 tracking-tight truncate">
                {shopName}
              </h1>
              <p dir="auto" className="text-xs text-slate-500 truncate">
                {displaySubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <SyncStatusBadge status={syncStatus} hasPendingSync={hasPendingSync} compact />
            <LanguageToggle compact />
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="min-w-0 text-start">
            <p className="text-[11px] font-medium text-slate-500">{t.pinLock.signedInAs}</p>
            <p className="text-sm font-semibold text-slate-950 truncate">
              {userDisplayName || userEmail}
            </p>
            <p
              dir="ltr"
              className="ltr-isolate text-xs font-mono text-slate-500 truncate text-start"
            >
              {userEmail}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
            {roleLabel(userRole)}
          </span>
        </div>

        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-2">
            <Lock className="w-4 h-4" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-slate-950">{t.pinLock.enterPinTitle}</h2>
          <p className="text-xs text-slate-500">{t.pinLock.enterPinSubtitle}</p>
        </div>

        <PinKeypad
          onVerifyPin={handleAttemptPin}
          errorMessage={error}
          onClearError={() => setError(null)}
        />

        <p className="text-[11px] text-slate-400 text-center">{t.pinLock.defaultPinHint}</p>

        {showSwitchAccount && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onSignOut}
              className="w-full min-h-[42px] px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all duration-150 active:scale-[0.98] inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
              <span>{t.pinLock.switchAccount}</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
