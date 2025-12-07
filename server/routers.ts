import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // API Keys management
  apiKeys: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getApiKeyByUserId } = await import("./db");
      return getApiKeyByUserId(ctx.user.id);
    }),
    saveApiKey: protectedProcedure
      .input(
        z.object({
          geminiApiKey: z.string().min(1, "Clé API requise"),
          wordInterval: z.number().min(1).max(60).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { upsertApiKey } = await import("./db");
        await upsertApiKey(ctx.user.id, input.geminiApiKey, input.wordInterval);
        return { success: true };
      }),
  }),

  // Dictation management
  dictation: router({
    extractWords: protectedProcedure
      .input(
        z.object({
          imageUrl: z.string().url("URL d'image invalide"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getApiKeyByUserId, createDictationSession } = await import("./db");
        const { extractWordsFromImage } = await import("./gemini");

        // Récupérer la clé API de l'utilisateur
        const apiKeyRecord = await getApiKeyByUserId(ctx.user.id);
        if (!apiKeyRecord) {
          throw new Error(
            "Aucune clé API Gemini configurée. Veuillez configurer votre clé API dans les paramètres."
          );
        }

        // Extraire les mots de l'image
        const words = await extractWordsFromImage(
          input.imageUrl,
          apiKeyRecord.geminiApiKey
        );

        // Sauvegarder la session
        await createDictationSession(ctx.user.id, input.imageUrl, words);

        return { words };
      }),
    getSessions: protectedProcedure.query(async ({ ctx }) => {
      const { getDictationSessionsByUserId } = await import("./db");
      return getDictationSessionsByUserId(ctx.user.id);
    }),
    generateDictation: protectedProcedure
      .input(
        z.object({
          words: z.array(z.string()).min(1, "Au moins un mot requis"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getApiKeyByUserId } = await import("./db");
        const { generateDictation } = await import("./gemini");

        // Récupérer la clé API de l'utilisateur
        const apiKeyRecord = await getApiKeyByUserId(ctx.user.id);
        if (!apiKeyRecord) {
          throw new Error(
            "Aucune clé API Gemini configurée. Veuillez configurer votre clé API dans les paramètres."
          );
        }

        // Générer la dictée
        const dictationText = await generateDictation(
          input.words,
          apiKeyRecord.geminiApiKey
        );

        return { dictationText };
      }),
  }),

  // Correction management
  correction: router({
    analyze: protectedProcedure
      .input(
        z.object({
          originalText: z.string().min(1, "Texte original requis"),
          userImageUrl: z.string().url("URL d'image invalide"),
          sessionId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getApiKeyByUserId, createDictationCorrection } = await import("./db");
        const { extractWordsFromImage, analyzeDictationErrors } = await import("./gemini");

        // Récupérer la clé API de l'utilisateur
        const apiKeyRecord = await getApiKeyByUserId(ctx.user.id);
        if (!apiKeyRecord) {
          throw new Error(
            "Aucune clé API Gemini configurée. Veuillez configurer votre clé API dans les paramètres."
          );
        }

        // Extraire le texte de l'image de l'utilisateur
        const extractedWords = await extractWordsFromImage(
          input.userImageUrl,
          apiKeyRecord.geminiApiKey
        );
        const extractedUserText = extractedWords.join(" ");

        // Analyser les erreurs
        const analysis = await analyzeDictationErrors(
          input.originalText,
          extractedUserText,
          apiKeyRecord.geminiApiKey
        );

        // Sauvegarder la correction
        await createDictationCorrection({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          originalText: input.originalText,
          userImageUrl: input.userImageUrl,
          extractedUserText,
          errors: analysis.errors,
          score: analysis.score,
          totalWords: analysis.totalWords,
          correctWords: analysis.correctWords,
        });

        return {
          extractedUserText,
          ...analysis,
        };
      }),
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getDictationCorrectionsByUserId } = await import("./db");
      return getDictationCorrectionsByUserId(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getDictationCorrectionById } = await import("./db");
        return getDictationCorrectionById(input.id, ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
