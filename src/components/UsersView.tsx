import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { AppUser, UserRole } from '../types/inventory';
import { formatActionError, formatNumber } from '../utils/formatters';
import { getTranslations, interpolate, type AppLanguage } from '../utils/i18n';
import {
  canDeleteUser,
  canModifyUserRole,
  canToggleUserActive,
  countActiveManagers,
  isValidUserRole,
  normalizeEmail,
  validateNewUserForm,
  type NewUserValidationErrors,
} from '../utils/users';
import { ConfirmDialog } from './ConfirmDialog';

interface UsersViewProps {
  users: AppUser[];
  isLoading: boolean;
  loadError: string | null;
  currentUserEmail: string;
  onAddUser: (input: { email: string; displayName: string; role: UserRole }) => Promise<void>;
  onUpdateUser: (
    email: string,
    updates: Partial<Pick<AppUser, 'displayName' | 'role' | 'active'>>
  ) => Promise<void>;
  onDeleteUser: (email: string) => Promise<void>;
}

type PendingConfirmation =
  | {
      type: 'deactivate';
      user: AppUser;
    }
  | {
      type: 'demote';
      user: AppUser;
      nextRole: UserRole;
    }
  | {
      type: 'delete';
      user: AppUser;
    };

function formatUserDate(date: Date | null | undefined, lang: AppLanguage): string {
  if (!date) return '—';
  if (lang === 'ku') {
    const month = getTranslations('ku').monthsShort[
      date.getMonth() as keyof ReturnType<typeof getTranslations>['monthsShort']
    ];
    return `${date.getDate()} ${month} ${date.getFullYear()}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface AddUserModalProps {
  existingUsers: AppUser[];
  onAdd: (input: { email: string; displayName: string; role: UserRole }) => Promise<void>;
  onClose: () => void;
}

function AddUserModal({ existingUsers, onAdd, onClose }: AddUserModalProps) {
  const { lang, t } = useTranslation();
  const titleId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [errors, setErrors] = useState<NewUserValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    emailInputRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    const validation = validateNewUserForm({ email, displayName, role }, existingUsers, lang);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    setErrors({});
    try {
      await onAdd(validation.data);
      onClose();
    } catch (err) {
      setSubmitError(formatActionError(err, 'Failed to add user.'));
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="modal-backdrop-enter fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="modal-panel-enter bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden text-start">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-base font-bold text-slate-950">
            {t.users.addUserTitle}
          </h2>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label={t.users.closeAddModalAria}
            className="w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {submitError && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800"
            >
              {submitError}
            </div>
          )}

          <div>
            <label htmlFor="add-user-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.users.googleEmail} <span className="text-red-600">*</span>
            </label>
            <input
              ref={emailInputRef}
              id="add-user-email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="name@gmail.com"
              className={`ltr-isolate w-full h-10 px-3 rounded-lg border text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errors.email
                  ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
              }`}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">{t.users.emailHint}</p>
            )}
          </div>

          <div>
            <label htmlFor="add-user-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.users.displayName} <span className="text-red-600">*</span>
            </label>
            <input
              id="add-user-name"
              type="text"
              maxLength={80}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setErrors((prev) => ({ ...prev, displayName: undefined }));
              }}
              placeholder={t.users.displayNamePlaceholder}
              className={`w-full h-10 px-3 rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errors.displayName
                  ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
              }`}
            />
            {errors.displayName && (
              <p className="mt-1 text-xs text-red-600">{errors.displayName}</p>
            )}
          </div>

          <div>
            <label htmlFor="add-user-role" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.users.role}
            </label>
            <select
              id="add-user-role"
              value={role}
              onChange={(e) => {
                const next = e.target.value;
                setRole(isValidUserRole(next) ? next : 'cashier');
              }}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            >
              <option value="cashier">{t.roles.cashierOptionDesc}</option>
              <option value="owner">{t.roles.ownerOptionDesc}</option>
              <option value="admin">{t.roles.adminOptionDesc}</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98]"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[40px] px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap"
            >
              {isSaving ? t.users.adding : t.users.addUser}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UsersView({
  users,
  isLoading,
  loadError,
  currentUserEmail,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: UsersViewProps) {
  const { lang, t, roleLabel } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const normalizedSelf = normalizeEmail(currentUserEmail);
  const activeCount = useMemo(() => users.filter((u) => u.active).length, [users]);
  const inactiveCount = users.length - activeCount;
  const activeManagersCount = useMemo(() => countActiveManagers(users), [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === 'active' && !u.active) return false;
      if (statusFilter === 'inactive' && u.active) return false;
      if (q) {
        const hay = `${u.displayName} ${u.email} ${u.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, statusFilter]);

  async function applyUserUpdate(
    targetUser: AppUser,
    updates: Partial<Pick<AppUser, 'role' | 'active'>>,
    noticeText: string
  ) {
    setBusyEmail(targetUser.email);
    setActionError(null);
    setActionNotice(null);
    try {
      await onUpdateUser(targetUser.email, updates);
      setActionNotice(noticeText);
    } catch (err) {
      setActionError(formatActionError(err, 'Failed to update user access.'));
    } finally {
      setBusyEmail(null);
    }
  }

  function handleRoleSelectChange(targetUser: AppUser, nextRole: UserRole) {
    if (nextRole === targetUser.role) return;
    const guard = canModifyUserRole(targetUser, nextRole, currentUserEmail, users, lang);
    if (!guard.allowed) {
      setActionError(guard.reason ?? t.validation.userRoleInvalid);
      return;
    }

    const isDemotion =
      (targetUser.role === 'admin' && nextRole !== 'admin') ||
      (targetUser.role === 'owner' && nextRole === 'cashier');

    if (isDemotion) {
      setConfirmError(null);
      setPendingConfirm({ type: 'demote', user: targetUser, nextRole });
      return;
    }

    void applyUserUpdate(
      targetUser,
      { role: nextRole },
      interpolate(t.users.updatedRoleNotice, {
        name: targetUser.displayName || targetUser.email,
        role: roleLabel(nextRole),
      })
    );
  }

  function handleActiveToggleClick(targetUser: AppUser) {
    const nextActive = !targetUser.active;
    const guard = canToggleUserActive(targetUser, nextActive, currentUserEmail, users, lang);
    if (!guard.allowed) {
      setActionError(guard.reason ?? t.validation.onlyManagersUpdateUsers);
      return;
    }

    if (!nextActive) {
      setConfirmError(null);
      setPendingConfirm({ type: 'deactivate', user: targetUser });
      return;
    }

    void applyUserUpdate(
      targetUser,
      { active: true },
      interpolate(t.users.reactivatedNotice, {
        name: targetUser.displayName || targetUser.email,
      })
    );
  }

  function handleDeleteClick(targetUser: AppUser) {
    const guard = canDeleteUser(targetUser, currentUserEmail, users, lang);
    if (!guard.allowed) {
      setActionError(guard.reason ?? t.validation.onlyManagersDeleteUsers);
      return;
    }
    setConfirmError(null);
    setPendingConfirm({ type: 'delete', user: targetUser });
  }

  async function handleConfirmAction() {
    if (!pendingConfirm) return;
    setBusyEmail(pendingConfirm.user.email);
    setConfirmError(null);
    setActionError(null);
    setActionNotice(null);

    const targetDisplay = pendingConfirm.user.displayName || pendingConfirm.user.email;

    try {
      if (pendingConfirm.type === 'delete') {
        await onDeleteUser(pendingConfirm.user.email);
        setActionNotice(t.users.deletedNotice);
      } else if (pendingConfirm.type === 'deactivate') {
        await onUpdateUser(pendingConfirm.user.email, { active: false });
        setActionNotice(interpolate(t.users.deactivatedNotice, { name: targetDisplay }));
      } else {
        await onUpdateUser(pendingConfirm.user.email, { role: pendingConfirm.nextRole });
        setActionNotice(
          interpolate(t.users.updatedRoleNotice, {
            name: targetDisplay,
            role: roleLabel(pendingConfirm.nextRole),
          })
        );
      }
      setPendingConfirm(null);
    } catch (err) {
      setConfirmError(formatActionError(err, 'Failed to save user change.'));
    } finally {
      setBusyEmail(null);
    }
  }

  const filterTabs: { id: 'all' | 'active' | 'inactive'; label: string }[] = [
    { id: 'all', label: t.users.tabAll },
    { id: 'active', label: t.users.tabActive },
    { id: 'inactive', label: t.users.tabInactive },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white text-start">
      {/* Header */}
      <header className="min-h-16 px-4 md:px-6 py-3 md:py-0 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-baseline gap-3 md:gap-4 min-w-0 flex-wrap">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            {t.users.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums whitespace-nowrap">
            <span>
              <span dir="ltr" className="ltr-isolate font-mono">
                {formatNumber(activeCount)}
              </span>{' '}
              {t.users.activeLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <span dir="ltr" className="ltr-isolate font-mono">
                {formatNumber(activeManagersCount)}
              </span>{' '}
              {t.users.managersLabel}
            </span>
            {inactiveCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatNumber(inactiveCount)}
                  </span>{' '}
                  {t.users.inactiveLabel}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="min-h-[40px] px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {t.users.addUser}
        </button>
      </header>

      {/* Filter Toolbar */}
      <div className="px-4 md:px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.users.searchAria}
            placeholder={t.users.searchPlaceholder}
            className="w-full min-h-[40px] ps-9 pe-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          />
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start sm:self-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[32px] px-3 rounded-md text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback & Main List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
        {loadError && (
          <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            {t.users.loadError} {formatActionError(loadError, 'Unable to fetch user list.')}
          </div>
        )}

        {actionError && (
          <div role="alert" className="toast-enter p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-center justify-between gap-3">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label={t.users.dismissErrorAria}
              className="text-red-700 hover:text-red-950 font-semibold shrink-0"
            >
              {t.common.dismiss}
            </button>
          </div>
        )}

        {actionNotice && (
          <div
            role="status"
            className="toast-enter p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center justify-between gap-3"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              {actionNotice}
            </span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              aria-label={t.users.dismissNoticeAria}
              className="text-emerald-800 hover:text-emerald-950 font-semibold shrink-0"
            >
              {t.common.dismiss}
            </button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-200" aria-label={t.users.loadingAria}>
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-56 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-28 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {users.length === 0 ? t.users.emptyTitle : t.users.noMatchTitle}
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {users.length === 0 ? t.users.emptyHint : t.users.noMatchHint}
              </p>
              {users.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="mt-4 h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  {t.users.addFirstUser}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="mt-4 h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.users.resetFilters}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-start">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th scope="col" className="py-3 px-5">
                        {t.users.colUser}
                      </th>
                      <th scope="col" className="py-3 px-4 w-40">
                        {t.users.colRole}
                      </th>
                      <th scope="col" className="py-3 px-4 w-32">
                        {t.users.colStatus}
                      </th>
                      <th scope="col" className="py-3 px-4 w-36">
                        {t.users.colAdded}
                      </th>
                      <th scope="col" className="py-3 px-5 text-end w-60">
                        {t.users.colActions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredUsers.map((userRow) => {
                      const isSelf = normalizeEmail(userRow.email) === normalizedSelf;
                      const canOwnerGuard = canModifyUserRole(
                        userRow,
                        'owner',
                        currentUserEmail,
                        users,
                        lang
                      );
                      const canCashierGuard = canModifyUserRole(
                        userRow,
                        'cashier',
                        currentUserEmail,
                        users,
                        lang
                      );
                      const deactivateGuard = canToggleUserActive(
                        userRow,
                        false,
                        currentUserEmail,
                        users,
                        lang
                      );
                      const deleteGuard = canDeleteUser(userRow, currentUserEmail, users, lang);
                      const isRowBusy = busyEmail === userRow.email;
                      const disableRoleSelect =
                        isRowBusy ||
                        isSelf ||
                        (userRow.role === 'admin' && !canOwnerGuard.allowed && !canCashierGuard.allowed);
                      const roleLockReason = isSelf
                        ? t.users.cannotChangeOwnRole
                        : canOwnerGuard.reason ?? canCashierGuard.reason;
                      const disableDeactivate = userRow.active && (isRowBusy || !deactivateGuard.allowed);
                      const disableDelete = isRowBusy || !deleteGuard.allowed;
                      const displayLabel = userRow.displayName || userRow.email;

                      return (
                        <tr
                          key={userRow.email}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3.5 px-5 align-middle">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-950 truncate">
                                    {userRow.displayName || userRow.email}
                                  </p>
                                  {isSelf && (
                                    <span className="text-xs font-medium text-blue-700">
                                      {t.users.youBadge}
                                    </span>
                                  )}
                                </div>
                                <p
                                  dir="ltr"
                                  className="ltr-isolate text-xs font-mono text-slate-500 truncate mt-0.5 text-start"
                                >
                                  {userRow.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-middle">
                            <select
                              aria-label={interpolate(t.users.roleForAria, {
                                email: userRow.email,
                              })}
                              value={userRow.role}
                              disabled={disableRoleSelect}
                              title={disableRoleSelect && roleLockReason ? roleLockReason : undefined}
                              onChange={(e) => {
                                const next = e.target.value;
                                if (isValidUserRole(next)) {
                                  handleRoleSelectChange(userRow, next);
                                }
                              }}
                              className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:border-blue-600"
                            >
                              <option value="admin">{t.roles.admin}</option>
                              <option value="owner" disabled={!canOwnerGuard.allowed}>
                                {t.roles.owner}
                              </option>
                              <option value="cashier" disabled={!canCashierGuard.allowed}>
                                {t.roles.cashier}
                              </option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4 align-middle">
                            {userRow.active ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                {t.users.active}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                                {t.users.inactive}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-middle text-xs text-slate-500 tabular-nums">
                            <span dir="ltr" className="ltr-isolate">
                              {formatUserDate(userRow.createdAt, lang)}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 align-middle text-end">
                            <div className="inline-flex items-center justify-end gap-2">
                              {userRow.active ? (
                                <button
                                  key="deactivate"
                                  type="button"
                                  disabled={disableDeactivate}
                                  title={
                                    disableDeactivate && deactivateGuard.reason
                                      ? deactivateGuard.reason
                                      : t.users.revokeAccessTitle
                                  }
                                  onClick={() => handleActiveToggleClick(userRow)}
                                  className="h-8 px-3 rounded-lg border border-amber-200 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                                  {t.users.deactivate}
                                </button>
                              ) : (
                                <button
                                  key="reactivate"
                                  type="button"
                                  disabled={isRowBusy}
                                  onClick={() => handleActiveToggleClick(userRow)}
                                  className="h-8 px-3 rounded-lg border border-emerald-200 bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                  {t.users.reactivate}
                                </button>
                              )}

                              <button
                                type="button"
                                data-testid={`delete-user-${userRow.email}`}
                                disabled={disableDelete}
                                aria-label={interpolate(t.users.deleteAria, { name: displayLabel })}
                                title={
                                  disableDelete && deleteGuard.reason
                                    ? deleteGuard.reason
                                    : t.users.delete
                                }
                                onClick={() => handleDeleteClick(userRow)}
                                className="h-8 px-3 rounded-lg border border-red-200 bg-red-50/70 text-xs font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                {t.users.delete}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredUsers.map((userRow) => {
                  const isSelf = normalizeEmail(userRow.email) === normalizedSelf;
                  const canOwnerGuard = canModifyUserRole(
                    userRow,
                    'owner',
                    currentUserEmail,
                    users,
                    lang
                  );
                  const canCashierGuard = canModifyUserRole(
                    userRow,
                    'cashier',
                    currentUserEmail,
                    users,
                    lang
                  );
                  const deactivateGuard = canToggleUserActive(
                    userRow,
                    false,
                    currentUserEmail,
                    users,
                    lang
                  );
                  const deleteGuard = canDeleteUser(userRow, currentUserEmail, users, lang);
                  const isRowBusy = busyEmail === userRow.email;
                  const disableRoleSelect =
                    isRowBusy ||
                    isSelf ||
                    (userRow.role === 'admin' && !canOwnerGuard.allowed && !canCashierGuard.allowed);
                  const disableDeactivate = userRow.active && (isRowBusy || !deactivateGuard.allowed);
                  const disableDelete = isRowBusy || !deleteGuard.allowed;
                  const displayLabel = userRow.displayName || userRow.email;

                  return (
                    <div key={`mobile-${userRow.email}`} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950 truncate">
                              {userRow.displayName || userRow.email}
                            </p>
                            {isSelf && (
                              <span className="text-xs font-medium text-blue-700 shrink-0">
                                {t.users.youBadge}
                              </span>
                            )}
                          </div>
                          <p
                            dir="ltr"
                            className="ltr-isolate text-xs font-mono text-slate-500 truncate mt-0.5 text-start"
                          >
                            {userRow.email}
                          </p>
                        </div>

                        {userRow.active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            {t.users.active}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 shrink-0">
                            <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                            {t.users.inactive}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <select
                          aria-label={interpolate(t.users.mobileRoleForAria, {
                            email: userRow.email,
                          })}
                          value={userRow.role}
                          disabled={disableRoleSelect}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (isValidUserRole(next)) {
                              handleRoleSelectChange(userRow, next);
                            }
                          }}
                          className="flex-1 min-w-[115px] min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:border-blue-600"
                        >
                          <option value="admin">{t.roles.admin}</option>
                          <option value="owner" disabled={!canOwnerGuard.allowed}>
                            {t.roles.owner}
                          </option>
                          <option value="cashier" disabled={!canCashierGuard.allowed}>
                            {t.roles.cashier}
                          </option>
                        </select>

                        <div className="flex items-center gap-2 shrink-0">
                          {userRow.active ? (
                            <button
                              type="button"
                              disabled={disableDeactivate}
                              title={
                                disableDeactivate && deactivateGuard.reason
                                  ? deactivateGuard.reason
                                  : t.users.revokeAccessTitle
                              }
                              onClick={() => handleActiveToggleClick(userRow)}
                              className="min-h-[40px] px-3 rounded-lg border border-amber-200 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                            >
                              <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                              {t.users.deactivate}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isRowBusy}
                              onClick={() => handleActiveToggleClick(userRow)}
                              className="min-h-[40px] px-3 rounded-lg border border-emerald-200 bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                            >
                              <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              {t.users.reactivate}
                            </button>
                          )}

                          <button
                            type="button"
                            data-testid={`mobile-delete-user-${userRow.email}`}
                            disabled={disableDelete}
                            aria-label={interpolate(t.users.deleteAria, { name: displayLabel })}
                            title={
                              disableDelete && deleteGuard.reason
                                ? deleteGuard.reason
                                : t.users.delete
                            }
                            onClick={() => handleDeleteClick(userRow)}
                            className="min-h-[40px] px-3 rounded-lg border border-red-200 bg-red-50/70 text-xs font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            {t.users.delete}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-slate-500">{t.users.footerNote}</p>
      </div>

      {addModalOpen && (
        <AddUserModal
          existingUsers={users}
          onAdd={onAddUser}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={
          pendingConfirm?.type === 'delete'
            ? t.users.deleteTitle
            : pendingConfirm?.type === 'deactivate'
              ? t.users.deactivateTitle
              : interpolate(t.users.changeRoleTitle, {
                  role: pendingConfirm ? roleLabel(pendingConfirm.nextRole) : '',
                })
        }
        description={
          pendingConfirm?.type === 'delete'
            ? interpolate(t.users.deleteDesc, {
                name: pendingConfirm.user.displayName || pendingConfirm.user.email,
                email: pendingConfirm.user.email,
              })
            : pendingConfirm?.type === 'deactivate'
              ? interpolate(t.users.deactivateDesc, {
                  name: pendingConfirm.user.displayName || pendingConfirm.user.email,
                  email: pendingConfirm.user.email,
                })
              : pendingConfirm?.nextRole === 'cashier'
                ? interpolate(t.users.demoteCashierDesc, {
                    name: pendingConfirm.user.displayName || pendingConfirm.user.email,
                    email: pendingConfirm.user.email,
                  })
                : interpolate(t.users.demoteOwnerDesc, {
                    name: pendingConfirm?.user.displayName || pendingConfirm?.user.email || '',
                    email: pendingConfirm?.user.email || '',
                  })
        }
        confirmLabel={
          pendingConfirm?.type === 'delete'
            ? t.users.confirmDeleteBtn
            : pendingConfirm?.type === 'deactivate'
              ? t.users.deactivateConfirm
              : interpolate(t.users.changeRoleConfirm, {
                  role: pendingConfirm ? roleLabel(pendingConfirm.nextRole) : '',
                })
        }
        cancelLabel={t.common.cancel}
        tone={
          pendingConfirm?.type === 'delete' || pendingConfirm?.type === 'deactivate'
            ? 'danger'
            : 'warning'
        }
        isBusy={busyEmail !== null}
        errorMessage={confirmError}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setPendingConfirm(null);
          setConfirmError(null);
        }}
      />
    </div>
  );
}
