import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// API Keys management
export async function getApiKeyByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get API key: database not available");
    return undefined;
  }

  const { apiKeys } = await import("../drizzle/schema");
  const result = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertApiKey(userId: number, geminiApiKey: string, wordInterval?: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert API key: database not available");
    return;
  }

  const { apiKeys } = await import("../drizzle/schema");
  const values: any = {
    userId,
    geminiApiKey,
  };
  
  if (wordInterval !== undefined) {
    values.wordInterval = wordInterval;
  }
  
  const updateSet: any = {
    geminiApiKey,
    updatedAt: new Date(),
  };
  
  if (wordInterval !== undefined) {
    updateSet.wordInterval = wordInterval;
  }
  
  await db.insert(apiKeys).values(values).onDuplicateKeyUpdate({
    set: updateSet,
  });
}

// Dictation sessions management
export async function createDictationSession(userId: number, imageUrl: string, words: string[]) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create dictation session: database not available");
    return;
  }

  const { dictationSessions } = await import("../drizzle/schema");
  const result = await db.insert(dictationSessions).values({
    userId,
    imageUrl,
    words: JSON.stringify(words),
  });
  return result;
}

export async function getDictationSessionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get dictation sessions: database not available");
    return [];
  }

  const { dictationSessions } = await import("../drizzle/schema");
  const result = await db.select().from(dictationSessions).where(eq(dictationSessions.userId, userId));
  return result.map(session => ({
    ...session,
    words: JSON.parse(session.words) as string[],
  }));
}
