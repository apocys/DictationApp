import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Table pour stocker la clé API Gemini de l'utilisateur propriétaire
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  geminiApiKey: text("geminiApiKey").notNull(),
  wordInterval: int("wordInterval").default(5).notNull(), // Intervalle en secondes entre les mots
  elevenlabsApiKey: text("elevenlabsApiKey"), // Clé API ElevenLabs (optionnelle)
  elevenlabsVoiceId: varchar("elevenlabsVoiceId", { length: 64 }).default("21m00Tcm4TlvDq8ikWAM"), // Voice ID ElevenLabs (Rachel par défaut)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Table pour stocker les sessions de dictée avec les mots extraits
 */
export const dictationSessions = mysqlTable("dictationSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  words: text("words").notNull(), // JSON array of words
  generatedDictation: text("generatedDictation"), // Texte de la dictée générée
  audioUrl: text("audioUrl"), // URL de l'audio généré par ElevenLabs
  isFavorite: int("isFavorite").default(0).notNull(), // 0 = false, 1 = true
  tags: text("tags"), // JSON array of tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DictationSession = typeof dictationSessions.$inferSelect;
export type InsertDictationSession = typeof dictationSessions.$inferInsert;
/**
 * Table pour stocker les corrections de dictée avec analyse détaillée
 */
export const dictationCorrections = mysqlTable("dictationCorrections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId"), // Lien vers la session de dictée originale (optionnel)
  originalText: text("originalText").notNull(), // Texte de la dictée originale
  userImageUrl: text("userImageUrl").notNull(), // Photo de la dictée rédigée par l'utilisateur
  extractedUserText: text("extractedUserText").notNull(), // Texte extrait de la photo
  errors: text("errors").notNull(), // JSON array des erreurs détectées
  score: int("score").notNull(), // Score sur 100
  totalWords: int("totalWords").notNull(),
  correctWords: int("correctWords").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DictationCorrection = typeof dictationCorrections.$inferSelect;
export type InsertDictationCorrection = typeof dictationCorrections.$inferInsert;
