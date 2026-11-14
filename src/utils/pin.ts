import type { AppUser } from '../types/inventory';

export const DEFAULT_SECURITY_PIN = '1234';
export const USER_PIN_CACHE_PREFIX = 'toybox_user_pin_v1_';

function normalizeEmailKey(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

export function normalizePinInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4);
}

export function isValidPin(raw: string | null | undefined): raw is string {
  if (typeof raw !== 'string') return false;
  return /^\d{4}$/.test(raw);
}

export function resolveUserPin(
  user: Pick<AppUser, 'pin'> | null | undefined,
  cachedPin?: string | null
): string {
  if (isValidPin(user?.pin)) {
    return user.pin;
  }
  if (isValidPin(cachedPin)) {
    return cachedPin;
  }
  return DEFAULT_SECURITY_PIN;
}

export function verifySecurityPin(
  enteredPin: string,
  user: Pick<AppUser, 'pin'> | null | undefined,
  cachedPin?: string | null
): boolean {
  if (!isValidPin(enteredPin)) return false;
  return enteredPin === resolveUserPin(user, cachedPin);
}

export function loadCachedUserPin(rawEmail: string): string | null {
  if (typeof window === 'undefined') return null;
  const email = normalizeEmailKey(rawEmail);
  if (!email) return null;
  try {
    const val = localStorage.getItem(`${USER_PIN_CACHE_PREFIX}${email}`);
    return isValidPin(val) ? val : null;
  } catch {
    return null;
  }
}

export function saveCachedUserPin(rawEmail: string, pin: string): void {
  if (typeof window === 'undefined') return;
  const email = normalizeEmailKey(rawEmail);
  if (!email || !isValidPin(pin)) return;
  try {
    localStorage.setItem(`${USER_PIN_CACHE_PREFIX}${email}`, pin);
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export function clearCachedUserPin(rawEmail: string): void {
  if (typeof window === 'undefined') return;
  const email = normalizeEmailKey(rawEmail);
  if (!email) return;
  try {
    localStorage.removeItem(`${USER_PIN_CACHE_PREFIX}${email}`);
  } catch {
    // Ignore storage failures
  }
}
