import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import type { AppUser, UserRole } from '../types/inventory';
import { formatActionError, formatNumber } from '../utils/formatters';
import {
  canModifyUserRole,
  canToggleUserActive,
  countActiveAdmins,
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
    };

function formatUserDate(date: Date | null | undefined): string {
  if (!date) return '—';
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
  const titleId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
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

    const validation = validateNewUserForm({ email, displayName, role }, existingUsers);
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
      className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-6"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-base font-bold text-slate-950">
            Add User
          </h2>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label="Close add user modal"
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              Google email address <span className="text-red-600">*</span>
            </label>
            <input
              ref={emailInputRef}
              id="add-user-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="name@gmail.com"
              className={`w-full h-10 px-3 rounded-lg border text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errors.email
                  ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
              }`}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Stored lowercase as their Google Sign-In allowlist key.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="add-user-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Display name <span className="text-red-600">*</span>
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
              placeholder="e.g. Shakar"
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
              Role
            </label>
            <select
              id="add-user-role"
              value={role}
              onChange={(e) => setRole(e.target.value === 'admin' ? 'admin' : 'owner')}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            >
              <option value="owner">Owner — All shop features (Products, Sell, Stock, Reports)</option>
              <option value="admin">Admin — All shop features + Manage Users</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
            >
              {isSaving ? 'Adding...' : 'Add user'}
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
}: UsersViewProps) {
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
  const activeAdminCount = useMemo(() => countActiveAdmins(users), [users]);

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
    const guard = canModifyUserRole(targetUser, nextRole, currentUserEmail, users);
    if (!guard.allowed) {
      setActionError(guard.reason ?? 'Cannot change this user role.');
      return;
    }

    if (targetUser.role === 'admin' && nextRole === 'owner') {
      setConfirmError(null);
      setPendingConfirm({ type: 'demote', user: targetUser, nextRole });
      return;
    }

    void applyUserUpdate(
      targetUser,
      { role: nextRole },
      `${targetUser.displayName || targetUser.email} updated to ${nextRole}.`
    );
  }

  function handleActiveToggleClick(targetUser: AppUser) {
    const nextActive = !targetUser.active;
    const guard = canToggleUserActive(targetUser, nextActive, currentUserEmail, users);
    if (!guard.allowed) {
      setActionError(guard.reason ?? 'Cannot update user status.');
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
      `${targetUser.displayName || targetUser.email} reactivated.`
    );
  }

  async function handleConfirmAction() {
    if (!pendingConfirm) return;
    setBusyEmail(pendingConfirm.user.email);
    setConfirmError(null);
    setActionError(null);
    setActionNotice(null);

    try {
      if (pendingConfirm.type === 'deactivate') {
        await onUpdateUser(pendingConfirm.user.email, { active: false });
        setActionNotice(
          `${pendingConfirm.user.displayName || pendingConfirm.user.email} deactivated.`
        );
      } else {
        await onUpdateUser(pendingConfirm.user.email, { role: pendingConfirm.nextRole });
        setActionNotice(
          `${pendingConfirm.user.displayName || pendingConfirm.user.email} role changed to ${pendingConfirm.nextRole}.`
        );
      }
      setPendingConfirm(null);
    } catch (err) {
      setConfirmError(formatActionError(err, 'Failed to save user change.'));
    } finally {
      setBusyEmail(null);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Header */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between gap-6 shrink-0">
        <div className="flex items-baseline gap-4 min-w-0">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            Users
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums whitespace-nowrap">
            <span>{formatNumber(activeCount)} active</span>
            <span aria-hidden="true">·</span>
            <span>{formatNumber(activeAdminCount)} admin{activeAdminCount === 1 ? '' : 's'}</span>
            {inactiveCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatNumber(inactiveCount)} inactive</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add User
        </button>
      </header>

      {/* Filter Toolbar */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4 shrink-0">
        <div className="relative w-80">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users by name or email"
            placeholder="Search by name or email..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          />
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(['all', 'active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`h-7 px-3 rounded-md text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback & Main List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loadError && (
          <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            Could not load users: {formatActionError(loadError, 'Unable to fetch user list.')}
          </div>
        )}

        {actionError && (
          <div role="alert" className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-center justify-between gap-3">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label="Dismiss error"
              className="text-red-700 hover:text-red-950 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionNotice && (
          <div
            role="status"
            className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center justify-between gap-3"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              {actionNotice}
            </span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              aria-label="Dismiss notice"
              className="text-emerald-800 hover:text-emerald-950 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-200" aria-label="Loading users">
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
                {users.length === 0 ? 'No users configured yet' : 'No matching users'}
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {users.length === 0
                  ? 'Add an authorized Google account to grant access to the shop.'
                  : 'Try clearing the search query or switching the status filter.'}
              </p>
              {users.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="mt-4 h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Add first user
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
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="py-3 px-5">
                    User
                  </th>
                  <th scope="col" className="py-3 px-4 w-40">
                    Role
                  </th>
                  <th scope="col" className="py-3 px-4 w-32">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-4 w-36">
                    Added
                  </th>
                  <th scope="col" className="py-3 px-5 text-right w-40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredUsers.map((userRow) => {
                  const isSelf = normalizeEmail(userRow.email) === normalizedSelf;
                  const roleGuardOwner = canModifyUserRole(
                    userRow,
                    'owner',
                    currentUserEmail,
                    users
                  );
                  const deactivateGuard = canToggleUserActive(
                    userRow,
                    false,
                    currentUserEmail,
                    users
                  );
                  const isRowBusy = busyEmail === userRow.email;
                  const disableRoleSelect =
                    isRowBusy || (userRow.role === 'admin' && !roleGuardOwner.allowed);
                  const disableDeactivate = userRow.active && (isRowBusy || !deactivateGuard.allowed);

                  return (
                    <tr key={userRow.email} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-950 truncate">
                                {userRow.displayName || userRow.email}
                              </p>
                              {isSelf && (
                                <span className="text-xs font-medium text-blue-700">
                                  · You
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-slate-500 truncate mt-0.5">
                              {userRow.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        <select
                          aria-label={`Role for ${userRow.email}`}
                          value={userRow.role}
                          disabled={disableRoleSelect}
                          title={
                            disableRoleSelect && roleGuardOwner.reason
                              ? roleGuardOwner.reason
                              : undefined
                          }
                          onChange={(e) =>
                            handleRoleSelectChange(
                              userRow,
                              e.target.value === 'admin' ? 'admin' : 'owner'
                            )
                          }
                          className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:border-blue-600"
                        >
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        {userRow.active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-middle text-xs text-slate-500 tabular-nums">
                        {formatUserDate(userRow.createdAt)}
                      </td>

                      <td className="py-3.5 px-5 align-middle text-right">
                        {userRow.active ? (
                          <button
                            key="deactivate"
                            type="button"
                            disabled={disableDeactivate}
                            title={
                              disableDeactivate && deactivateGuard.reason
                                ? deactivateGuard.reason
                                : 'Revoke store access for this user'
                            }
                            onClick={() => handleActiveToggleClick(userRow)}
                            className="h-8 px-3 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-700 hover:bg-red-50 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            key="reactivate"
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => handleActiveToggleClick(userRow)}
                            className="h-8 px-3 rounded-lg border border-emerald-200 bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Both Admin and Owner roles can use Products, Sell, Stock, Reports, and Backup CSV exports.
          Only Admins can manage users. Self-demotion and deactivating the last active admin are blocked.
        </p>
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
          pendingConfirm?.type === 'deactivate'
            ? 'Deactivate user account?'
            : 'Change admin role to owner?'
        }
        description={
          pendingConfirm?.type === 'deactivate'
            ? `${pendingConfirm.user.displayName || pendingConfirm.user.email} (${pendingConfirm.user.email}) will immediately lose access to the store and see an access denied screen.`
            : `${pendingConfirm?.user.displayName || pendingConfirm?.user.email} (${pendingConfirm?.user.email}) will still be able to use all store features, but will no longer be able to open the Users page or manage accounts.`
        }
        confirmLabel={
          pendingConfirm?.type === 'deactivate' ? 'Deactivate user' : 'Change to Owner'
        }
        tone={pendingConfirm?.type === 'deactivate' ? 'danger' : 'warning'}
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
