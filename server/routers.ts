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
    save: protectedProcedure
      .input(
        z.object({
          geminiApiKey: z.string().min(1, "La clé API est requise"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { upsertApiKey } = await import("./db");
        await upsertApiKey(ctx.user.id, input.geminiApiKey);
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
  }),
});

export type AppRouter = typeof appRouter;
