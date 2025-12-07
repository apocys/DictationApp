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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: "Extrais tous les mots de cette image. Retourne uniquement les mots séparés par des virgules, sans numérotation ni formatage supplémentaire. Si l'image contient une liste de mots pour une dictée, extrais chaque mot individuellement.",
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
