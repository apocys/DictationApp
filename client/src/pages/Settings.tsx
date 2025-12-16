import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [apiKey, setApiKey] = useState("");
  const [wordInterval, setWordInterval] = useState(5);
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState("");
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [enablePauses, setEnablePauses] = useState(true);
  const [voices, setVoices] = useState<Array<{ id: string; name: string; labels: Record<string, string> }>>([]); 

  const { data: voicesData } = trpc.apiKeys.getElevenlabsVoices.useQuery(
    undefined,
    {
      enabled: !!user && !!elevenlabsApiKey,
    }
  );

  const { data: existingApiKey, isLoading: loadingApiKey } = trpc.apiKeys.get.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  const saveApiKeyMutation = trpc.apiKeys.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success("Clé API sauvegardée avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  useEffect(() => {
    if (existingApiKey?.geminiApiKey) {
      setApiKey(existingApiKey.geminiApiKey);
    }
    if (existingApiKey?.wordInterval) {
      setWordInterval(existingApiKey.wordInterval);
    }
    if (existingApiKey?.elevenlabsApiKey) {
      setElevenlabsApiKey(existingApiKey.elevenlabsApiKey);
    }
    if (existingApiKey?.elevenlabsVoiceId) {
      setElevenlabsVoiceId(existingApiKey.elevenlabsVoiceId);
    }
    if (existingApiKey?.enablePauses !== undefined) {
      setEnablePauses(existingApiKey.enablePauses);
    }
  }, [existingApiKey]);

  useEffect(() => {
    if (voicesData?.voices) {
      setVoices(voicesData.voices);
    }
  }, [voicesData]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Veuillez entrer une clé API Gemini");
      return;
    }
    saveApiKeyMutation.mutate({ 
      geminiApiKey: apiKey, 
      wordInterval,
      elevenlabsApiKey: elevenlabsApiKey.trim() || undefined,
      elevenlabsVoiceId,
      enablePauses
    });
  };

  if (authLoading || loadingApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container max-w-2xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            ← Retour
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600 mt-2">
            Configurez votre clé API Gemini pour utiliser l'application
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clé API Gemini</CardTitle>
            <CardDescription>
              Entrez votre clé API Gemini 2.5 Flash pour extraire les mots des images.
              Vous pouvez obtenir une clé API sur{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Clé API</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="AIza..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wordInterval">Intervalle entre les mots (secondes)</Label>
              <Input
                id="wordInterval"
                type="number"
                min="1"
                max="60"
                value={wordInterval}
                onChange={(e) => setWordInterval(Number(e.target.value))}
              />
              <p className="text-sm text-gray-500">
                Délai entre chaque mot lors de la lecture (1-60 secondes)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>ElevenLabs (Synthèse vocale)</CardTitle>
            <CardDescription>
              Configurez ElevenLabs pour générer la voix de la dictée. Vous pouvez obtenir une clé API sur{" "}
              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                ElevenLabs
              </a>
              . (Optionnel - si non configuré, la synthèse vocale du navigateur sera utilisée)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="elevenlabsApiKey">Clé API ElevenLabs (optionnel)</Label>
              <Input
                id="elevenlabsApiKey"
                type="password"
                placeholder="sk_..."
                value={elevenlabsApiKey}
                onChange={(e) => setElevenlabsApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="elevenlabsVoiceId">Voix</Label>
              <select
                id="elevenlabsVoiceId"
                value={elevenlabsVoiceId}
                onChange={(e) => setElevenlabsVoiceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!elevenlabsApiKey || voices.length === 0}
              >
                {voices.length === 0 ? (
                  <option value="">Entrez d'abord votre clé API et sauvegardez</option>
                ) : (
                  voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} {voice.labels.accent ? `(${voice.labels.accent})` : ''}
                    </option>
                  ))
                )}
              </select>
              <p className="text-sm text-gray-500">
                Sélectionnez la voix pour la lecture de la dictée
              </p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="enablePauses" className="font-medium">Activer les pauses</Label>
                <p className="text-sm text-gray-500">Ajoute des pauses après les virgules (1s) et les points (1.5s)</p>
              </div>
              <button
                id="enablePauses"
                type="button"
                onClick={() => setEnablePauses(!enablePauses)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enablePauses ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enablePauses ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button
            onClick={handleSave}
            disabled={saveApiKeyMutation.isPending}
            className="w-full"
          >
            {saveApiKeyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
                </>
              ) : (
                "Sauvegarder"
              )}
            </Button>
          </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Avancé</CardTitle>
            <CardDescription>
              Prompts système utilisés par l'application (lecture seule)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Prompt d'extraction de mots</Label>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {`Tu es un expert en dictées françaises. Analyse cette image et extrais UNIQUEMENT les mots destinés à être dictés.

RÈGLES D'EXTRACTION :
1. IGNORE complètement : les titres, en-têtes de colonnes (ex: 'Noms', 'Verbes', 'Adjectifs'), numéros de liste, labels de catégories
2. GARDE uniquement : les mots et expressions qui seraient prononcés lors d'une dictée
3. Identifie les mots COMPLETS avec leurs déterminants (ex: 'l'antilope', 'une tapisserie', 'le siècle')
4. Garde les mots composés ensemble (ex: 'aujourd'hui', 'c'est-à-dire')
5. Préserve les accents et la ponctuation interne

FORMAT DE SORTIE :
- Retourne UNIQUEMENT les mots séparés par des virgules
- Pas de numérotation, pas de catégorisation
- Un mot par expression (ex: 'une tapisserie' est un mot complet)`}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Prompt de génération de dictée (complet)</Label>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {`Écris une dictée en français d'environ 100-150 mots qui utilise TOUS les mots suivants de manière naturelle et cohérente : [liste des mots]. La dictée doit être un texte continu et fluide, pas une liste de phrases séparées. Assure-toi que tous les mots de la liste sont utilisés au moins une fois.

IMPORTANT : Ta réponse doit contenir UNIQUEMENT le texte de la dictée, rien d'autre. Pas de titre, pas d'introduction, pas de commentaire, pas de formatage markdown (pas d'astérisques **), pas d'explication. Juste le texte brut de la dictée qui commence directement par la première phrase.`}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Prompt de génération de dictée (simplifié - fallback)</Label>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {`Écris un court texte en français (environ 80 mots) qui utilise ces mots : [liste des mots]. Réponds uniquement avec le texte, sans titre ni formatage.`}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Prompt d'analyse des erreurs</Label>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {`Tu es un correcteur de dictée expert. Compare le texte original avec le texte écrit par l'utilisateur et identifie TOUTES les erreurs.

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
}`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
