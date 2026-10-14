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

    // Lookup user by rollNo if provided, or by username
    const filter = cleanRollNo ? { rollNo: cleanRollNo } : { username: profile.username.trim().toLowerCase() };
    const existing = await usersCol.findOne(filter);

    let editCount = profile.editCount || 0;
    if (existing) {
      const serverEditCount = typeof existing.editCount === 'number' ? existing.editCount : 0;
      if (serverEditCount >= 2) {
        return { success: false, error: 'Maximum 2 edits reached. Details are permanently locked.' };
      }
      editCount = Math.max(serverEditCount, editCount);
    }

    await usersCol.updateOne(
      filter,
      {
        $set: {
          username: profile.username.trim(),
          fullName: profile.fullName?.trim() || profile.username.trim(),
          course: profile.course?.trim() || '',
          year: profile.year?.trim() || '',
          batch: profile.batch?.trim() || '',
          rollNo: cleanRollNo,
          email: profile.email?.trim() || '',
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
}): Promise<{ conflict: boolean; message?: string }> {
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

    for (const match of allMatches) {
      const matchBatch = (match.batch || '').trim().toLowerCase();
      const matchYear = (match.year || '').trim().toLowerCase();
      const matchRoll = (match.rollNo || '').trim().toUpperCase();

      const sameBatch = cleanBatch && matchBatch && cleanBatch.toLowerCase() === matchBatch;
      const sameYear = cleanYear && matchYear && cleanYear.toLowerCase() === matchYear;

      // Conflict if in the same semester or batch within this course
      if (sameBatch || sameYear || (!cleanBatch && !matchBatch && (sameYear || !cleanYear))) {
        // If both have identical roll number, it is the same student revisiting
        if (cleanRollNo && matchRoll && cleanRollNo === matchRoll) {
          continue;
        }

        // If from the same IP and no conflicting roll number, allow self-edits
        if (params.clientIp && (match.clientIp === params.clientIp || match.lastIp === params.clientIp)) {
          if (!cleanRollNo || !matchRoll || cleanRollNo === matchRoll) {
            continue;
          }
        }

        const dept = cleanCourse || 'this course';
        const sem = matchYear || matchBatch || 'this batch';
        return {
          conflict: true,
          message: `Participant "${cleanUsername}" is already registered in ${dept} (${sem}). To avoid duplicate names on the leaderboard, please use your unique full name or add an initial / roll number (e.g., "${cleanUsername} K.").`,
        };
      }
    }

    return { conflict: false };
  } catch (err: any) {
    console.error('Error in checkUsernameConflictInMongo:', err?.message);
    return { conflict: false };
  }
}

export async function getScoresFromMongo(day?: number): Promise<LeaderboardEntry[]> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return [];
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

    // 3b. Sanitize scores that have points > 30 (remove streak bonus) and clamp firstTryCount
    for (const r of uniqueFirstAttempts) {
      if (r.points > 30) {
        r.points = 30;
      }
      if (r.firstTryCount > 3) {
        r.firstTryCount = 3;
      }
    }
    collection.updateMany({ points: { $gt: 30 } }, { $set: { points: 30 } }).catch(() => {});
    collection.updateMany({ firstTryCount: { $gt: 3 } }, { $set: { firstTryCount: 3 } }).catch(() => {});

    // 4. Sort official first attempts by leaderboard rules: Points DESC, Speed ASC
    uniqueFirstAttempts.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
      if ((b.firstTryCount || 0) !== (a.firstTryCount || 0)) {
        return (b.firstTryCount || 0) - (a.firstTryCount || 0);
      }
      return new Date(a.submittedAt || a.createdAt).getTime() - new Date(b.submittedAt || b.createdAt).getTime();
    });

    return uniqueFirstAttempts.map(r => ({
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
    } else if (params.username) {
      const esc = params.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.username = { $regex: new RegExp(`^${esc}$`, 'i') };
      if (params.day) filter.day = Number(params.day);
    }

    let existing = await leaderboardCol.findOne(filter);
    if (!existing && params.username && params.day) {
      const esc = params.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const userProfile =
        (await leaderboardCol.findOne({
          username: { $regex: new RegExp(`^${esc}$`, 'i') },
        })) ||
        (await usersCol.findOne({
          username: { $regex: new RegExp(`^${esc}$`, 'i') },
        }));

      const cleanDay = Number(params.day);
      const newEntryId = params.id || `entry-admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newRecord: any = {
        id: newEntryId,
        username: params.username.trim(),
        fullName: params.fullName?.trim() || userProfile?.fullName || params.username.trim(),
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
        answers: [],
      };
      await leaderboardCol.insertOne(newRecord);
      existing = newRecord;
    } else if (!existing) {
      return { success: false, error: 'Score record not found.' };
    }

    const updateFields: any = {
      updatedAt: new Date(),
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
