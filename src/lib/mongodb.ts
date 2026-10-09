import { MongoClient, type Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export type DbStatus = {
  connected: boolean;
  type: 'atlas' | 'local_fallback';
  message: string;
};

export function getMongoUri(): string | undefined {
  return process.env.MONGODB_URI;
}

export function isRealAtlasUri(uri?: string): boolean {
  if (!uri) return false;
  const isPlaceholder =
    uri.includes('YOUR_USER') ||
    uri.includes('YOUR_PASSWORD') ||
    uri.includes('<username>') ||
    uri.includes('<password>');
  return uri.startsWith('mongodb') && !isPlaceholder;
}

export async function connectToDatabase(): Promise<{ client: MongoClient | null; db: Db | null; status: DbStatus }> {
  const uri = getMongoUri();

  if (!isRealAtlasUri(uri)) {
    return {
      client: null,
      db: null,
      status: {
        connected: false,
        type: 'local_fallback',
        message: 'MongoDB Atlas URI not set or has placeholders in .env. Running on local persistent cache.',
      },
    };
  }

  if (cachedClient && cachedDb) {
    return {
      client: cachedClient,
      db: cachedDb,
      status: {
        connected: true,
        type: 'atlas',
        message: 'Connected to MongoDB Atlas',
      },
    };
  }

  try {
    const client = new MongoClient(uri!, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    const db = client.db('pehchaan_kaun');
    cachedClient = client;
    cachedDb = db;

    return {
      client,
      db,
      status: {
        connected: true,
        type: 'atlas',
        message: 'Connected to MongoDB Atlas successfully.',
      },
    };
  } catch (err: any) {
    console.error('MongoDB Atlas connection failed:', err?.message);
    return {
      client: null,
      db: null,
      status: {
        connected: false,
        type: 'local_fallback',
        message: `Atlas connection error: ${err?.message || 'Unknown error'}. Using local storage fallback.`,
      },
    };
  }
}
