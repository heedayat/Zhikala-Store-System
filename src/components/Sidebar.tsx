import {
  ArrowLeftRight,
  BarChart3,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import type { NavSection, UserRole } from '../types/inventory';

interface SidebarProps {
  shopName: string;
  currency: string;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  userEmail: string;
  userRole: UserRole;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

const SHOP_NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: typeof Package;
  adminOnly?: boolean;
}[] = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'sell', label: 'Sell', icon: ShoppingBag },
  { id: 'stock', label: 'Stock', icon: ArrowLeftRight },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users, adminOnly: true },
];

export function Sidebar({
  shopName,
  currency,
  activeSection,
  onSelectSection,
  userEmail,
  userRole,
  onOpenSettings,
  onSignOut,
}: SidebarProps) {
  const visibleItems = SHOP_NAV_ITEMS.filter((item) => !item.adminOnly || userRole === 'admin');

  return (
    <aside className="w-64 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col justify-between min-h-screen select-none">
      <div>
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-sm font-bold text-slate-950 tracking-tight truncate leading-tight">
              {shopName}
            </span>
            <span className="block text-[11px] font-medium text-slate-500 leading-tight mt-0.5">
              Inventory
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Shop settings"
            title="Shop settings & CSV backups"
            className="w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 flex items-center justify-center transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="p-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full h-10 px-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
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
        <div className="px-1">
          <p className="text-xs font-medium text-slate-900 truncate" title={userEmail}>
            {userEmail}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="capitalize font-medium text-slate-700">{userRole}</span>
            <span aria-hidden="true"> · </span>
            <span className="font-mono text-slate-700">{currency}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 hover:text-slate-950 transition-colors flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
