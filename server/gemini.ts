import axios from "axios";

/**
 * Extrait les mots d'une image en utilisant l'API Gemini 2.5 Flash
 * @param imageUrl URL de l'image à analyser
 * @param apiKey Clé API Gemini
 * @returns Liste des mots extraits
 */
export async function extractWordsFromImage(
  imageUrl: string,
  apiKey: string
): Promise<string[]> {
  try {
    // Télécharger l'image et la convertir en base64
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const base64Image = Buffer.from(imageResponse.data).toString("base64");
    const mimeType = imageResponse.headers["content-type"] || "image/jpeg";

    // Appeler l'API Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: "Tu es un expert en dictées françaises. Analyse cette image et extrais UNIQUEMENT les mots destinés à être dictés.\n\nRÈGLES D'EXTRACTION :\n1. IGNORE complètement : les titres, en-têtes de colonnes (ex: 'Noms', 'Verbes', 'Adjectifs'), numéros de liste, labels de catégories\n2. GARDE uniquement : les mots et expressions qui seraient prononcés lors d'une dictée\n3. Identifie les mots COMPLETS avec leurs déterminants (ex: 'l'antilope', 'une tapisserie', 'le siècle')\n4. Garde les mots composés ensemble (ex: 'aujourd'hui', 'c'est-à-dire')\n5. Préserve les accents et la ponctuation interne\n\nFORMAT DE SORTIE :\n- Retourne UNIQUEMENT les mots séparés par des virgules\n- Pas de numérotation, pas de catégorisation\n- Un mot par expression (ex: 'une tapisserie' est un mot complet)\n\nExemple : Si l'image contient un tableau avec 'Noms : une maison, le jardin', tu retournes : une maison, le jardin",
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Extraire le texte de la réponse
    const text =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Nettoyer et séparer les mots
    const words = text
      .split(/[,\n]+/)
      .map((word: string) => word.trim())
      .filter((word: string) => word.length > 0);

    return words;
  } catch (error) {
    console.error("Error extracting words from image:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Gemini API error: ${error.response?.data?.error?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Génère une dictée complète basée sur une liste de mots
 * @param words Liste des mots à utiliser
 * @param apiKey Clé API Gemini
 * @returns Texte de la dictée générée
 */
async function tryGenerateDictation(
  words: string[],
  apiKey: string,
  useSimplePrompt: boolean = false
): Promise<string> {
  const wordList = words.join(", ");
  
  const prompt = useSimplePrompt
    ? `Écris un court texte en français (environ 80 mots) qui utilise ces mots : ${wordList}. Réponds uniquement avec le texte, sans titre ni formatage.`
    : `Écris une dictée en français d'environ 100-150 mots qui utilise TOUS les mots suivants de manière naturelle et cohérente : ${wordList}. La dictée doit être un texte continu et fluide, pas une liste de phrases séparées. Assure-toi que tous les mots de la liste sont utilisés au moins une fois.

IMPORTANT : Ta réponse doit contenir UNIQUEMENT le texte de la dictée, rien d'autre. Pas de titre, pas d'introduction, pas de commentaire, pas de formatage markdown (pas d'astérisques **), pas d'explication. Juste le texte brut de la dictée qui commence directement par la première phrase.`;
  
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: useSimplePrompt ? 0.5 : 0.7,
        maxOutputTokens: 1024,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  console.log('=== Gemini generateDictation Response ===');
  console.log('Using simple prompt:', useSimplePrompt);
  console.log('Candidates:', response.data.candidates);
  console.log('First candidate:', response.data.candidates?.[0]);
  
  // Vérifier le finishReason
  const finishReason = response.data.candidates?.[0]?.finishReason;
  console.log('Finish reason:', finishReason);
  
  if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
    console.error('Content blocked by safety filters:', finishReason);
    throw new Error(`Contenu bloqué par les filtres de sécurité (${finishReason}). Essayez avec moins de mots.`);
  }
  
  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log('Final extracted text:', text);
  console.log('Text length:', text.length);
  console.log('==========================================');
  
  return text;
}

export async function generateDictation(
  words: string[],
  apiKey: string
): Promise<string> {
  try {
    // Première tentative avec le prompt complet
    let text = await tryGenerateDictation(words, apiKey, false);
    
    // Si le texte est vide, essayer avec un prompt plus simple
    if (!text || text.trim().length === 0) {
      console.log('First attempt returned empty text, trying with simple prompt...');
      text = await tryGenerateDictation(words, apiKey, true);
    }
    
    // Vérifier si Gemini a retourné un texte vide après les deux tentatives
    if (!text || text.trim().length === 0) {
      throw new Error('Gemini a retourné un texte vide après plusieurs tentatives. Vérifiez votre quota API ou réessayez plus tard.');
    }
    
    return text.trim();
  } catch (error) {
    console.error("Error generating dictation:", error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Erreur API Gemini: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Compare le texte original avec le texte écrit par l'utilisateur et identifie les erreurs
 * @param originalText Texte de la dictée originale
 * @param userText Texte écrit par l'utilisateur
 * @param apiKey Clé API Gemini
 * @returns Analyse détaillée des erreurs
 */
export async function analyzeDictationErrors(
  originalText: string,
  userText: string,
  apiKey: string
): Promise<{
  errors: Array<{
    type: string;
    original: string;
    user: string;
    explanation: string;
    position: number;
  }>;
  score: number;
  totalWords: number;
  correctWords: number;
  feedback: string;
}> {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Tu es un correcteur de dictée expert. Compare le texte original avec le texte écrit par l'utilisateur et identifie TOUTES les erreurs.

TEXTE ORIGINAL:
${originalText}

TEXTE DE L'UTILISATEUR:
${userText}

Analyse les erreurs et retourne un JSON avec cette structure exacte:
{
  "errors": [
    {
      "type": "orthographe|grammaire|conjugaison|accord|ponctuation|autre",
      "original": "mot ou phrase correcte",
      "user": "ce que l'utilisateur a écrit",
      "explanation": "explication pédagogique détaillée de l'erreur",
      "position": numéro_du_mot_dans_le_texte
    }
  ],
  "totalWords": nombre_total_de_mots,
  "correctWords": nombre_de_mots_corrects,
  "feedback": "commentaire général encourageant et constructif sur la performance"
}

Sois précis et pédagogique dans tes explications. Retourne UNIQUEMENT le JSON, sans texte avant ou après.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const text =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extraire le JSON de la réponse
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Format de réponse invalide");
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Calculer le score sur 100
    const score = analysis.totalWords > 0 
      ? Math.round((analysis.correctWords / analysis.totalWords) * 100)
      : 0;

    return {
      errors: analysis.errors || [],
      score,
      totalWords: analysis.totalWords || 0,
      correctWords: analysis.correctWords || 0,
      feedback: analysis.feedback || "Continuez vos efforts !",
    };
  } catch (error) {
    console.error("Error analyzing dictation errors:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Gemini API error: ${error.response?.data?.error?.message || error.message}`
      );
    }
    throw error;
  }
}
