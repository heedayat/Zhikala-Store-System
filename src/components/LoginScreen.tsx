import { LogOut, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import { interpolate } from '../utils/i18n';
import { LanguageToggle } from './LanguageToggle';
import { StoreLogo } from './StoreLogo';

interface LoginScreenProps {
  shopName: string;
  storeSubtitle?: string;
  logoUrl?: string;
  isSigningIn: boolean;
  errorMessage: string | null;
  unauthorizedEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function LoginScreen({
  shopName,
  storeSubtitle,
  logoUrl,
  isSigningIn,
  errorMessage,
  unauthorizedEmail,
  onSignIn,
  onSignOut,
}: LoginScreenProps) {
  const { t } = useTranslation();
  const displaySubtitle = storeSubtitle?.trim() || t.common.defaultSubtitle;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
      <main className="modal-panel-enter w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <StoreLogo logoUrl={logoUrl} shopName={shopName} />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-950 tracking-tight truncate">
                {shopName}
              </h1>
              <p dir="auto" className="text-xs text-slate-500 truncate">
                {displaySubtitle}
              </p>
            </div>
          </div>

          <LanguageToggle compact className="shrink-0" />
        </div>

        {unauthorizedEmail ? (
          <div className="space-y-4">
            <div
              role="alert"
              className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm flex items-start gap-3"
            >
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">{t.auth.accessDeniedTitle}</p>
                <p className="text-red-800 break-words flex items-center gap-1.5 flex-wrap">
                  <span>{t.auth.accessDeniedSignedInAs}:</span>
                  <span
                    dir="ltr"
                    className="ltr-isolate font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100/80 text-red-950"
                  >
                    {unauthorizedEmail}
                  </span>
                </p>
                <p className="text-red-800 break-words">
                  {interpolate(t.auth.accessDeniedBody, { shopName })}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <LogOut className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
              <span>{t.auth.switchAccount}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed">{t.auth.signInPrompt}</p>

            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="w-full min-h-[44px] px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.2 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.8-.4-1.7-.4-2.7s.2-1.9.4-2.7L1.6 6.4C.6 8.2 0 10 0 12s.6 3.8 1.6 5.6l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 20.4 7.4 23 12 23z"
                />
              </svg>
              <span>{isSigningIn ? t.auth.signingIn : t.auth.signInWithGoogle}</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
