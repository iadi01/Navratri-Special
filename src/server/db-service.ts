import { connectToDatabase, type DbStatus } from '@/lib/mongodb';
import type { LeaderboardEntry, UserProfile } from '@/lib/leaderboard-store';

export async function saveScoreToMongo(
  entry: LeaderboardEntry,
  clientIp?: string
): Promise<{ success: boolean; error?: string; rank?: number }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: status.message };
    }

    const leaderboardCol = db.collection('leaderboard');
    const cleanDay = Number(entry.day);
    const cleanRollNo = (entry.rollNo || '').trim().toUpperCase();
    const cleanUsername = (entry.username || '').trim();
    const cleanFullName = (entry.fullName || entry.username || '').trim();

    // 🛡️ STRICT 1-ATTEMPT SECURITY CHECK:
    // Check if this participant already submitted ANY attempt for this day (by rollNo, username, or fullName)
    const checkConditions: any[] = [];
    if (cleanRollNo) {
      checkConditions.push({ rollNo: cleanRollNo });
    }
    if (cleanUsername) {
      const escUser = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      checkConditions.push({ username: { $regex: new RegExp(`^${escUser}$`, 'i') } });
    }
    if (cleanFullName) {
      const escFull = cleanFullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      checkConditions.push({ fullName: { $regex: new RegExp(`^${escFull}$`, 'i') } });
    }

    if (checkConditions.length > 0) {
      const existing = await leaderboardCol.findOne({
        day: cleanDay,
        $or: checkConditions,
      });

      if (existing) {
        return {
          success: false,
          error: `Day ${cleanDay} has already been completed by ${cleanFullName || cleanUsername}. Only 1 attempt per day is allowed to maintain fair leaderboard integrity.`,
        };
      }
    }

    // 1. Save new first-attempt score entry in leaderboard collection
    const entryId = entry.id || `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();
    const maxDayQuestions = cleanDay === 10 ? 10 : 3;
    const maxDayPoints = maxDayQuestions * 10;
    await leaderboardCol.insertOne({
      id: entryId,
      username: cleanUsername,
      fullName: cleanFullName,
      course: entry.course?.trim() || '',
      year: entry.year?.trim() || '',
      batch: entry.batch?.trim() || '',
      rollNo: cleanRollNo,
      email: entry.email?.trim() || '',
      day: cleanDay,
      points: Math.min(Number(entry.points), maxDayPoints),
      timeSeconds: Number(entry.timeSeconds),
      firstTryCount: Math.min(Number(entry.firstTryCount || 0), maxDayQuestions),
      totalQuestions: Number(entry.totalQuestions || maxDayQuestions),
      clientIp: clientIp || entry.clientIp || '',
      submittedAt: entry.submittedAt || now.toISOString(),
      createdAt: now,
      answers: Array.isArray(entry.answers) ? entry.answers : [],
    });

    // 2. Save / Upsert user profile into users collection
    const usersCol = db.collection('users');
    await usersCol.updateOne(
      { username: cleanUsername.toLowerCase() },
      {
        $set: {
          username: cleanUsername,
          fullName: cleanFullName,
          course: entry.course?.trim() || '',
          year: entry.year?.trim() || '',
          batch: entry.batch?.trim() || '',
          rollNo: cleanRollNo,
          email: entry.email?.trim() || '',
          lastIp: clientIp || '',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          editCount: 0,
        },
      },
      { upsert: true }
    );

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save score to MongoDB:', err?.message);
    return { success: false, error: err?.message };
  }
}

export async function checkAttemptInMongo(
  day: number,
  identifier?: string,
  rollNo?: string,
  clientIp?: string
): Promise<{ attempted: boolean; reason?: string; existingScore?: any }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { attempted: false };
    }

    const leaderboardCol = db.collection('leaderboard');
    const cleanDay = Number(day);
    const cleanId = (identifier || '').trim();
    const cleanRoll = (rollNo || '').trim().toUpperCase();

    const checkConditions: any[] = [];
    if (cleanRoll) {
      checkConditions.push({ rollNo: cleanRoll });
    }
    if (cleanId) {
      const escaped = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      checkConditions.push({ username: { $regex: new RegExp(`^${escaped}$`, 'i') } });
      checkConditions.push({ fullName: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    }

    if (checkConditions.length > 0) {
      const byUser = await leaderboardCol.findOne(
        {
          day: cleanDay,
          $or: checkConditions,
        },
        { sort: { createdAt: 1, submittedAt: 1, _id: 1 } }
      );

      if (byUser) {
        return {
          attempted: true,
          reason: `Participant "${byUser.fullName || byUser.username || cleanId}" has already completed Day ${cleanDay} quiz.`,
          existingScore: {
            points: byUser.points,
            timeSeconds: byUser.timeSeconds,
            submittedAt: byUser.submittedAt,
            firstTryCount: byUser.firstTryCount || 0,
            course: byUser.course || '',
            year: byUser.year || '',
            batch: byUser.batch || '',
            rollNo: byUser.rollNo || '',
          },
        };
      }
    }

    return { attempted: false };
  } catch (err: any) {
    console.error('Error checking attempt in MongoDB:', err?.message);
    return { attempted: false };
  }
}

export async function saveUserProfileToMongo(
  profile: UserProfile,
  clientIp?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: status.message };
    }

    const usersCol = db.collection('users');
    const cleanRollNo = (profile.rollNo || '').trim().toUpperCase();
    const cleanName = (profile.fullName || profile.username || '').trim();
    const escUser = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Lookup user by rollNo if provided, or by case-insensitive name
    const filter = cleanRollNo
      ? { rollNo: cleanRollNo }
      : {
          $or: [
            { username: { $regex: new RegExp(`^${escUser}$`, 'i') } },
            { fullName: { $regex: new RegExp(`^${escUser}$`, 'i') } },
          ],
        };
    const existing = await usersCol.findOne(filter);

    let editCount = profile.editCount || 0;
    if (existing) {
      const serverEditCount = typeof existing.editCount === 'number' ? existing.editCount : 0;
      const hasChanged =
        (profile.fullName && existing.fullName && profile.fullName.trim().toLowerCase() !== existing.fullName.trim().toLowerCase()) ||
        (profile.course && existing.course && profile.course.trim().toLowerCase() !== existing.course.trim().toLowerCase()) ||
        (profile.year && existing.year && profile.year.trim().toLowerCase() !== existing.year.trim().toLowerCase());

      if (hasChanged) {
        if (serverEditCount >= 2) {
          return { success: false, error: 'Maximum 2 edits reached. Details are permanently locked.' };
        }
        editCount = serverEditCount + 1;
      } else {
        editCount = serverEditCount;
      }
    }

    await usersCol.updateOne(
      filter,
      {
        $set: {
          username: cleanName,
          fullName: cleanName,
          course: profile.course?.trim() || '',
          year: profile.year?.trim() || '',
          batch: profile.batch?.trim() || '',
          rollNo: cleanRollNo || (existing?.rollNo || ''),
          email: profile.email?.trim() || (existing?.email || ''),
          editCount,
          lastIp: clientIp || '',
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save user profile to MongoDB:', err?.message);
    return { success: false, error: err?.message };
  }
}

export async function checkUsernameConflictInMongo(params: {
  username: string;
  course?: string;
  batch?: string;
  year?: string;
  rollNo?: string;
  clientIp?: string;
}): Promise<{
  conflict: boolean;
  isExistingUser?: boolean;
  message?: string;
  existingProfile?: any;
}> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { conflict: false };
    }

    const cleanUsername = (params.username || '').trim();
    if (!cleanUsername) return { conflict: false };

    const cleanCourse = (params.course || '').trim();
    const cleanBatch = (params.batch || '').trim();
    const cleanYear = (params.year || '').trim();
    const cleanRollNo = (params.rollNo || '').trim().toUpperCase();

    const escUser = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`^${escUser}$`, 'i');

    const leaderboardCol = db.collection('leaderboard');
    const usersCol = db.collection('users');

    const matchConditions: any = {
      $or: [{ username: nameRegex }, { fullName: nameRegex }],
    };

    if (cleanCourse) {
      const escCourse = cleanCourse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchConditions.course = { $regex: new RegExp(`^${escCourse}$`, 'i') };
    }

    const [existingLeaderboard, existingUsers] = await Promise.all([
      leaderboardCol.find(matchConditions).toArray(),
      usersCol.find(matchConditions).toArray(),
    ]);

    const allMatches = [...existingLeaderboard, ...existingUsers];

    // Check for explicit conflicting roll numbers ONLY
    for (const match of allMatches) {
      const matchRoll = (match.rollNo || '').trim().toUpperCase();

      // Only if BOTH have non-empty roll numbers AND they differ, is there a genuine collision
      // between two different students who happen to share the same name in this course.
      if (cleanRollNo && matchRoll && cleanRollNo !== matchRoll) {
        const dept = cleanCourse || 'this course';
        const sem = match.year || match.batch || 'this batch';
        return {
          conflict: true,
          message: `Another participant named "${cleanUsername}" with Roll No "${matchRoll}" is already registered in ${dept} (${sem}). Please add an initial or verify your roll number.`,
        };
      }
    }

    // If matching participant exists, they are the SAME returning user!
    if (allMatches.length > 0) {
      const firstMatch = allMatches[0];
      return {
        conflict: false,
        isExistingUser: true,
        message: `Welcome back, ${cleanUsername}!`,
        existingProfile: {
          username: firstMatch.username || cleanUsername,
          fullName: firstMatch.fullName || firstMatch.username || cleanUsername,
          course: firstMatch.course || cleanCourse,
          year: firstMatch.year || cleanYear,
          batch: firstMatch.batch || cleanBatch,
          rollNo: firstMatch.rollNo || cleanRollNo,
        },
      };
    }

    // Brand new user registration
    return { conflict: false, isExistingUser: false };
  } catch (err: any) {
    console.error('Error in checkUsernameConflictInMongo:', err?.message);
    return { conflict: false };
  }
}

export async function getScoresFromMongo(day?: number, isAdmin: boolean = false): Promise<LeaderboardEntry[]> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return [];
    }

    // 🔒 Enforce leaderboard enabled & Day 8+ leaderboard suspense on backend for public callers:
    if (!isAdmin) {
      const config = await getLeaderboardConfigFromMongo();
      if (config.leaderboardEnabled === false) {
        return [];
      }
      if (config.suspenseEnabled && typeof config.hideFromDay === 'number') {
        if (day && day >= config.hideFromDay) {
          // Public request for a day in suspense: return empty array
          return [];
        }
      }
    }

    const collection = db.collection('leaderboard');
    const query = day ? { day: Number(day) } : {};

    // 1. Sort chronologically EARLIEST first so we accurately capture the authentic FIRST attempt
    const allRecords = await collection
      .find(query)
      .sort({ createdAt: 1, submittedAt: 1, _id: 1 })
      .toArray();

    // 2. Deduplicate strictly by user: Keep only the 1st attempt, discard & delete repeat attempts
    const firstAttemptMap = new Map<string, any>();
    const duplicateIds: any[] = [];

    for (const r of allRecords) {
      const rDay = Number(r.day);
      const cleanRoll = (r.rollNo || '').trim().toUpperCase();
      const cleanName = (r.fullName || r.username || '').trim().toLowerCase();
      // Primary identifier: RollNo if present, otherwise trimmed lowercased name
      const userKey = cleanRoll ? `roll_${cleanRoll}` : `name_${cleanName}`;
      const compositeKey = `day_${rDay}_${userKey}`;

      if (firstAttemptMap.has(compositeKey)) {
        // This is a 2nd, 3rd, or repeated attempt -> discard and queue for DB deletion
        duplicateIds.push(r._id);
      } else {
        // This is the authentic 1st attempt
        firstAttemptMap.set(compositeKey, r);
      }
    }

    // 3. Purge duplicate repeat attempts from MongoDB to permanently fix database integrity
    if (duplicateIds.length > 0) {
      collection.deleteMany({ _id: { $in: duplicateIds } }).catch((err) => {
        console.error('Failed to purge duplicate attempts from MongoDB:', err?.message);
      });
    }

    const uniqueFirstAttempts = Array.from(firstAttemptMap.values());

    // 3b. Sanitize scores and auto-heal verified answer scores:
    // Days 1-9: max points 30, max firstTryCount 3 (removes legacy streak bonus)
    // Day 10 (Grand Finale): max points 100, max firstTryCount 10
    for (const r of uniqueFirstAttempts) {
      const rDay = Number(r.day);
      const maxPts = rDay === 10 ? 100 : 30;
      const maxFirstTry = rDay === 10 ? 10 : 3;

      // Auto-heal verified scores if answers array is present (unless manually edited by admin):
      if (!r.adminEdited && Array.isArray(r.answers) && r.answers.length > 0) {
        const verifiedCorrect = r.answers.filter((a: any) => a.isCorrect).length;
        const verifiedPoints = verifiedCorrect * 10;
        if (r.points !== verifiedPoints || r.firstTryCount !== verifiedCorrect) {
          r.points = verifiedPoints;
          r.firstTryCount = verifiedCorrect;
          r.totalQuestions = r.answers.length;
          collection.updateOne(
            { _id: r._id },
            {
              $set: {
                points: verifiedPoints,
                firstTryCount: verifiedCorrect,
                totalQuestions: r.answers.length,
              },
            }
          ).catch(() => {});
        }
      }

      if (rDay !== 10) {
        if (r.points > 30) r.points = 30;
        if (r.firstTryCount > 3) r.firstTryCount = 3;
      } else {
        if (r.points > 100) r.points = 100;
        if (r.firstTryCount > 10) r.firstTryCount = 10;
      }
    }
    collection.updateMany({ day: { $ne: 10 }, points: { $gt: 30 } }, { $set: { points: 30 } }).catch(() => {});
    collection.updateMany({ day: { $ne: 10 }, firstTryCount: { $gt: 3 } }, { $set: { firstTryCount: 3 } }).catch(() => {});

    // 4. Sort official first attempts by leaderboard rules: Points DESC, Speed ASC
    uniqueFirstAttempts.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
      if ((b.firstTryCount || 0) !== (a.firstTryCount || 0)) {
        return (b.firstTryCount || 0) - (a.firstTryCount || 0);
      }
      return new Date(a.submittedAt || a.createdAt).getTime() - new Date(b.submittedAt || b.createdAt).getTime();
    });

    let mapped = uniqueFirstAttempts.map(r => ({
      id: r.id || r._id.toString(),
      username: r.username,
      fullName: r.fullName || r.username,
      course: r.course || '',
      year: r.year || '',
      batch: r.batch || '',
      rollNo: r.rollNo || '',
      email: r.email || '',
      day: r.day,
      points: Math.min(r.points, r.day === 10 ? 100 : 30),
      timeSeconds: r.timeSeconds,
      firstTryCount: Math.min(r.firstTryCount || 0, r.day === 10 ? 10 : 3),
      totalQuestions: r.totalQuestions || (r.day === 10 ? 10 : 3),
      submittedAt: r.submittedAt || (r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()),
      clientIp: r.clientIp || '',
      answers: Array.isArray(r.answers) ? r.answers : undefined,
    }));

    // If caller is public (non-admin), enforce leaderboardEnabled & suspense rules
    if (!isAdmin) {
      const config = await getLeaderboardConfigFromMongo();
      if (config.leaderboardEnabled === false) {
        return [];
      }
      if (config.suspenseEnabled && typeof config.hideFromDay === 'number') {
        mapped = mapped.filter(e => e.day < config.hideFromDay);
      }
    }

    return mapped;
  } catch (err: any) {
    console.error('Failed to get scores from MongoDB:', err?.message);
    return [];
  }
}

export async function getUsersFromMongo(): Promise<UserProfile[]> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return [];
    }
    const collection = db.collection('users');
    const records = await collection.find({}).sort({ updatedAt: -1 }).limit(500).toArray();

    return records.map(r => ({
      username: r.username,
      fullName: r.fullName || r.username,
      course: r.course || '',
      year: r.year || '',
      batch: r.batch || '',
      rollNo: r.rollNo || '',
      email: r.email || '',
    }));
  } catch (err: any) {
    console.error('Failed to get users from MongoDB:', err?.message);
    return [];
  }
}

export async function getMongoStatus(): Promise<DbStatus> {
  const { status } = await connectToDatabase();
  return status;
}

// =========================================================================
// 👑 GLOBAL ADMIN AUTHENTICATION & MULTI-DEVICE SYNC
// =========================================================================

export type ServerAdminUser = {
  username: string;
  name: string;
  role: 'main_admin' | 'admin';
  createdAt: string;
};

export async function validateAdminLogin(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: ServerAdminUser; error?: string }> {
  const cleanUser = (usernameInput || '').trim();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Please enter both username and password.' };
  }

  // 1. Check MongoDB Atlas Admins collection first
  try {
    const { db, status } = await connectToDatabase();
    if (db && status.connected) {
      const adminsCol = db.collection('admins');
      // Case-insensitive username lookup
      const found = await adminsCol.findOne({
        username: { $regex: new RegExp(`^${cleanUser}$`, 'i') },
      });

      if (found) {
        if (found.password === cleanPass) {
          return {
            success: true,
            user: {
              username: found.username,
              name: found.name || found.username,
              role: found.role || 'admin',
              createdAt: found.createdAt || new Date().toISOString(),
            },
          };
        } else {
          return { success: false, error: 'Invalid password. Please check and try again.' };
        }
      }
    }
  } catch (err: any) {
    console.error('MongoDB admin validation error:', err?.message);
  }

  // 2. Check Main Administrator (configured via env or fallback)
  const envMainUser = (process.env.MAIN_ADMIN_USERNAME || 'kuchupuchu').trim();
  const envMainPass = (process.env.MAIN_ADMIN_PASSWORD || 'mybestfriendnilay420').trim();

  // Case-insensitive username check, exact password check
  if (cleanUser.toLowerCase() === envMainUser.toLowerCase()) {
    if (cleanPass === envMainPass) {
      return {
        success: true,
        user: {
          username: envMainUser,
          name: 'Chief Curator (Main Admin)',
          role: 'main_admin',
          createdAt: new Date().toISOString(),
        },
      };
    } else {
      return { success: false, error: 'Invalid password. Please check and try again.' };
    }
  }

  return { success: false, error: 'Admin account not found. Invalid username or password.' };
}

export async function getAdminsFromMongo(): Promise<ServerAdminUser[]> {
  const mainUser: ServerAdminUser = {
    username: (process.env.MAIN_ADMIN_USERNAME || 'kuchupuchu').trim(),
    name: 'Chief Curator (Main Admin)',
    role: 'main_admin',
    createdAt: new Date().toISOString(),
  };

  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return [mainUser];
    }

    const adminsCol = db.collection('admins');
    const records = await adminsCol.find({}).sort({ createdAt: -1 }).toArray();
    const subAdmins: ServerAdminUser[] = records.map(r => ({
      username: r.username,
      name: r.name || r.username,
      role: r.role || 'admin',
      createdAt: r.createdAt || new Date().toISOString(),
    }));

    return [mainUser, ...subAdmins.filter(a => a.username.toLowerCase() !== mainUser.username.toLowerCase())];
  } catch (err) {
    return [mainUser];
  }
}

export async function saveAdminToMongo(newAdmin: {
  username: string;
  name: string;
  password: string;
  role: 'main_admin' | 'admin';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: 'Database not connected to save admin.' };
    }

    const cleanUsername = (newAdmin.username || '').trim().toLowerCase();
    const cleanPassword = (newAdmin.password || '').trim();
    const cleanName = (newAdmin.name || '').trim() || cleanUsername;
    const cleanRole = newAdmin.role === 'main_admin' ? 'main_admin' : 'admin';

    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    const adminsCol = db.collection('admins');

    // Upsert so if admin exists, credentials update cleanly; if new, inserted cleanly
    await adminsCol.updateOne(
      { username: cleanUsername },
      {
        $set: {
          username: cleanUsername,
          name: cleanName,
          password: cleanPassword,
          role: cleanRole,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save admin.' };
  }
}

export async function deleteAdminFromMongo(usernameToDelete: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: 'Database not connected.' };
    }

    const cleanUsername = usernameToDelete.trim().toLowerCase();
    const mainUser = (process.env.MAIN_ADMIN_USERNAME || 'kuchupuchu').trim().toLowerCase();
    if (cleanUsername === mainUser) {
      return { success: false, error: 'Cannot delete the Main Admin account.' };
    }

    const adminsCol = db.collection('admins');
    await adminsCol.deleteOne({ username: cleanUsername });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to remove admin.' };
  }
}

export async function getLiveDaysFromMongo(): Promise<number[]> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return [1];
    }

    const configCol = db.collection('config');
    const doc = await configCol.findOne({ key: 'live_days' });
    if (doc && Array.isArray(doc.days)) {
      return doc.days.map(Number);
    }
    return [1];
  } catch (err) {
    return [1];
  }
}

export async function saveLiveDaysToMongo(days: number[]): Promise<boolean> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return false;
    }

    const configCol = db.collection('config');
    await configCol.updateOne(
      { key: 'live_days' },
      { $set: { key: 'live_days', days: days.map(Number), updatedAt: new Date() } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    return false;
  }
}

export async function updateScoreInMongo(params: {
  id?: string;
  username?: string;
  day?: number;
  points?: number;
  timeSeconds?: number;
  firstTryCount?: number;
  fullName?: string;
  course?: string;
  year?: string;
  batch?: string;
  rollNo?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: 'Database not connected.' };
    }

    const leaderboardCol = db.collection('leaderboard');
    const usersCol = db.collection('users');

    const filter: any = {};
    if (params.id) {
      filter.$or = [{ id: params.id }, { _id: params.id }];
    } else {
      const userOr: any[] = [];
      const cleanRoll = (params.rollNo || '').trim().toUpperCase();
      if (cleanRoll && cleanRoll !== '-' && cleanRoll !== 'N/A') {
        userOr.push({ rollNo: cleanRoll });
      }
      if (params.username) {
        const esc = params.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        userOr.push({ username: { $regex: new RegExp(`^${esc}$`, 'i') } });
      }
      if (params.fullName) {
        const escFull = params.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        userOr.push({ fullName: { $regex: new RegExp(`^${escFull}$`, 'i') } });
      }
      if (userOr.length > 0) {
        filter.$or = userOr;
      }
      if (params.day) filter.day = Number(params.day);
    }

    let existing = await leaderboardCol.findOne(filter);
    if (!existing && (params.username || params.fullName) && params.day) {
      const esc = (params.username || params.fullName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const userProfile =
        (await leaderboardCol.findOne({
          $or: [
            { username: { $regex: new RegExp(`^${esc}$`, 'i') } },
            { fullName: { $regex: new RegExp(`^${esc}$`, 'i') } }
          ]
        })) ||
        (await usersCol.findOne({
          username: { $regex: new RegExp(`^${esc}$`, 'i') },
        }));

      const cleanDay = Number(params.day);
      const newEntryId = params.id || `entry-admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newRecord: any = {
        id: newEntryId,
        username: (params.username || params.fullName || 'Student').trim(),
        fullName: params.fullName?.trim() || userProfile?.fullName || params.username?.trim(),
        course: params.course?.trim() || userProfile?.course || '',
        year: params.year?.trim() || userProfile?.year || '',
        batch: params.batch !== undefined ? params.batch.trim() : (userProfile?.batch || ''),
        rollNo: params.rollNo || userProfile?.rollNo || '',
        email: userProfile?.email || '',
        day: cleanDay,
        points: typeof params.points === 'number' ? Number(params.points) : 0,
        timeSeconds: typeof params.timeSeconds === 'number' ? Number(params.timeSeconds) : 0,
        firstTryCount:
          typeof params.firstTryCount === 'number'
            ? Number(params.firstTryCount)
            : params.points
            ? Math.min(Math.floor(params.points / 10), cleanDay === 10 ? 10 : 3)
            : 0,
        totalQuestions: cleanDay === 10 ? 10 : 3,
        clientIp: 'Admin Panel',
        submittedAt: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        adminEdited: true,
        answers: [],
      };
      await leaderboardCol.insertOne(newRecord);
      existing = newRecord;
    } else if (!existing) {
      return { success: false, error: 'Score record not found.' };
    }

    const updateFields: any = {
      updatedAt: new Date(),
      adminEdited: true,
    };
    if (typeof params.points === 'number') updateFields.points = Number(params.points);
    if (typeof params.timeSeconds === 'number') updateFields.timeSeconds = Number(params.timeSeconds);
    if (typeof params.firstTryCount === 'number') updateFields.firstTryCount = Number(params.firstTryCount);
    if (params.fullName) updateFields.fullName = params.fullName.trim();
    if (params.course) updateFields.course = params.course.trim();
    if (params.year) updateFields.year = params.year.trim();
    if (params.batch !== undefined) updateFields.batch = params.batch.trim();
    // 🛡️ SECURITY: rollNo is strictly immutable and cannot be changed from admin panel!

    await leaderboardCol.updateOne({ _id: existing._id }, { $set: updateFields });

    // When student's name or academic details change, update across ALL days/entries for this user
    const cleanUser = (existing.username || params.username || '').trim().toLowerCase();
    const cleanRoll = (existing.rollNo || params.rollNo || '').trim().toUpperCase();

    const userConditions: any[] = [];
    if (cleanUser) {
      const esc = cleanUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      userConditions.push({ username: { $regex: new RegExp(`^${esc}$`, 'i') } });
    }
    if (cleanRoll) {
      userConditions.push({ rollNo: cleanRoll });
    }

    if (userConditions.length > 0) {
      const globalProfileUpdate: any = { updatedAt: new Date() };
      if (params.fullName) globalProfileUpdate.fullName = params.fullName.trim();
      if (params.course) globalProfileUpdate.course = params.course.trim();
      if (params.year) globalProfileUpdate.year = params.year.trim();
      if (params.batch !== undefined) globalProfileUpdate.batch = params.batch.trim();

      await leaderboardCol.updateMany({ $or: userConditions }, { $set: globalProfileUpdate });
      await usersCol.updateMany({ $or: userConditions }, { $set: globalProfileUpdate });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update score.' };
  }
}

export async function deleteScoreInMongo(params: {
  id?: string;
  username?: string;
  day?: number;
  deleteUser?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: 'Database not connected.' };
    }

    const leaderboardCol = db.collection('leaderboard');
    const usersCol = db.collection('users');

    const filter: any = {};
    if (params.id) {
      filter.$or = [{ id: params.id }, { _id: params.id }];
    } else if (params.username) {
      const esc = params.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.username = { $regex: new RegExp(`^${esc}$`, 'i') };
      if (params.day) filter.day = Number(params.day);
    }

    const existing = await leaderboardCol.findOne(filter);
    if (existing) {
      await leaderboardCol.deleteOne({ _id: existing._id });
    }

    const uName = existing?.username || params.username;
    if (uName && params.deleteUser) {
      const esc = uName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await usersCol.deleteMany({
        $or: [
          { username: { $regex: new RegExp(`^${esc}$`, 'i') } },
          { fullName: { $regex: new RegExp(`^${esc}$`, 'i') } }
        ]
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete record.' };
  }
}

// =========================================================================
// 🧩 NAVRATRI SLIDING PUZZLE BACKEND SERVICES
// =========================================================================

export type PuzzleLevelScore = {
  level: number;
  name: string;
  timeSeconds: number;
  moves: number;
};

export type PuzzleSubmission = {
  id?: string;
  username: string;
  fullName?: string;
  course?: string;
  year?: string;
  batch?: string;
  rollNo?: string;
  email?: string;
  date?: string; // YYYY-MM-DD
  completedLevels: number; // 1, 2, or 3
  totalTimeSeconds: number;
  totalMoves: number;
  pointsEarned?: number; // 15, 30, or 50
  levelBreakdown?: PuzzleLevelScore[];
  clientIp?: string;
  submittedAt?: string;
};

export type PuzzleLeaderboardEntry = {
  id: string;
  username: string;
  fullName: string;
  course: string;
  year: string;
  batch: string;
  rollNo: string;
  date: string;
  completedLevels: number;
  totalTimeSeconds: number;
  totalMoves: number;
  pointsEarned?: number;
  rank: number;
  isTop10: boolean;
  bonusPoints: number;
  submittedAt: string;
  levelBreakdown?: PuzzleLevelScore[];
};

export type PuzzleConfig = {
  enabled: boolean;
  bonusPoints: number;
  topLimit: number;
  updatedAt?: string;
};

function getTodayIST(): string {
  const d = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
}

export async function getPuzzleConfigFromMongo(): Promise<PuzzleConfig> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { enabled: true, bonusPoints: 50, topLimit: 10 };
    }

    const configCol = db.collection('config');
    const doc = await configCol.findOne({ key: 'puzzle_config' });
    if (doc) {
      return {
        enabled: doc.enabled !== false,
        bonusPoints: Number(doc.bonusPoints || 50),
        topLimit: Number(doc.topLimit || 10),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
      };
    }
    return { enabled: true, bonusPoints: 50, topLimit: 10 };
  } catch (err) {
    return { enabled: true, bonusPoints: 50, topLimit: 10 };
  }
}

export async function savePuzzleConfigToMongo(config: {
  enabled: boolean;
  bonusPoints?: number;
  topLimit?: number;
}): Promise<boolean> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return false;
    }

    const configCol = db.collection('config');
    await configCol.updateOne(
      { key: 'puzzle_config' },
      {
        $set: {
          key: 'puzzle_config',
          enabled: Boolean(config.enabled),
          bonusPoints: Number(config.bonusPoints || 50),
          topLimit: Number(config.topLimit || 10),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    return true;
  } catch (err) {
    return false;
  }
}

export async function checkPuzzleAttemptInMongo(
  identifier?: string,
  rollNo?: string,
  dateStr?: string
): Promise<{ attempted: boolean; existingScore?: any; reason?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { attempted: false };
    }

    const puzzleScoresCol = db.collection('puzzle_scores');
    const targetDate = dateStr || getTodayIST();
    const cleanId = (identifier || '').trim();
    const cleanRoll = (rollNo || '').trim().toUpperCase();

    const conditions: any[] = [];
    if (cleanRoll) {
      conditions.push({ rollNo: cleanRoll });
    }
    if (cleanId) {
      const esc = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({ username: { $regex: new RegExp(`^${esc}$`, 'i') } });
      conditions.push({ fullName: { $regex: new RegExp(`^${esc}$`, 'i') } });
    }

    if (conditions.length === 0) {
      return { attempted: false };
    }

    const existing = await puzzleScoresCol.findOne({
      date: targetDate,
      $or: conditions,
    });

    if (existing) {
      const calcPoints = (lvls: number) => (lvls >= 3 ? 50 : lvls === 2 ? 30 : lvls === 1 ? 15 : 0);
      const completedLevels = Number(existing.completedLevels || 0);
      const canContinue = completedLevels < 3;
      return {
        attempted: true,
        canContinue,
        reason: canContinue
          ? `Participant "${existing.fullName || existing.username}" completed Level ${completedLevels}. You can continue to next levels!`
          : `Participant "${existing.fullName || existing.username}" has already completed all 3 levels of today's Navratri puzzle challenge.`,
        existingScore: {
          id: existing.id,
          username: existing.username,
          fullName: existing.fullName,
          course: existing.course,
          rollNo: existing.rollNo,
          completedLevels,
          totalTimeSeconds: existing.totalTimeSeconds,
          totalMoves: existing.totalMoves,
          pointsEarned: existing.pointsEarned ?? calcPoints(completedLevels),
          bonusAwarded: existing.bonusAwarded,
          bonusPoints: existing.bonusPoints,
          submittedAt: existing.submittedAt,
          rank: existing.rank,
        },
      };
    }

    return { attempted: false };
  } catch (err: any) {
    console.error('Error checking puzzle attempt in Mongo:', err?.message);
    return { attempted: false };
  }
}

export async function savePuzzleScoreToMongo(
  submission: PuzzleSubmission,
  clientIp?: string
): Promise<{
  success: boolean;
  error?: string;
  isTop10?: boolean;
  rank?: number;
  bonusPoints?: number;
}> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: 'Database not connected.' };
    }

    // 1. Verify game is enabled
    const config = await getPuzzleConfigFromMongo();
    if (!config.enabled) {
      return {
        success: false,
        error: 'The Navratri Sliding Puzzle is currently disabled by Admin.',
      };
    }

    const puzzleScoresCol = db.collection('puzzle_scores');
    const targetDate = submission.date || getTodayIST();
    const cleanRollNo = (submission.rollNo || '').trim().toUpperCase();
    const cleanUsername = (submission.username || '').trim();
    const cleanFullName = (submission.fullName || submission.username || '').trim();
    const cleanCourse = (submission.course || '').trim();
    const cleanYear = (submission.year || '').trim();
    const cleanBatch = (submission.batch || '').trim();
    const cleanEmail = (submission.email || '').trim();

    // 2. Anti-cheat check: strictly 1 daily session per student, with continuation allowed for partial levels (Level 1 -> 2 -> 3)
    const checkAttempt = await checkPuzzleAttemptInMongo(cleanUsername, cleanRollNo, targetDate);
    const existing = checkAttempt.existingScore;
    const currentLevels = Number(submission.completedLevels);
    const currentTime = Number(submission.totalTimeSeconds);
    const currentMoves = Number(submission.totalMoves);

    if (checkAttempt.attempted && existing) {
      const prevLevels = Number(existing.completedLevels || 0);
      if (prevLevels >= 3) {
        return {
          success: false,
          error: 'You have already completed all 3 levels of today\'s puzzle challenge! (Maximum 50 points earned)',
        };
      }
      if (currentLevels <= prevLevels) {
        return {
          success: false,
          error: `You have already recorded Level ${prevLevels} (${existing.pointsEarned ?? 15} points). You can only continue and submit higher levels!`,
        };
      }
    }

    // 3. Calculate rank for today's submissions
    const todayEntries = await puzzleScoresCol
      .find({ date: targetDate })
      .sort({ completedLevels: -1, totalTimeSeconds: 1, totalMoves: 1, createdAt: 1 })
      .toArray();

    let rank = 1;
    for (const e of todayEntries) {
      const eLevels = Number(e.completedLevels || 0);
      const eTime = Number(e.totalTimeSeconds || 0);
      const eMoves = Number(e.totalMoves || 0);

      if (
        eLevels > currentLevels ||
        (eLevels === currentLevels && eTime < currentTime) ||
        (eLevels === currentLevels && eTime === currentTime && eMoves <= currentMoves)
      ) {
        rank++;
      }
    }

    const isTop10 = rank <= (config.topLimit || 10);
    const bonusPoints = 0; // Strict: Puzzle score is stored separately in MongoDB without adding points to quiz leaderboard
    
    // Points system: Level 1 = 15, Level 2 = 30 (15+15), Level 3 = 50 (15+15+20)
    const pointsEarned = submission.pointsEarned ?? (
      currentLevels >= 3 ? 50 : currentLevels === 2 ? 30 : currentLevels === 1 ? 15 : 0
    );

    const entryId = submission.id || `puzzle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();

    // 4. Save or update puzzle score in puzzle_scores collection
    if (existing) {
      const updateConditions: any[] = [];
      if (cleanRollNo) updateConditions.push({ rollNo: cleanRollNo });
      if (cleanUsername) {
        const esc = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        updateConditions.push({ username: { $regex: new RegExp(`^${esc}$`, 'i') } });
        updateConditions.push({ fullName: { $regex: new RegExp(`^${esc}$`, 'i') } });
      }

      await puzzleScoresCol.updateOne(
        { date: targetDate, $or: updateConditions },
        {
          $set: {
            completedLevels: currentLevels,
            totalTimeSeconds: currentTime,
            totalMoves: currentMoves,
            pointsEarned,
            levelBreakdown: submission.levelBreakdown || [],
            rank,
            clientIp: clientIp || submission.clientIp || '',
            submittedAt: submission.submittedAt || now.toISOString(),
            updatedAt: now,
          },
        }
      );
    } else {
      await puzzleScoresCol.insertOne({
        id: entryId,
        username: cleanUsername,
        fullName: cleanFullName,
        course: cleanCourse,
        year: cleanYear,
        batch: cleanBatch,
        rollNo: cleanRollNo,
        email: cleanEmail,
        date: targetDate,
        completedLevels: currentLevels,
        totalTimeSeconds: currentTime,
        totalMoves: currentMoves,
        pointsEarned,
        levelBreakdown: submission.levelBreakdown || [],
        bonusAwarded: false, // Strict: No points added to general leaderboard
        bonusPoints: 0,
        rank,
        clientIp: clientIp || submission.clientIp || '',
        submittedAt: submission.submittedAt || now.toISOString(),
        createdAt: now,
      });
    }

    // 5. Update users collection profile (only academic identity info, no quiz marks added)
    const usersCol = db.collection('users');
    await usersCol.updateOne(
      { username: cleanUsername.toLowerCase() },
      {
        $set: {
          username: cleanUsername,
          fullName: cleanFullName,
          course: cleanCourse,
          year: cleanYear,
          batch: cleanBatch,
          rollNo: cleanRollNo,
          email: cleanEmail,
          lastIp: clientIp || '',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          editCount: 0,
        },
      },
      { upsert: true }
    );

    return {
      success: true,
      isTop10,
      rank,
      pointsEarned,
      bonusPoints: 0,
    };
  } catch (err: any) {
    console.error('Failed to save puzzle score to Mongo:', err?.message);
    return { success: false, error: err?.message || 'Failed to record puzzle score.' };
  }
}

export async function getPuzzleLeaderboardFromMongo(
  dateStr?: string
): Promise<PuzzleLeaderboardEntry[]> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return [];
    }

    const puzzleScoresCol = db.collection('puzzle_scores');
    const targetDate = dateStr || getTodayIST();
    const query = dateStr === 'all' ? {} : { date: targetDate };

    const entries = await puzzleScoresCol
      .find(query)
      .sort({ completedLevels: -1, totalTimeSeconds: 1, totalMoves: 1, createdAt: 1 })
      .toArray();

    return entries.map((e, index) => {
      const rank = index + 1;
      const isTop10 = rank <= 10;
      const lvls = Number(e.completedLevels || 1);
      const pts = e.pointsEarned ?? (lvls >= 3 ? 50 : lvls === 2 ? 30 : 15);
      return {
        id: e.id || e._id?.toString(),
        username: e.username || '',
        fullName: e.fullName || e.username || '',
        course: e.course || '',
        year: e.year || '',
        batch: e.batch || '',
        rollNo: e.rollNo || '',
        date: e.date || targetDate,
        completedLevels: lvls,
        totalTimeSeconds: Number(e.totalTimeSeconds || 0),
        totalMoves: Number(e.totalMoves || 0),
        pointsEarned: pts,
        rank,
        isTop10,
        bonusPoints: 0,
        submittedAt: e.submittedAt || '',
        levelBreakdown: e.levelBreakdown || [],
      };
    });
  } catch (err) {
    console.error('Error fetching puzzle leaderboard from Mongo:', err);
    return [];
  }
}

export async function getPuzzleStatsFromMongo(): Promise<{
  totalAttemptsToday: number;
  totalAttemptsAllTime: number;
  fastestTimeSeconds: number | null;
  top10BonusAwardedCount: number;
  enabled: boolean;
}> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return {
        totalAttemptsToday: 0,
        totalAttemptsAllTime: 0,
        fastestTimeSeconds: null,
        top10BonusAwardedCount: 0,
        enabled: true,
      };
    }

    const config = await getPuzzleConfigFromMongo();
    const puzzleScoresCol = db.collection('puzzle_scores');
    const today = getTodayIST();

    const todayAttempts = await puzzleScoresCol.find({ date: today }).toArray();
    const totalAttemptsToday = todayAttempts.length;
    const totalAttemptsAllTime = await puzzleScoresCol.countDocuments();

    let fastestTimeSeconds: number | null = null;

    for (const a of todayAttempts) {
      const time = Number(a.totalTimeSeconds || 0);
      if (time > 0 && (fastestTimeSeconds === null || time < fastestTimeSeconds)) {
        fastestTimeSeconds = time;
      }
    }

    return {
      totalAttemptsToday,
      totalAttemptsAllTime,
      fastestTimeSeconds,
      top10BonusAwardedCount: 0,
      enabled: config.enabled,
    };
  } catch (err) {
    return {
      totalAttemptsToday: 0,
      totalAttemptsAllTime: 0,
      fastestTimeSeconds: null,
      top10BonusAwardedCount: 0,
      enabled: true,
    };
  }
}

export async function deletePuzzleScoreInMongo(params: {
  id?: string;
  username?: string;
  rollNo?: string;
  date?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: 'Database not connected.' };
    }

    const puzzleScoresCol = db.collection('puzzle_scores');
    const conditions: any[] = [];

    if (params.id) {
      conditions.push({ id: params.id });
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(params.id)) {
          conditions.push({ _id: new ObjectId(params.id) });
        }
      } catch {}
    }

    const cleanUsername = (params.username || '').trim();
    if (cleanUsername) {
      const esc = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({ username: { $regex: new RegExp(`^${esc}$`, 'i') } });
      conditions.push({ fullName: { $regex: new RegExp(`^${esc}$`, 'i') } });
    }

    const cleanRollNo = (params.rollNo || '').trim().toUpperCase();
    if (cleanRollNo) {
      conditions.push({ rollNo: cleanRollNo });
    }

    if (conditions.length === 0) {
      return { success: false, error: 'No identifier provided to delete puzzle record.' };
    }

    const filter: any = conditions.length === 1 ? { ...conditions[0] } : { $or: conditions };

    if (params.date && params.date !== 'all') {
      filter.date = params.date;
    }

    await puzzleScoresCol.deleteMany(filter);
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting puzzle score from Mongo:', err);
    return { success: false, error: err?.message || 'Failed to delete puzzle score from database.' };
  }
}

// =========================================================================
// 🔒 LEADERBOARD CONFIGURATION & DAY 8+ SUSPENSE CONTROLS
// =========================================================================

export type LeaderboardConfig = {
  leaderboardEnabled?: boolean;
  hideFromDay: number;
  suspenseEnabled: boolean;
  announcementMessage?: string;
  offlineMessage?: string;
  updatedAt?: string;
};

export async function getLeaderboardConfigFromMongo(): Promise<LeaderboardConfig> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return {
        leaderboardEnabled: true,
        hideFromDay: 8,
        suspenseEnabled: true,
        announcementMessage: 'The celebration is not over yet. Stay tuned for the final reveal!',
        offlineMessage: 'The leaderboard is currently paused by the event administration. All participant scores and attempts are safely recorded in our database.',
      };
    }

    const configCol = db.collection('config');
    const doc = await configCol.findOne({ key: 'leaderboard_config' });
    if (doc) {
      return {
        leaderboardEnabled: doc.leaderboardEnabled !== false,
        hideFromDay: typeof doc.hideFromDay === 'number' ? doc.hideFromDay : 8,
        suspenseEnabled: doc.suspenseEnabled !== false,
        announcementMessage: doc.announcementMessage || 'The celebration is not over yet. Stay tuned for the final reveal!',
        offlineMessage: doc.offlineMessage || 'The leaderboard is currently paused by the event administration. All participant scores and attempts are safely recorded in our database.',
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
      };
    }
    return {
      leaderboardEnabled: true,
      hideFromDay: 8,
      suspenseEnabled: true,
      announcementMessage: 'The celebration is not over yet. Stay tuned for the final reveal!',
      offlineMessage: 'The leaderboard is currently paused by the event administration. All participant scores and attempts are safely recorded in our database.',
    };
  } catch (err) {
    return {
      leaderboardEnabled: true,
      hideFromDay: 8,
      suspenseEnabled: true,
      announcementMessage: 'The celebration is not over yet. Stay tuned for the final reveal!',
      offlineMessage: 'The leaderboard is currently paused by the event administration. All participant scores and attempts are safely recorded in our database.',
    };
  }
}

export async function saveLeaderboardConfigToMongo(config: Partial<LeaderboardConfig>): Promise<boolean> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return false;
    }

    const configCol = db.collection('config');
    const updateDoc: any = {
      key: 'leaderboard_config',
      updatedAt: new Date(),
    };
    if (typeof config.leaderboardEnabled === 'boolean') updateDoc.leaderboardEnabled = config.leaderboardEnabled;
    if (typeof config.hideFromDay === 'number') updateDoc.hideFromDay = config.hideFromDay;
    if (typeof config.suspenseEnabled === 'boolean') updateDoc.suspenseEnabled = config.suspenseEnabled;
    if (config.announcementMessage) updateDoc.announcementMessage = config.announcementMessage;
    if (config.offlineMessage) updateDoc.offlineMessage = config.offlineMessage;

    await configCol.updateOne(
      { key: 'leaderboard_config' },
      { $set: updateDoc },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to save leaderboard config to MongoDB:', err);
    return false;
  }
}

// =========================================================================
// 🌸 SHAKTI REFLECTION: WHAT DID YOU LEARN?
// =========================================================================

export type ShaktiReflectionRecord = {
  id?: string;
  quality: string;
  reflectionText: string;
  authorName?: string;
  course?: string;
  year?: string;
  rollNo?: string;
  clientIp?: string;
  createdAt?: string | Date;
  isPublic?: boolean;
};

export async function saveReflectionToMongo(
  record: ShaktiReflectionRecord,
  clientIp?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: 'Database not connected' };
    }

    const reflectionsCol = db.collection('reflections');
    const now = new Date();
    const entryId = record.id || `refl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    await reflectionsCol.insertOne({
      id: entryId,
      quality: record.quality?.trim() || 'Courage',
      reflectionText: record.reflectionText?.trim() || '',
      authorName: record.authorName?.trim() || '',
      course: record.course?.trim() || '',
      year: record.year?.trim() || '',
      rollNo: (record.rollNo || '').trim().toUpperCase(),
      clientIp: clientIp || record.clientIp || '',
      isPublic: Boolean(record.isPublic), // default false (private by default)
      createdAt: now,
    });

    return { success: true, id: entryId };
  } catch (err: any) {
    console.error('Failed to save reflection to MongoDB:', err?.message);
    return { success: false, error: err?.message || 'Failed to save reflection.' };
  }
}

export async function getReflectionsFromMongo(): Promise<ShaktiReflectionRecord[]> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return [];
    }
    const reflectionsCol = db.collection('reflections');
    const docs = await reflectionsCol
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return docs.map(d => ({
      id: d.id || d._id.toString(),
      quality: d.quality,
      reflectionText: d.reflectionText,
      authorName: d.authorName,
      course: d.course,
      year: d.year,
      rollNo: d.rollNo,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
      isPublic: d.isPublic ?? false,
    }));
  } catch (err) {
    return [];
  }
}


