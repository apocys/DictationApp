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
    getElevenlabsVoices: protectedProcedure.query(async ({ ctx }) => {
      const { getApiKeyByUserId } = await import("./db");
      const { getVoices } = await import("./elevenlabs");
      
      const apiKeyRecord = await getApiKeyByUserId(ctx.user.id);
      
      if (!apiKeyRecord?.elevenlabsApiKey) {
        return { voices: [] };
      }
      
      const voices = await getVoices(apiKeyRecord.elevenlabsApiKey);
      return { voices };
    }),
    saveApiKey: protectedProcedure
      .input(
        z.object({
          geminiApiKey: z.string().min(1, "Clé API requise"),
          wordInterval: z.number().optional(),
          elevenlabsApiKey: z.string().optional(),
          elevenlabsVoiceId: z.string().optional(),
          enablePauses: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { upsertApiKey } = await import("./db");
        await upsertApiKey(
          ctx.user.id, 
          input.geminiApiKey, 
          input.wordInterval,
          input.elevenlabsApiKey,
          input.elevenlabsVoiceId,
          input.enablePauses
        );
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
        const { getGlobalSetting, createDictationSession } = await import("./db");
        const { extractWordsFromImage } = await import("./gemini");

        // Récupérer la clé API globale
        const geminiApiKey = await getGlobalSetting('geminiApiKey');
        if (!geminiApiKey) {
          throw new Error(
            "Aucune clé API Gemini configurée. Contactez l'administrateur."
          );
        }

        // Récupérer le prompt personnalisé si disponible
        const customPrompt = await getGlobalSetting('promptExtraction');

        // Extraire les mots de l'image
        const words = await extractWordsFromImage(
          input.imageUrl,
          geminiApiKey,
          customPrompt || undefined
        );

        // Sauvegarder la session et récupérer l'ID
        const result = await createDictationSession(ctx.user.id, input.imageUrl, words) as any;
        const sessionId = result?.insertId ? Number(result.insertId) : undefined;

        return { words, sessionId };
      }),
    getSessions: protectedProcedure.query(async ({ ctx }) => {
      const { getDictationSessionsByUserId } = await import("./db");
      return getDictationSessionsByUserId(ctx.user.id);
    }),
    generateDictation: protectedProcedure
      .input(
        z.object({
          words: z.array(z.string()).min(1, "Au moins un mot requis"),
          sessionId: z.number().optional(),
          targetLength: z.number().min(50).max(300).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getGlobalSetting, updateDictationSessionText } = await import("./db");
        const { generateDictation } = await import("./gemini");

        // Récupérer la clé API globale
        const geminiApiKey = await getGlobalSetting('geminiApiKey');
        if (!geminiApiKey) {
          throw new Error(
            "Aucune clé API Gemini configurée. Contactez l'administrateur."
          );
        }

        // Récupérer le prompt personnalisé si disponible
        const customPrompt = await getGlobalSetting('promptDictation');

        // Générer la dictée
        const dictationText = await generateDictation(
          input.words,
          geminiApiKey,
          input.targetLength,
          customPrompt || undefined
        );

        // Sauvegarder la dictée générée dans la session si sessionId est fourni
        if (input.sessionId) {
          await updateDictationSessionText(input.sessionId, dictationText);
        }

        return { dictationText };
      }),
    updateDictation: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          dictationText: z.string().min(1, "Texte requis"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { updateDictationSessionText } = await import("./db");
        await updateDictationSessionText(input.sessionId, input.dictationText);
        return { success: true };
      }),
    generateDictationAudio: protectedProcedure
      .input(
        z.object({
          text: z.string().min(1, "Texte requis"),
          sessionId: z.number().optional(),
          voiceId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getGlobalSetting, updateDictationSessionAudio } = await import("./db");
        const { generateSpeech } = await import("./elevenlabs");
        const { storagePut } = await import("./storage");

        // Récupérer les clés API globales
        const elevenlabsApiKey = await getGlobalSetting('elevenlabsApiKey');
        
        // Si pas de clé ElevenLabs, retourner null (utiliser la synthèse du navigateur)
        if (!elevenlabsApiKey) {
          return { audioUrl: null };
        }

        // Récupérer les autres paramètres globaux
        const defaultVoiceId = await getGlobalSetting('elevenlabsVoiceId');
        const enablePausesStr = await getGlobalSetting('enablePauses');
        const enablePauses = enablePausesStr !== 'false';

        // Utiliser la voix sélectionnée ou celle par défaut
        const voiceId = input.voiceId || defaultVoiceId || "21m00Tcm4TlvDq8ikWAM";

        // Générer l'audio avec ElevenLabs
        const audioBuffer = await generateSpeech(
          input.text,
          elevenlabsApiKey,
          voiceId,
          enablePauses
        );

        // Uploader l'audio vers S3
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `${ctx.user.id}-dictations/audio-${Date.now()}-${randomSuffix}.mp3`;
        const { url } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

        // Sauvegarder l'URL audio dans la session si sessionId est fourni
        if (input.sessionId) {
          await updateDictationSessionAudio(input.sessionId, url);
        }

        return { audioUrl: url };
      }),
    deleteSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteDictationSession } = await import("./db");
        await deleteDictationSession(input.sessionId, ctx.user.id);
        return { success: true };
      }),
    toggleFavorite: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { toggleSessionFavorite } = await import("./db");
        await toggleSessionFavorite(input.sessionId, ctx.user.id);
        return { success: true };
      }),
    updateTags: protectedProcedure
      .input(z.object({ 
        sessionId: z.number(),
        tags: z.array(z.string())
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateSessionTags } = await import("./db");
        await updateSessionTags(input.sessionId, ctx.user.id, input.tags);
        return { success: true };
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
        const { getGlobalSetting, createDictationCorrection } = await import("./db");
        const { extractWordsFromImage, analyzeDictationErrors } = await import("./gemini");

        // Récupérer la clé API globale
        const geminiApiKey = await getGlobalSetting('geminiApiKey');
        if (!geminiApiKey) {
          throw new Error(
            "Aucune clé API Gemini configurée. Contactez l'administrateur."
          );
        }

        // Récupérer le prompt d'analyse personnalisé
        const customPrompt = await getGlobalSetting('promptAnalysis');

        // Extraire le texte de l'image de l'utilisateur
        const extractedWords = await extractWordsFromImage(
          input.userImageUrl,
          geminiApiKey
        );
        const extractedUserText = extractedWords.join(" ");

        // Analyser les erreurs
        const analysis = await analyzeDictationErrors(
          input.originalText,
          extractedUserText,
          geminiApiKey,
          customPrompt || undefined
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

  // Admin management - Global settings
  admin: router({
    // Vérifier si l'utilisateur est admin
    isAdmin: protectedProcedure.query(async ({ ctx }) => {
      return { isAdmin: ctx.user.role === 'admin' };
    }),
    
    // Récupérer tous les paramètres globaux (admin only)
    getGlobalSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error("Accès refusé. Vous devez être administrateur.");
      }
      const { getAllGlobalSettings } = await import("./db");
      return getAllGlobalSettings();
    }),
    
    // Sauvegarder un paramètre global (admin only)
    setGlobalSetting: protectedProcedure
      .input(
        z.object({
          key: z.string().min(1),
          value: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error("Accès refusé. Vous devez être administrateur.");
        }
        const { setGlobalSetting } = await import("./db");
        await setGlobalSetting(input.key, input.value);
        return { success: true };
      }),
      
    // Sauvegarder plusieurs paramètres globaux (admin only)
    saveGlobalSettings: protectedProcedure
      .input(
        z.object({
          geminiApiKey: z.string().optional(),
          elevenlabsApiKey: z.string().optional(),
          elevenlabsVoiceId: z.string().optional(),
          enablePauses: z.boolean().optional(),
          wordInterval: z.number().optional(),
          promptExtraction: z.string().optional(),
          promptDictation: z.string().optional(),
          promptAnalysis: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error("Accès refusé. Vous devez être administrateur.");
        }
        const { setGlobalSetting } = await import("./db");
        
        if (input.geminiApiKey !== undefined) {
          await setGlobalSetting('geminiApiKey', input.geminiApiKey);
        }
        if (input.elevenlabsApiKey !== undefined) {
          await setGlobalSetting('elevenlabsApiKey', input.elevenlabsApiKey);
        }
        if (input.elevenlabsVoiceId !== undefined) {
          await setGlobalSetting('elevenlabsVoiceId', input.elevenlabsVoiceId);
        }
        if (input.enablePauses !== undefined) {
          await setGlobalSetting('enablePauses', String(input.enablePauses));
        }
        if (input.wordInterval !== undefined) {
          await setGlobalSetting('wordInterval', String(input.wordInterval));
        }
        if (input.promptExtraction !== undefined) {
          await setGlobalSetting('promptExtraction', input.promptExtraction);
        }
        if (input.promptDictation !== undefined) {
          await setGlobalSetting('promptDictation', input.promptDictation);
        }
        if (input.promptAnalysis !== undefined) {
          await setGlobalSetting('promptAnalysis', input.promptAnalysis);
        }
        
        return { success: true };
      }),
      
    // Récupérer les voix ElevenLabs avec la clé globale (admin only)
    getElevenlabsVoices: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error("Accès refusé. Vous devez être administrateur.");
      }
      const { getGlobalSetting } = await import("./db");
      const { getVoices } = await import("./elevenlabs");
      
      const apiKey = await getGlobalSetting('elevenlabsApiKey');
      
      if (!apiKey) {
        return { voices: [] };
      }
      
      const voices = await getVoices(apiKey);
      return { voices };
    }),
  }),
});

export type AppRouter = typeof appRouter;
