export type LeaderboardEntry = {
  id: string;
  username: string;
  fullName?: string;
  course?: string;
  year?: string;
  batch?: string;
  rollNo?: string;
  email?: string;
  day: number;
  points: number;
  timeSeconds: number;
  firstTryCount: number;
  totalQuestions: number;
  submittedAt: string;
  clientIp?: string;
};

export type OverallLeaderboardEntry = {
  username: string;
  fullName?: string;
  course?: string;
  year?: string;
  batch?: string;
  rollNo?: string;
  email?: string;
  totalPoints: number;
  totalTimeSeconds: number;
  daysCompleted: number;
  firstTryTotal: number;
  bestDay: number;
  lastActive: string;
  clientIp?: string;
  dayBreakdown: {
    day: number;
    points: number;
    timeSeconds: number;
    firstTryCount: number;
    submittedAt: string;
  }[];
};

const LEADERBOARD_KEY = 'pehchaan_leaderboard_v1';
const USER_PROFILE_KEY = 'pehchaan_user_profile_v1';
const QUIZ_ATTEMPTS_PREFIX = 'pehchaan_attempt_day_';

export type UserProfile = {
  username: string;
  fullName: string;
  course: string;
  year: string;
  batch: string;
  rollNo: string;
  email?: string;
  editCount: number; // 0: initially saved, 1: first edit, 2: second edit (LOCKED)
  isLocked: boolean; // true if editCount >= 2
  savedAt?: string;
};

// Zero fake users - Leaderboard is clean for live participants
const INITIAL_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [];

export function getSavedUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      username: parsed.username || parsed.fullName || '',
      fullName: parsed.fullName || parsed.username || '',
      course: parsed.course || 'BCA',
      year: parsed.year || '1st Sem',
      batch: parsed.batch || '',
      rollNo: parsed.rollNo || '',
      email: parsed.email || '',
      editCount: typeof parsed.editCount === 'number' ? parsed.editCount : 0,
      isLocked: parsed.editCount >= 2,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: Partial<UserProfile>): { success: boolean; profile: UserProfile; error?: string } {
  if (typeof window === 'undefined') {
    return {
      success: false,
      profile: profile as UserProfile,
      error: 'Window not available',
    };
  }

  const existing = getSavedUserProfile();
  let editCount = existing ? existing.editCount : 0;

  // If already exists and user is modifying fields, check edit count limit
  if (existing && existing.rollNo) {
    const hasChanged =
      (profile.fullName && profile.fullName !== existing.fullName) ||
      (profile.course && profile.course !== existing.course) ||
      (profile.year && profile.year !== existing.year) ||
      (profile.batch && profile.batch !== existing.batch) ||
      (profile.rollNo && profile.rollNo !== existing.rollNo);

    if (hasChanged) {
      if (editCount >= 2) {
        return {
          success: false,
          profile: existing,
          error: 'Maximum 2 edits reached. Details are permanently locked.',
        };
      }
      editCount += 1;
    }
  }

  const updated: UserProfile = {
    username: (profile.fullName || profile.username || existing?.username || '').trim(),
    fullName: (profile.fullName || existing?.fullName || '').trim(),
    course: (profile.course || existing?.course || 'BCA').trim(),
    year: (profile.year || existing?.year || '1st Sem').trim(),
    batch: (profile.batch || existing?.batch || '').trim(),
    rollNo: (profile.rollNo || existing?.rollNo || '').trim().toUpperCase(),
    email: (profile.email || existing?.email || '').trim(),
    editCount,
    isLocked: editCount >= 2,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
    // Also sync to server database
    fetch('/api/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  } catch {}

  return { success: true, profile: updated };
}

// ---------------------------------------------------------------------------
// 🛡️ 1-ATTEMPT PER DAY VERIFICATION (Client + Server sync)
// ---------------------------------------------------------------------------

export function isQuizAttempted(day: number, rollNo?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cleanRoll = rollNo ? rollNo.trim().toUpperCase() : '';
    // Check specific roll number attempt key
    if (cleanRoll && localStorage.getItem(`${QUIZ_ATTEMPTS_PREFIX}${day}_${cleanRoll}`)) {
      return true;
    }
    // Check general device attempt key for this day
    if (localStorage.getItem(`${QUIZ_ATTEMPTS_PREFIX}${day}`)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function markQuizAttempted(day: number, rollNo?: string, scoreInfo?: any): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanRoll = rollNo ? rollNo.trim().toUpperCase() : '';
    const payload = JSON.stringify({
      attemptedAt: new Date().toISOString(),
      day,
      rollNo: cleanRoll,
      score: scoreInfo,
    });
    localStorage.setItem(`${QUIZ_ATTEMPTS_PREFIX}${day}`, payload);
    if (cleanRoll) {
      localStorage.setItem(`${QUIZ_ATTEMPTS_PREFIX}${day}_${cleanRoll}`, payload);
    }
  } catch {}
}

export async function checkServerAttempt(day: number, rollNo?: string): Promise<{ attempted: boolean; existingScore?: any }> {
  if (typeof window === 'undefined') return { attempted: false };
  try {
    const cleanRoll = rollNo ? encodeURIComponent(rollNo.trim().toUpperCase()) : '';
    const res = await fetch(`/api/check-attempt?day=${day}&rollNo=${cleanRoll}`);
    if (res.ok) {
      const data = await res.json();
      if (data.attempted) {
        markQuizAttempted(day, rollNo, data.existingScore);
      }
      return data;
    }
  } catch {}
  return { attempted: isQuizAttempted(day, rollNo) };
}

export function readLeaderboardFromStorage(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(e => !e.id?.startsWith('seed-'));
    }
    return [];
  } catch {
    return [];
  }
}

export function writeLeaderboardToStorage(entries: LeaderboardEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event('pehchaan_leaderboard_updated'));
  } catch (err) {
    console.error('Failed to save leaderboard:', err);
  }
}

export async function syncLeaderboardWithServer(): Promise<LeaderboardEntry[]> {
  if (typeof window === 'undefined') return readLeaderboardFromStorage();
  try {
    const res = await fetch('/api/scores');
    if (res.ok) {
      const serverEntries: LeaderboardEntry[] = await res.json();
      if (Array.isArray(serverEntries)) {
        const cleanServerEntries = serverEntries.filter(e => !e.id?.startsWith('seed-'));
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(cleanServerEntries));
        return cleanServerEntries;
      }
    }
  } catch (err) {
    console.debug('Server sync fallback to local cache:', err);
  }
  return readLeaderboardFromStorage();
}

export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
    if (b.firstTryCount !== a.firstTryCount) return b.firstTryCount - a.firstTryCount;
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });
}

export function getLeaderboardEntries(day?: number): LeaderboardEntry[] {
  const all = readLeaderboardFromStorage();
  const filtered = day ? all.filter(e => e.day === day) : all;
  return sortLeaderboard(filtered);
}

export function getOverallLeaderboard(): OverallLeaderboardEntry[] {
  const all = readLeaderboardFromStorage();
  const userMap = new Map<string, {
    username: string;
    fullName?: string;
    course?: string;
    year?: string;
    batch?: string;
    rollNo?: string;
    email?: string;
    dayScores: Map<number, LeaderboardEntry>;
    lastActive: string;
  }>();

  for (const entry of all) {
    const key = entry.username.trim().toLowerCase();
    if (!userMap.has(key)) {
      userMap.set(key, {
        username: entry.username.trim(),
        fullName: entry.fullName,
        course: entry.course,
        year: entry.year,
        batch: entry.batch,
        rollNo: entry.rollNo,
        email: entry.email,
        dayScores: new Map(),
        lastActive: entry.submittedAt,
      });
    }
    const userRec = userMap.get(key)!;
    if (entry.fullName && !userRec.fullName) userRec.fullName = entry.fullName;
    if (entry.course && !userRec.course) userRec.course = entry.course;
    if (entry.year && !userRec.year) userRec.year = entry.year;
    if (entry.batch && !userRec.batch) userRec.batch = entry.batch;
    if (entry.rollNo && !userRec.rollNo) userRec.rollNo = entry.rollNo;
    if (entry.email && !userRec.email) userRec.email = entry.email;

    const existingForDay = userRec.dayScores.get(entry.day);

    if (
      !existingForDay ||
      entry.points > existingForDay.points ||
      (entry.points === existingForDay.points && entry.timeSeconds < existingForDay.timeSeconds)
    ) {
      userRec.dayScores.set(entry.day, entry);
    }

    if (new Date(entry.submittedAt) > new Date(userRec.lastActive)) {
      userRec.lastActive = entry.submittedAt;
    }
  }

  const overallList: OverallLeaderboardEntry[] = [];

  for (const user of userMap.values()) {
    let totalPoints = 0;
    let totalTimeSeconds = 0;
    let firstTryTotal = 0;
    let bestDay = 1;
    let maxDayPoints = -1;
    const dayBreakdown: OverallLeaderboardEntry['dayBreakdown'] = [];

    for (const [day, score] of user.dayScores.entries()) {
      totalPoints += score.points;
      totalTimeSeconds += score.timeSeconds;
      firstTryTotal += score.firstTryCount;
      if (score.points > maxDayPoints) {
        maxDayPoints = score.points;
        bestDay = day;
      }
      dayBreakdown.push({
        day,
        points: score.points,
        timeSeconds: score.timeSeconds,
        firstTryCount: score.firstTryCount,
        submittedAt: score.submittedAt,
      });
    }

    dayBreakdown.sort((a, b) => a.day - b.day);

    overallList.push({
      username: user.username,
      fullName: user.fullName || user.username,
      course: user.course || 'Not specified',
      year: user.year || 'Not specified',
      batch: user.batch || 'Not specified',
      rollNo: user.rollNo || '-',
      email: user.email || '-',
      totalPoints,
      totalTimeSeconds: Number(totalTimeSeconds.toFixed(1)),
      daysCompleted: user.dayScores.size,
      firstTryTotal,
      bestDay,
      lastActive: user.lastActive,
      dayBreakdown,
    });
  }

  return overallList.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (a.totalTimeSeconds !== b.totalTimeSeconds) return a.totalTimeSeconds - b.totalTimeSeconds;
    if (b.daysCompleted !== a.daysCompleted) return b.daysCompleted - a.daysCompleted;
    return new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
  });
}

export function submitLeaderboardScore(params: {
  username: string;
  fullName?: string;
  course?: string;
  year?: string;
  batch?: string;
  rollNo?: string;
  email?: string;
  day: number;
  points: number;
  timeSeconds: number;
  firstTryCount: number;
  totalQuestions: number;
}): { success: boolean; entry: LeaderboardEntry; rank: number } {
  const all = readLeaderboardFromStorage();
  const cleanUsername = params.username.trim() || 'Anonymous Explorer';

  const newEntry: LeaderboardEntry = {
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username: cleanUsername,
    fullName: params.fullName?.trim() || cleanUsername,
    course: params.course?.trim() || '',
    year: params.year?.trim() || '',
    batch: params.batch?.trim() || '',
    rollNo: params.rollNo?.trim() || '',
    email: params.email?.trim() || '',
    day: params.day,
    points: params.points,
    timeSeconds: Number(params.timeSeconds.toFixed(1)),
    firstTryCount: params.firstTryCount,
    totalQuestions: params.totalQuestions,
    submittedAt: new Date().toISOString(),
  };

  const updated = [...all, newEntry];
  writeLeaderboardToStorage(updated);

  const dayLeaderboard = sortLeaderboard(updated.filter(e => e.day === params.day));
  const rank = dayLeaderboard.findIndex(e => e.id === newEntry.id) + 1;
  const finalRank = rank > 0 ? rank : 1;

  markQuizAttempted(params.day, params.rollNo, {
    points: params.points,
    timeSeconds: Number(params.timeSeconds.toFixed(1)),
    rank: finalRank,
  });

  if (typeof window !== 'undefined') {
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    }).catch(() => {});
  }

  return {
    success: true,
    entry: newEntry,
    rank: finalRank,
  };
}
