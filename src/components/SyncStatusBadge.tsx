import { useTranslation } from '../contexts/I18nContext';
import type { NetworkSyncStatus } from '../types/inventory';

interface SyncStatusBadgeProps {
  status: NetworkSyncStatus;
  hasPendingSync?: boolean;
  compact?: boolean;
  className?: string;
}

export function SyncStatusBadge({
  status,
  hasPendingSync = false,
  compact = false,
  className = '',
}: SyncStatusBadgeProps) {
  const { t } = useTranslation();

  let dotClass = 'bg-emerald-500';
  let chipClass = 'border-emerald-200/80 bg-emerald-50/70 text-emerald-800';
  let label = t.nav.statusOnline;

  if (status === 'offline') {
    if (hasPendingSync) {
      dotClass = 'bg-amber-500';
      chipClass = 'border-amber-200 bg-amber-50 text-amber-900';
      label = t.nav.statusOfflineSyncing;
    } else {
      dotClass = 'bg-red-500';
      chipClass = 'border-red-200 bg-red-50 text-red-800';
      label = t.nav.statusOffline;
    }
  } else if (status === 'syncing') {
    dotClass = 'bg-blue-600';
    chipClass = 'border-blue-200 bg-blue-50 text-blue-800';
    label = t.nav.statusSyncing;
  }

  return (
    <span
      data-testid="network-sync-badge"
      data-sync-status={status}
      data-pending-sync={hasPendingSync ? 'true' : 'false'}
      role="status"
      aria-live="polite"
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap shrink-0 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${chipClass} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
