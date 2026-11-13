import type { AppUser, UserRole } from '../types/inventory';

export const BOOTSTRAP_ADMIN_EMAIL = 'gamerhidayatgamer@gmail.com';
export const INITIAL_OWNER_EMAIL = 'shakarawat007@gmail.com';

export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

export function isBootstrapAdminEmail(rawEmail: string): boolean {
  return normalizeEmail(rawEmail) === BOOTSTRAP_ADMIN_EMAIL;
}

export function isValidEmailAddress(rawEmail: string): boolean {
  const email = normalizeEmail(rawEmail);
  if (email.length < 3 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isAuthorizedUserRecord(
  user: Pick<AppUser, 'active' | 'role'> | null | undefined
): boolean {
  if (!user) return false;
  return user.active === true && (user.role === 'admin' || user.role === 'owner');
}

export function countActiveAdmins(users: Pick<AppUser, 'active' | 'role'>[]): number {
  return users.filter((u) => u.active && u.role === 'admin').length;
}

export interface NewUserValidationErrors {
  email?: string;
  displayName?: string;
  role?: string;
}

export type NewUserValidationResult =
  | {
      valid: true;
      data: {
        email: string;
        displayName: string;
        role: UserRole;
      };
    }
  | {
      valid: false;
      errors: NewUserValidationErrors;
    };

export function validateNewUserForm(
  input: { email: string; displayName: string; role: string },
  existingUsers: Pick<AppUser, 'email'>[]
): NewUserValidationResult {
  const errors: NewUserValidationErrors = {};
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const role = input.role;

  if (!email) {
    errors.email = 'Google email address is required.';
  } else if (!isValidEmailAddress(email)) {
    errors.email = 'Enter a valid email address (for example, name@gmail.com).';
  } else if (existingUsers.some((u) => normalizeEmail(u.email) === email)) {
    errors.email = 'A user with this email address already exists.';
  }

  if (!displayName) {
    errors.displayName = 'Name is required.';
  } else if (displayName.length > 80) {
    errors.displayName = 'Name must be 80 characters or fewer.';
  }

  if (role !== 'admin' && role !== 'owner') {
    errors.role = 'Choose either admin or owner.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      email,
      displayName,
      role: role as UserRole,
    },
  };
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

export function canModifyUserRole(
  targetUser: Pick<AppUser, 'email' | 'role' | 'active'>,
  nextRole: UserRole,
  currentUserEmail: string,
  allUsers: Pick<AppUser, 'email' | 'role' | 'active'>[]
): GuardResult {
  if (targetUser.role === nextRole) {
    return { allowed: true };
  }

  const normalizedTarget = normalizeEmail(targetUser.email);
  const normalizedSelf = normalizeEmail(currentUserEmail);

  if (normalizedTarget === normalizedSelf && nextRole !== 'admin') {
    return {
      allowed: false,
      reason: 'You cannot remove your own admin access.',
    };
  }

  if (
    targetUser.role === 'admin' &&
    targetUser.active &&
    nextRole !== 'admin' &&
    countActiveAdmins(allUsers) <= 1
  ) {
    return {
      allowed: false,
      reason: 'At least one active admin must remain.',
    };
  }

  return { allowed: true };
}

export function canToggleUserActive(
  targetUser: Pick<AppUser, 'email' | 'role' | 'active'>,
  nextActive: boolean,
  currentUserEmail: string,
  allUsers: Pick<AppUser, 'email' | 'role' | 'active'>[]
): GuardResult {
  if (targetUser.active === nextActive) {
    return { allowed: true };
  }

  if (!nextActive) {
    const normalizedTarget = normalizeEmail(targetUser.email);
    const normalizedSelf = normalizeEmail(currentUserEmail);

    if (normalizedTarget === normalizedSelf) {
      return {
        allowed: false,
        reason: 'You cannot deactivate your own account.',
      };
    }

    if (
      targetUser.role === 'admin' &&
      targetUser.active &&
      countActiveAdmins(allUsers) <= 1
    ) {
      return {
        allowed: false,
        reason: 'Cannot deactivate the last active admin.',
      };
    }
  }

  return { allowed: true };
}
