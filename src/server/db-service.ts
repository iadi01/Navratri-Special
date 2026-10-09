import { connectToDatabase, type DbStatus } from '@/lib/mongodb';
import type { LeaderboardEntry, UserProfile } from '@/lib/leaderboard-store';

export async function saveScoreToMongo(entry: LeaderboardEntry): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, status } = await connectToDatabase();
    if (!db || !status.connected) {
      return { success: false, error: status.message };
    }

    // 1. Save or update score entry in leaderboard collection
    const leaderboardCol = db.collection('leaderboard');
    await leaderboardCol.updateOne(
      { id: entry.id },
      {
        $set: {
          id: entry.id,
          username: entry.username.trim(),
          fullName: entry.fullName?.trim() || entry.username.trim(),
          course: entry.course?.trim() || '',
          year: entry.year?.trim() || '',
          batch: entry.batch?.trim() || '',
          rollNo: entry.rollNo?.trim() || '',
          email: entry.email?.trim() || '',
          day: Number(entry.day),
          points: Number(entry.points),
          timeSeconds: Number(entry.timeSeconds),
          firstTryCount: Number(entry.firstTryCount || 0),
          totalQuestions: Number(entry.totalQuestions || 3),
          submittedAt: entry.submittedAt || new Date().toISOString(),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // 2. Save / Upsert user profile into users collection
    const usersCol = db.collection('users');
    await usersCol.updateOne(
      { username: entry.username.trim().toLowerCase() },
      {
        $set: {
          username: entry.username.trim(),
          fullName: entry.fullName?.trim() || entry.username.trim(),
          course: entry.course?.trim() || '',
          year: entry.year?.trim() || '',
          batch: entry.batch?.trim() || '',
          rollNo: entry.rollNo?.trim() || '',
          email: entry.email?.trim() || '',
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
    console.error('Failed to save score to MongoDB:', err?.message);
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
    const records = await collection
      .find(query)
      .sort({ points: -1, timeSeconds: 1 })
      .limit(500)
      .toArray();

    return records.map(r => ({
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
      submittedAt: r.submittedAt || new Date().toISOString(),
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
