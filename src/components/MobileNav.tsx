import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  UserCircle2,
  Users,
} from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { NavSection, UserRole } from '../types/inventory';
import { isManagerRole } from '../utils/users';
import { LanguageToggle } from './LanguageToggle';
import { StoreLogo } from './StoreLogo';

interface MobileTopHeaderProps {
  shopName: string;
  logoUrl?: string;
  currency: string;
  userEmail: string;
  userRole: UserRole;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

export function MobileTopHeader({
  shopName,
  logoUrl,
  currency,
  userEmail,
  userRole,
  onOpenSettings,
  onSignOut,
}: MobileTopHeaderProps) {
  const { t, roleLabel, currencyUnit } = useTranslation();
  const isManager = isManagerRole(userRole);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="md:hidden sticky top-0 z-30 h-14 px-3 sm:px-4 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 print-hidden">
      <div className="flex items-center gap-2.5 min-w-0">
        <StoreLogo logoUrl={logoUrl} shopName={shopName} />
        <span className="text-sm font-bold text-slate-950 tracking-tight truncate">
          {shopName}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <LanguageToggle compact />

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t.nav.accountMenu}
            className="min-h-[40px] px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap"
          >
            <UserCircle2 className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>{roleLabel(userRole)}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                menuOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="modal-panel-enter absolute end-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 text-start">
                <p
                  dir="ltr"
                  className="ltr-isolate text-xs font-semibold text-slate-900 truncate text-start"
                  title={userEmail}
                >
                  {userEmail}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {roleLabel(userRole)} ·{' '}
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {currencyUnit(currency)}
                  </span>
                </p>
              </div>

              <div className="p-1.5 space-y-1">
                {isManager && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full min-h-[40px] px-3 rounded-lg text-start text-xs font-medium text-slate-800 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>{t.nav.storeSettingsAndBackup}</span>
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full min-h-[40px] px-3 rounded-lg text-start text-xs font-medium text-red-700 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-600 shrink-0 rtl:rotate-180" aria-hidden="true" />
                  <span>{t.nav.signOut}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface MobileBottomNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  userRole: UserRole;
}

export function MobileBottomNav({
  activeSection,
  onSelectSection,
  userRole,
}: MobileBottomNavProps) {
  const { t } = useTranslation();
  const isManager = isManagerRole(userRole);

  const navItems: {
    id: NavSection;
    label: string;
    icon: typeof Package;
    managerOnly?: boolean;
  }[] = [
    { id: 'products', label: t.nav.products, icon: Package },
    { id: 'sell', label: t.nav.sell, icon: ShoppingBag },
    { id: 'stock', label: t.nav.stock, icon: ArrowLeftRight, managerOnly: true },
    { id: 'reports', label: t.nav.reports, icon: BarChart3, managerOnly: true },
    { id: 'users', label: t.nav.users, icon: Users, managerOnly: true },
  ];

  const visibleItems = navItems.filter((item) => !item.managerOnly || isManager);

  return (
    <nav
      aria-label={t.nav.mobileNavigation}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 print-hidden"
    >
      <div
        className={`h-full grid ${
          visibleItems.length === 2 ? 'grid-cols-2' : 'grid-cols-5'
        } items-center gap-0.5`}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[44px] h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ease-out active:scale-[0.98] ${
                isActive
                  ? 'text-blue-700 bg-blue-50/70 font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-[11px] leading-tight truncate max-w-full px-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
