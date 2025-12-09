import axios from "axios";

/**
 * Génère un fichier audio à partir d'un texte en utilisant l'API ElevenLabs
 * @param text Texte à convertir en audio
 * @param apiKey Clé API ElevenLabs
 * @param voiceId ID de la voix à utiliser
 * @returns Buffer contenant le fichier audio MP3
 */
/**
 * Récupère la liste des voix disponibles depuis le compte ElevenLabs
 * @param apiKey Clé API ElevenLabs
 * @returns Liste des voix avec id, nom et langue
 */
export async function getVoices(apiKey: string): Promise<Array<{ id: string; name: string; labels: Record<string, string> }>> {
  try {
    const response = await axios.get(
      "https://api.elevenlabs.io/v1/voices",
      {
        headers: {
          "xi-api-key": apiKey
        }
      }
    );
    
    return response.data.voices.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      labels: voice.labels || {}
    }));
  } catch (error) {
    console.error("Error fetching ElevenLabs voices:", error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail?.message || error.message;
      throw new Error(`Erreur API ElevenLabs: ${errorMessage}`);
    }
    throw error;
  }
}

export async function generateSpeech(
  text: string,
  apiKey: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM"
): Promise<Buffer> {
  try {
    // Ajouter des pauses aux virgules et aux points
    let textWithPauses = text.replace(/,/g, ',<break time="1s" />');
    textWithPauses = textWithPauses.replace(/\./g, '.<break time="1.5s" />');
    
    console.log('=== ElevenLabs generateSpeech ===');
    console.log('Voice ID:', voiceId);
    console.log('Original text length:', text.length);
    console.log('Text with pauses length:', textWithPauses.length);
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: textWithPauses,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey
        },
        responseType: "arraybuffer"
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Audio size:', response.data.byteLength, 'bytes');
    console.log('====================================');
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error generating speech with ElevenLabs:", error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail?.message || error.message;
      throw new Error(`Erreur API ElevenLabs: ${errorMessage}`);
    }
    throw error;
  }
}
