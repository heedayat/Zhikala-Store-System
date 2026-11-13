import { LogOut, PackageCheck, ShieldAlert } from 'lucide-react';

interface LoginScreenProps {
  shopName: string;
  isSigningIn: boolean;
  errorMessage: string | null;
  unauthorizedEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function LoginScreen({
  shopName,
  isSigningIn,
  errorMessage,
  unauthorizedEmail,
  onSignIn,
  onSignOut,
}: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <main className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950 tracking-tight">
              {shopName} Inventory
            </h1>
            <p className="text-xs text-slate-500">Counter Inventory &amp; Sales System</p>
          </div>
        </div>

        {unauthorizedEmail ? (
          <div className="space-y-4">
            <div
              role="alert"
              className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm flex items-start gap-3"
            >
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Access denied, contact the administrator</p>
                <p className="mt-1 text-red-800">
                  Signed in as <span className="font-mono text-xs">{unauthorizedEmail}</span>. Your
                  account is not active or does not have permission to access {shopName}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign out and switch Google account
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              Sign in with your Google account to manage toy products, print barcode labels, and
              sync counter stock levels.
            </p>

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
              className="w-full h-11 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
              {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
