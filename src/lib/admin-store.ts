export type AdminRole = 'main_admin' | 'admin';

export type AdminUser = {
  username: string;
  name: string;
  role: AdminRole;
  createdAt: string;
};

type StoredAdmin = AdminUser & {
  passwordHash: string;
};

const ADMINS_STORAGE_KEY = 'pehchaan_admins_v1';
const SESSION_STORAGE_KEY = 'pehchaan_admin_session_v1';

// Seed default main admin using secure env fallbacks
const DEFAULT_MAIN_ADMIN_USERNAME = (typeof process !== 'undefined' && process.env?.MAIN_ADMIN_USERNAME) || 'mainadmin';
const DEFAULT_MAIN_ADMIN_PASSWORD = (typeof process !== 'undefined' && process.env?.MAIN_ADMIN_PASSWORD) || 'admin123';

const DEFAULT_MAIN_ADMIN: StoredAdmin = {
  username: DEFAULT_MAIN_ADMIN_USERNAME,
  name: 'Chief Curator (Main Admin)',
  role: 'main_admin',
  passwordHash: DEFAULT_MAIN_ADMIN_PASSWORD,
  createdAt: new Date().toISOString(),
};

function readStoredAdmins(): StoredAdmin[] {
  if (typeof window === 'undefined') return [DEFAULT_MAIN_ADMIN];
  try {
    const raw = localStorage.getItem(ADMINS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify([DEFAULT_MAIN_ADMIN]));
      return [DEFAULT_MAIN_ADMIN];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify([DEFAULT_MAIN_ADMIN]));
      return [DEFAULT_MAIN_ADMIN];
    }
    // Ensure default main admin is present
    if (!parsed.some(a => a.username.toLowerCase() === DEFAULT_MAIN_ADMIN.username.toLowerCase())) {
      parsed.unshift(DEFAULT_MAIN_ADMIN);
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return [DEFAULT_MAIN_ADMIN];
  }
}

function writeStoredAdmins(admins: StoredAdmin[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(admins));
  } catch (err) {
    console.error('Failed to save admins:', err);
  }
}

export function getAdminSession(): { isAuthenticated: boolean; user: AdminUser | null } {
  if (typeof window === 'undefined') return { isAuthenticated: false, user: null };
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { isAuthenticated: false, user: null };
    const user = JSON.parse(raw) as AdminUser;
    return { isAuthenticated: !!user && !!user.username, user };
  } catch {
    return { isAuthenticated: false, user: null };
  }
}

export function loginAdmin(username: string, password: string): { success: boolean; user?: AdminUser; error?: string } {
  const admins = readStoredAdmins();
  const trimmedUser = username.trim().toLowerCase();
  const found = admins.find(a => a.username.toLowerCase() === trimmedUser);

  if (!found || found.passwordHash !== password) {
    return { success: false, error: 'Invalid username or password' };
  }

  const userSafe: AdminUser = {
    username: found.username,
    name: found.name,
    role: found.role,
    createdAt: found.createdAt,
  };

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userSafe));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userSafe));
  } catch {
    /* ignore storage errors */
  }

  return { success: true, user: userSafe };
}

export function logoutAdmin() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getAllAdmins(): AdminUser[] {
  const admins = readStoredAdmins();
  return admins.map(({ passwordHash: _hash, ...user }) => user);
}

export function addAdmin(
  currentUser: AdminUser,
  newAdmin: { username: string; name: string; password: string; role: AdminRole }
): { success: boolean; error?: string } {
  // STRICT RULE: Only Main Admin can add new admins
  if (currentUser.role !== 'main_admin') {
    return { success: false, error: 'Permission denied: Only Main Admin can add other administrators.' };
  }

  const trimmedUsername = newAdmin.username.trim().toLowerCase();
  if (!trimmedUsername || trimmedUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }
  if (!newAdmin.password || newAdmin.password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  const admins = readStoredAdmins();
  if (admins.some(a => a.username.toLowerCase() === trimmedUsername)) {
    return { success: false, error: 'An admin with this username already exists.' };
  }

  const newEntry: StoredAdmin = {
    username: trimmedUsername,
    name: newAdmin.name.trim() || trimmedUsername,
    role: newAdmin.role || 'admin',
    passwordHash: newAdmin.password,
    createdAt: new Date().toISOString(),
  };

  admins.push(newEntry);
  writeStoredAdmins(admins);
  return { success: true };
}

export function deleteAdmin(currentUser: AdminUser, usernameToDelete: string): { success: boolean; error?: string } {
  // STRICT RULE: Only Main Admin can remove admins
  if (currentUser.role !== 'main_admin') {
    return { success: false, error: 'Permission denied: Only Main Admin can delete administrators.' };
  }

  if (currentUser.username.toLowerCase() === usernameToDelete.toLowerCase()) {
    return { success: false, error: 'Cannot delete your own active Main Admin account.' };
  }

  const admins = readStoredAdmins();
  const updated = admins.filter(a => a.username.toLowerCase() !== usernameToDelete.toLowerCase());
  writeStoredAdmins(updated);
  return { success: true };
}

const LIVE_DAYS_STORAGE_KEY = 'pehchaan_live_days_v2';

// Live days management (default empty [] so all days are locked until 11th or unlocked by admin)
export function getLiveDays(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIVE_DAYS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(Number);
    }
    return [];
  } catch {
    return [];
  }
}

export function isDayLive(day: number): boolean {
  const live = getLiveDays();
  return live.includes(day);
}

export function toggleDayLive(day: number): number[] {
  const live = new Set(getLiveDays());
  if (live.has(day)) {
    live.delete(day);
  } else {
    live.add(day);
  }
  const result = Array.from(live).sort((a, b) => a - b);
  try {
    localStorage.setItem(LIVE_DAYS_STORAGE_KEY, JSON.stringify(result));
    window.dispatchEvent(new Event('pehchaan_live_days_changed'));
  } catch (err) {
    console.error('Failed to update live days:', err);
  }
  return result;
}

export function setDayLive(day: number, shouldBeLive: boolean): number[] {
  const live = new Set(getLiveDays());
  if (shouldBeLive) {
    live.add(day);
  } else {
    live.delete(day);
  }
  const result = Array.from(live).sort((a, b) => a - b);
  try {
    localStorage.setItem(LIVE_DAYS_STORAGE_KEY, JSON.stringify(result));
    window.dispatchEvent(new Event('pehchaan_live_days_changed'));
  } catch (err) {
    console.error('Failed to update live days:', err);
  }
  return result;
}
