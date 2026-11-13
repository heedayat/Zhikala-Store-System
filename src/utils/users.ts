import type { AppUser, UserRole } from '../types/inventory';
import { getTranslations, type AppLanguage } from './i18n';

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

export function isManagerRole(role: string | null | undefined): role is 'admin' | 'owner' {
  return role === 'admin' || role === 'owner';
}

export function isValidUserRole(role: string | null | undefined): role is UserRole {
  return role === 'admin' || role === 'owner' || role === 'cashier';
}

export function getUserRoleLabel(role: UserRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'owner') return 'Owner';
  return 'Cashier';
}

export function isAuthorizedUserRecord(
  user: Pick<AppUser, 'active' | 'role'> | null | undefined
): boolean {
  if (!user) return false;
  return user.active === true && isValidUserRole(user.role);
}

export function countActiveAdmins(users: Pick<AppUser, 'active' | 'role'>[]): number {
  return users.filter((u) => u.active && u.role === 'admin').length;
}

export function countActiveManagers(users: Pick<AppUser, 'active' | 'role'>[]): number {
  return users.filter((u) => u.active && isManagerRole(u.role)).length;
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
  existingUsers: Pick<AppUser, 'email'>[],
  lang: AppLanguage = 'en'
): NewUserValidationResult {
  const v = getTranslations(lang).validation;
  const errors: NewUserValidationErrors = {};
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const role = input.role;

  if (!email) {
    errors.email = v.emailRequired;
  } else if (!isValidEmailAddress(email)) {
    errors.email = v.emailInvalid;
  } else if (existingUsers.some((u) => normalizeEmail(u.email) === email)) {
    errors.email = v.emailDuplicate;
  }

  if (!displayName) {
    errors.displayName = v.userNameRequired;
  } else if (displayName.length > 80) {
    errors.displayName = v.userNameMax;
  }

  if (!isValidUserRole(role)) {
    errors.role = v.userRoleInvalid;
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
  allUsers: Pick<AppUser, 'email' | 'role' | 'active'>[],
  lang: AppLanguage = 'en'
): GuardResult {
  if (targetUser.role === nextRole) {
    return { allowed: true };
  }

  const v = getTranslations(lang).validation;
  const normalizedTarget = normalizeEmail(targetUser.email);
  const normalizedSelf = normalizeEmail(currentUserEmail);

  if (normalizedTarget === normalizedSelf) {
    if (nextRole === 'cashier') {
      return {
        allowed: false,
        reason: v.cannotDemoteSelfCashier,
      };
    }
    if (targetUser.role === 'admin' && nextRole !== 'admin') {
      return {
        allowed: false,
        reason: v.cannotRemoveOwnAdmin,
      };
    }
    if (targetUser.role === 'owner' && nextRole === 'admin') {
      return {
        allowed: false,
        reason: v.askAnotherAdmin,
      };
    }
  }

  if (
    targetUser.active &&
    isManagerRole(targetUser.role) &&
    nextRole === 'cashier' &&
    countActiveManagers(allUsers) <= 1
  ) {
    return {
      allowed: false,
      reason: v.lastActiveManagerRole,
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
      reason: v.lastActiveAdminRole,
    };
  }

  return { allowed: true };
}

export function canToggleUserActive(
  targetUser: Pick<AppUser, 'email' | 'role' | 'active'>,
  nextActive: boolean,
  currentUserEmail: string,
  allUsers: Pick<AppUser, 'email' | 'role' | 'active'>[],
  lang: AppLanguage = 'en'
): GuardResult {
  if (targetUser.active === nextActive) {
    return { allowed: true };
  }

  const v = getTranslations(lang).validation;

  if (!nextActive) {
    const normalizedTarget = normalizeEmail(targetUser.email);
    const normalizedSelf = normalizeEmail(currentUserEmail);

    if (normalizedTarget === normalizedSelf) {
      return {
        allowed: false,
        reason: v.cannotDeactivateSelf,
      };
    }

    if (
      isManagerRole(targetUser.role) &&
      targetUser.active &&
      countActiveManagers(allUsers) <= 1
    ) {
      return {
        allowed: false,
        reason: v.lastActiveManagerDeactivate,
      };
    }
  }

  return { allowed: true };
}
