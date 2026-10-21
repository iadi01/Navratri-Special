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

const ADMINS_STORAGE_KEY = 'pehchaan_admins_v2';
const SESSION_STORAGE_KEY = 'pehchaan_admin_session_v2';
const LIVE_DAYS_STORAGE_KEY = 'pehchaan_live_days_v2';

// Default fallback main admin credentials
const DEFAULT_MAIN_ADMIN_USERNAME = 'kuchupuchu';
const DEFAULT_MAIN_ADMIN_PASSWORD = 'mybestfriendnilay420';

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

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const cleanUser = (username || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Please enter both username and password.' };
  }

  // 1. Instant verification for Chief Curator (Main Admin) - Works 100% reliably on all devices
  if (
    cleanUser.toLowerCase() === DEFAULT_MAIN_ADMIN_USERNAME.toLowerCase() &&
    cleanPass === DEFAULT_MAIN_ADMIN_PASSWORD
  ) {
    const mainAdmin: AdminUser = {
      username: DEFAULT_MAIN_ADMIN_USERNAME,
      name: 'Chief Curator (Main Admin)',
      role: 'main_admin',
      createdAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mainAdmin));
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mainAdmin));
    } catch {
      /* ignore */
    }

    // Ping server API in background to ensure sync with MongoDB
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
    }).catch(() => {});

    return { success: true, user: mainAdmin };
  }

  // 2. Authenticate via Server API (MongoDB Atlas) for all admins / sub-admins
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success && data?.user) {
      const userSafe: AdminUser = data.user;
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userSafe));
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userSafe));
      } catch {
        /* ignore storage write errors */
      }
      return { success: true, user: userSafe };
    }

    if (data && data.error && !res.ok) {
      return { success: false, error: data.error };
    }
  } catch (netErr) {
    console.warn('Network issue reaching /api/admin/login, attempting local fallback:', netErr);
  }

  // 2. Offline fallback (or direct check against default/local admin)
  const admins = readStoredAdmins();
  const found = admins.find(a => a.username.toLowerCase() === cleanUser.toLowerCase());

  if (
    found &&
    (found.passwordHash === cleanPass ||
      (cleanUser.toLowerCase() === DEFAULT_MAIN_ADMIN_USERNAME.toLowerCase() && cleanPass === DEFAULT_MAIN_ADMIN_PASSWORD))
  ) {
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
      /* ignore */
    }

    return { success: true, user: userSafe };
  }

  return { success: false, error: 'Invalid username or password' };
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

export async function syncAdminsFromServer(): Promise<AdminUser[]> {
  if (typeof window === 'undefined') return getAllAdmins();
  try {
    const res = await fetch('/api/admin/list');
    if (res.ok) {
      const serverAdmins = await res.json();
      if (Array.isArray(serverAdmins) && serverAdmins.length > 0) {
        const existing = readStoredAdmins();
        const merged: StoredAdmin[] = serverAdmins.map((sa: AdminUser) => {
          const found = existing.find(e => e.username.toLowerCase() === sa.username.toLowerCase());
          return {
            username: sa.username,
            name: sa.name,
            role: sa.role,
            createdAt: sa.createdAt,
            passwordHash: found?.passwordHash || '',
          };
        });
        writeStoredAdmins(merged);
        return serverAdmins;
      }
    }
  } catch (err) {
    console.warn('Failed to sync admins from server:', err);
  }
  return getAllAdmins();
}

export async function addAdmin(
  currentUser: AdminUser,
  newAdmin: { username: string; name: string; password: string; role: AdminRole }
): Promise<{ success: boolean; error?: string }> {
  // STRICT RULE: Only Main Admin can add new admins
  if (currentUser.role !== 'main_admin') {
    return { success: false, error: 'Permission denied: Only Main Admin can add other administrators.' };
  }

  const trimmedUsername = newAdmin.username.trim().toLowerCase();
  const trimmedPassword = newAdmin.password.trim();

  if (!trimmedUsername || trimmedUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }
  if (!trimmedPassword || trimmedPassword.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  // 1. Save to MongoDB Atlas via server API
  try {
    const res = await fetch('/api/admin/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: trimmedUsername,
        name: newAdmin.name.trim() || trimmedUsername,
        password: trimmedPassword,
        role: newAdmin.role || 'admin',
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || (data && !data.success)) {
      return { success: false, error: data?.error || 'Failed to save admin on server' };
    }
  } catch (err: any) {
    console.warn('Could not reach server to save admin, caching locally:', err?.message);
  }

  // 2. Cache in local storage
  const admins = readStoredAdmins();
  const existingIdx = admins.findIndex(a => a.username.toLowerCase() === trimmedUsername);
  if (existingIdx >= 0) {
    admins[existingIdx] = {
      ...admins[existingIdx],
      name: newAdmin.name.trim() || trimmedUsername,
      role: newAdmin.role || 'admin',
      passwordHash: trimmedPassword,
    };
  } else {
    admins.push({
      username: trimmedUsername,
      name: newAdmin.name.trim() || trimmedUsername,
      role: newAdmin.role || 'admin',
      passwordHash: trimmedPassword,
      createdAt: new Date().toISOString(),
    });
  }
  writeStoredAdmins(admins);

  return { success: true };
}

export async function deleteAdmin(currentUser: AdminUser, usernameToDelete: string): Promise<{ success: boolean; error?: string }> {
  // STRICT RULE: Only Main Admin can remove admins
  if (currentUser.role !== 'main_admin') {
    return { success: false, error: 'Permission denied: Only Main Admin can delete administrators.' };
  }

  if (currentUser.username.toLowerCase() === usernameToDelete.toLowerCase()) {
    return { success: false, error: 'Cannot delete your own active Main Admin account.' };
  }

  // 1. Delete from MongoDB Atlas via server API
  try {
    await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: usernameToDelete.trim().toLowerCase() }),
    });
  } catch (err: any) {
    console.warn('Failed to delete admin on server:', err?.message);
  }

  // 2. Remove from local storage
  const admins = readStoredAdmins();
  const updated = admins.filter(a => a.username.toLowerCase() !== usernameToDelete.toLowerCase());
  writeStoredAdmins(updated);
  return { success: true };
}

// Live days management
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

export async function syncLiveDaysWithServer(): Promise<number[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/admin/live-days');
    if (res.ok) {
      const days = await res.json();
      if (Array.isArray(days)) {
        const sorted = days.map(Number).sort((a, b) => a - b);
        localStorage.setItem(LIVE_DAYS_STORAGE_KEY, JSON.stringify(sorted));
        window.dispatchEvent(new Event('pehchaan_live_days_changed'));
        return sorted;
      }
    }
  } catch (err) {
    /* offline fallback */
  }
  return getLiveDays();
}

export function isDayLive(day: number): boolean {
  const live = getLiveDays();
  return live.includes(day);
}

export async function toggleDayLive(day: number): Promise<number[]> {
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
    // Persist globally to MongoDB
    fetch('/api/admin/live-days', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ days: result }),
    }).catch(err => console.warn('Could not sync live days to server:', err));
  } catch (err) {
    console.error('Failed to update live days:', err);
  }
  return result;
}

export async function setDayLive(day: number, shouldBeLive: boolean): Promise<number[]> {
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
    fetch('/api/admin/live-days', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ days: result }),
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to update live days:', err);
  }
  return result;
}

export async function setAllDaysLive(days: number[]): Promise<number[]> {
  const result = Array.from(new Set(days)).sort((a, b) => a - b);
  try {
    localStorage.setItem(LIVE_DAYS_STORAGE_KEY, JSON.stringify(result));
    window.dispatchEvent(new Event('pehchaan_live_days_changed'));
    fetch('/api/admin/live-days', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ days: result }),
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to update live days:', err);
  }
  return result;
}

// =========================================================================
// 🔒 LEADERBOARD VISIBILITY & SUSPENSE STORE
// =========================================================================

export type LeaderboardConfig = {
  leaderboardEnabled?: boolean;
  hideFromDay: number;
  suspenseEnabled: boolean;
  announcementMessage?: string;
  offlineMessage?: string;
  updatedAt?: string;
};

const LEADERBOARD_CONFIG_KEY = 'pehchaan_leaderboard_config_v1';

export const DEFAULT_LEADERBOARD_CONFIG: LeaderboardConfig = {
  leaderboardEnabled: true,
  hideFromDay: 8,
  suspenseEnabled: true,
  announcementMessage: 'The celebration is not over yet. Stay tuned for the final reveal!',
  offlineMessage: 'The leaderboard is currently paused by the event administration. All participant scores and attempts are safely recorded in our database.',
};

export function getLeaderboardConfig(): LeaderboardConfig {
  if (typeof window === 'undefined') return DEFAULT_LEADERBOARD_CONFIG;
  try {
    const raw = localStorage.getItem(LEADERBOARD_CONFIG_KEY);
    if (!raw) return DEFAULT_LEADERBOARD_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      leaderboardEnabled: parsed.leaderboardEnabled !== false,
      hideFromDay: typeof parsed.hideFromDay === 'number' ? parsed.hideFromDay : 8,
      suspenseEnabled: parsed.suspenseEnabled !== false,
      announcementMessage: parsed.announcementMessage || DEFAULT_LEADERBOARD_CONFIG.announcementMessage,
      offlineMessage: parsed.offlineMessage || DEFAULT_LEADERBOARD_CONFIG.offlineMessage,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return DEFAULT_LEADERBOARD_CONFIG;
  }
}

export async function syncLeaderboardConfigWithServer(): Promise<LeaderboardConfig> {
  if (typeof window === 'undefined') return getLeaderboardConfig();
  try {
    const res = await fetch('/api/leaderboard/config');
    if (res.ok) {
      const cfg: LeaderboardConfig = await res.json();
      if (cfg && typeof cfg.hideFromDay === 'number') {
        localStorage.setItem(LEADERBOARD_CONFIG_KEY, JSON.stringify(cfg));
        window.dispatchEvent(new Event('pehchaan_leaderboard_config_changed'));
        return cfg;
      }
    }
  } catch (err) {
    /* fallback to local cache */
  }
  return getLeaderboardConfig();
}

export async function updateLeaderboardConfig(
  newConfig: Partial<LeaderboardConfig>
): Promise<LeaderboardConfig> {
  const current = getLeaderboardConfig();
  const merged: LeaderboardConfig = {
    ...current,
    ...newConfig,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LEADERBOARD_CONFIG_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('pehchaan_leaderboard_config_changed'));
    fetch('/api/leaderboard/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(merged),
    }).catch(err => console.warn('Failed to sync leaderboard config to server:', err));
  } catch (err) {
    console.error('Failed to save leaderboard config:', err);
  }

  return merged;
}

