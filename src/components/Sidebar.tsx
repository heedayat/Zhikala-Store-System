import {
  ArrowLeftRight,
  BarChart3,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { NavSection, UserRole } from '../types/inventory';
import { isManagerRole } from '../utils/users';
import { LanguageToggle } from './LanguageToggle';
import { StoreLogo } from './StoreLogo';

interface SidebarProps {
  shopName: string;
  storeSubtitle?: string;
  logoUrl?: string;
  currency: string;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  userEmail: string;
  userRole: UserRole;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

export function Sidebar({
  shopName,
  storeSubtitle,
  logoUrl,
  currency,
  activeSection,
  onSelectSection,
  userEmail,
  userRole,
  onOpenSettings,
  onSignOut,
}: SidebarProps) {
  const { t, roleLabel, currencyUnit } = useTranslation();
  const isManager = isManagerRole(userRole);
  const displaySubtitle = storeSubtitle?.trim() || t.common.defaultSubtitle;

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
    <aside className="hidden md:flex w-64 shrink-0 bg-slate-50 border-e border-slate-200 flex-col justify-between min-h-screen select-none print-hidden">
      <div>
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <StoreLogo logoUrl={logoUrl} shopName={shopName} />
            <div className="min-w-0 text-start">
              <span className="block text-sm font-bold text-slate-950 tracking-tight truncate leading-tight">
                {shopName}
              </span>
              <span
                className="block text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5"
                title={displaySubtitle}
              >
                {displaySubtitle}
              </span>
            </div>
          </div>
          {isManager && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label={t.nav.storeSettings}
              title={t.nav.storeSettingsTooltip}
              className="w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 flex items-center justify-center transition-all duration-200 ease-out active:scale-[0.96] shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <nav aria-label={t.nav.mainNavigation} className="p-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full h-10 px-3 rounded-lg text-sm font-medium flex items-center gap-3 text-start transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'bg-white text-slate-950 border border-slate-200 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="px-1 text-start">
          <p
            dir="ltr"
            className="ltr-isolate text-xs font-medium text-slate-900 truncate text-start"
            title={userEmail}
          >
            {userEmail}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-medium text-slate-700">{roleLabel(userRole)}</span>
            <span aria-hidden="true"> · </span>
            <span dir="ltr" className="ltr-isolate font-mono text-slate-700">
              {currencyUnit(currency)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSignOut}
            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 hover:text-slate-950 transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
            <span>{t.nav.signOut}</span>
          </button>

          <LanguageToggle compact className="shrink-0" />
        </div>
      </div>
    </aside>
  );
}
