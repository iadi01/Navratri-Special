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
      points: Number(entry.points),
      timeSeconds: Number(entry.timeSeconds),
      firstTryCount: Number(entry.firstTryCount || 0),
      totalQuestions: Number(entry.totalQuestions || 3),
      clientIp: clientIp || entry.clientIp || '',
      submittedAt: entry.submittedAt || now.toISOString(),
      createdAt: now,
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
      points: r.points,
      timeSeconds: r.timeSeconds,
      firstTryCount: r.firstTryCount || 0,
      totalQuestions: r.totalQuestions || 3,
      submittedAt: r.submittedAt || (r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()),
      clientIp: r.clientIp || '',
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
