/** Sesi kasir di localStorage (kunci & perilaku sama dengan versi sebelumnya). */

export interface CashierSession {
  id?: number;
  name?: string;
  username?: string;
  role?: string;
}

export const CASHIER_LOGIN_URL = '/cashier';
export const CASHIER_HOME_URL = '/cashier/cashierPage';

/** Sesi kasir, atau sesi owner sebagai cadangan (seperti sebelumnya). */
export function readCashierSession(): CashierSession | null {
  try {
    const raw = localStorage.getItem('cashier_session') || localStorage.getItem('user_session');
    return raw ? (JSON.parse(raw) as CashierSession) : null;
  } catch {
    return null;
  }
}

export function hasCashierSession(): boolean {
  return Boolean(localStorage.getItem('cashier_session'));
}

export function saveCashierSession(user: unknown): void {
  localStorage.setItem('cashier_session', JSON.stringify(user));
}

export function clearCashierSession(): void {
  localStorage.removeItem('cashier_session');
}

export function getInitials(name: string | undefined, fallback = 'AK'): string {
  const initials = (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  return initials || fallback;
}
