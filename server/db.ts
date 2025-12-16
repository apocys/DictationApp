import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, dictationSessions } from "../drizzle/schema";
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
export async function upsertApiKey(
  userId: number,
  geminiApiKey: string,
  wordInterval?: number,
  elevenlabsApiKey?: string,
  elevenlabsVoiceId?: string,
  enablePauses?: boolean
): Promise<void> {
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
  
  if (elevenlabsApiKey !== undefined) {
    values.elevenlabsApiKey = elevenlabsApiKey;
  }
  
  if (elevenlabsVoiceId !== undefined) {
    values.elevenlabsVoiceId = elevenlabsVoiceId;
  }
  
  if (enablePauses !== undefined) {
    values.enablePauses = enablePauses;
  }
  
  const updateSet: any = {
    geminiApiKey,
    updatedAt: new Date(),
  };
  
  if (wordInterval !== undefined) {
    updateSet.wordInterval = wordInterval;
  }
  
  if (elevenlabsApiKey !== undefined) {
    updateSet.elevenlabsApiKey = elevenlabsApiKey;
  }
  
  if (elevenlabsVoiceId !== undefined) {
    updateSet.elevenlabsVoiceId = elevenlabsVoiceId;
  }
  
  if (enablePauses !== undefined) {
    updateSet.enablePauses = enablePauses;
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

// Dictation corrections management
export async function createDictationCorrection(data: {
  userId: number;
  sessionId?: number;
  originalText: string;
  userImageUrl: string;
  extractedUserText: string;
  errors: any[];
  score: number;
  totalWords: number;
  correctWords: number;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create dictation correction: database not available");
    return;
  }

  const { dictationCorrections } = await import("../drizzle/schema");
  const result = await db.insert(dictationCorrections).values({
    userId: data.userId,
    sessionId: data.sessionId,
    originalText: data.originalText,
    userImageUrl: data.userImageUrl,
    extractedUserText: data.extractedUserText,
    errors: JSON.stringify(data.errors),
    score: data.score,
    totalWords: data.totalWords,
    correctWords: data.correctWords,
  });
  
  return result;
}

export async function getDictationCorrectionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get dictation corrections: database not available");
    return [];
  }

  const { dictationCorrections } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  
  const results = await db
    .select()
    .from(dictationCorrections)
    .where(eq(dictationCorrections.userId, userId))
    .orderBy(desc(dictationCorrections.createdAt));
  
  return results.map(r => ({
    ...r,
    errors: JSON.parse(r.errors),
  }));
}

export async function getDictationCorrectionById(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get dictation correction: database not available");
    return undefined;
  }

  const { dictationCorrections } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  const results = await db
    .select()
    .from(dictationCorrections)
    .where(
      and(
        eq(dictationCorrections.id, id),
        eq(dictationCorrections.userId, userId)
      )
    )
    .limit(1);
  
  if (results.length === 0) return undefined;
  
  return {
    ...results[0],
    errors: JSON.parse(results[0].errors),
  };
}


export async function deleteDictationSession(sessionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete session: database not available");
    return;
  }

  await db.delete(dictationSessions)
    .where(and(eq(dictationSessions.id, sessionId), eq(dictationSessions.userId, userId)));
}

export async function toggleSessionFavorite(sessionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot toggle favorite: database not available");
    return;
  }

  // Récupérer la session actuelle
  const sessions = await db.select().from(dictationSessions)
    .where(and(eq(dictationSessions.id, sessionId), eq(dictationSessions.userId, userId)))
    .limit(1);

  if (sessions.length === 0) {
    throw new Error("Session not found");
  }

  const currentFavorite = sessions[0]!.isFavorite;
  const newFavorite = currentFavorite === 1 ? 0 : 1;

  await db.update(dictationSessions)
    .set({ isFavorite: newFavorite })
    .where(and(eq(dictationSessions.id, sessionId), eq(dictationSessions.userId, userId)));
}

export async function updateSessionTags(sessionId: number, userId: number, tags: string[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update tags: database not available");
    return;
  }

  await db.update(dictationSessions)
    .set({ tags: JSON.stringify(tags) })
    .where(and(eq(dictationSessions.id, sessionId), eq(dictationSessions.userId, userId)));
}

export async function updateDictationSessionText(sessionId: number, dictationText: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update dictation text: database not available");
    return;
  }

  await db.update(dictationSessions)
    .set({ generatedDictation: dictationText })
    .where(eq(dictationSessions.id, sessionId));
}

export async function updateDictationSessionAudio(sessionId: number, audioUrl: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update audio URL: database not available");
    return;
  }

  await db.update(dictationSessions)
    .set({ audioUrl })
    .where(eq(dictationSessions.id, sessionId));
}
