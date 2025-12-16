import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

// Prompts par défaut
const DEFAULT_PROMPTS = {
  extraction: `Tu es un expert en dictées françaises. Analyse cette image et extrais UNIQUEMENT les mots destinés à être dictés.

RÈGLES D'EXTRACTION :
1. IGNORE complètement : les titres, en-têtes de colonnes (ex: 'Noms', 'Verbes', 'Adjectifs'), numéros de liste, labels de catégories
2. GARDE uniquement : les mots et expressions qui seraient prononcés lors d'une dictée
3. Identifie les mots COMPLETS avec leurs déterminants (ex: 'l'antilope', 'une tapisserie', 'le siècle')
4. Garde les mots composés ensemble (ex: 'aujourd'hui', 'c'est-à-dire')
5. Préserve les accents et la ponctuation interne

FORMAT DE SORTIE :
- Retourne UNIQUEMENT les mots séparés par des virgules
- Pas de numérotation, pas de catégorisation
- Un mot par expression (ex: 'une tapisserie' est un mot complet)`,
  dictation: `Tu es un professeur de français pour enfants de 10 ans. Écris une dictée simple et adaptée à leur niveau.

CONSIGNES PÉDAGOGIQUES :
- Utilise un vocabulaire simple et accessible
- Construis des phrases courtes (10-15 mots maximum par phrase)
- Travaille les accords (singulier/pluriel, masculin/féminin)
- Inclus des verbes au présent et au passé composé
- Évite les structures grammaticales complexes

MOTS À UTILISER : [liste des mots]

LONGUEUR : environ [longueur] mots, utilisant [nombre] mots de la liste.

IMPORTANT : Ta réponse doit contenir UNIQUEMENT le texte de la dictée, rien d'autre. Pas de titre, pas d'introduction, pas de commentaire, pas de formatage markdown (pas d'astérisques **), pas d'explication. Juste le texte brut de la dictée qui commence directement par la première phrase.`,
  analysis: `Tu es un correcteur de dictée expert et bienveillant pour enfants de 10 ans. Compare le texte original avec le texte écrit par l'utilisateur et identifie TOUTES les erreurs.

Analyse les erreurs et retourne un JSON avec cette structure exacte:
{
  "errors": [
    {
      "type": "orthographe|grammaire|conjugaison|accord|ponctuation|autre",
      "original": "mot ou phrase correcte",
      "user": "ce que l'utilisateur a écrit",
      "explanation": "explication pédagogique simple et encourageante de l'erreur",
      "position": numéro_du_mot_dans_le_texte
    }
  ],
  "totalWords": nombre_total_de_mots,
  "correctWords": nombre_de_mots_corrects,
  "feedback": "commentaire général encourageant et constructif sur la performance, adapté à un enfant de 10 ans"
}`
};

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // État pour les paramètres globaux
  const [apiKey, setApiKey] = useState("");
  const [wordInterval, setWordInterval] = useState(5);
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState("");
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [enablePauses, setEnablePauses] = useState(true);
  const [voices, setVoices] = useState<Array<{ id: string; name: string; labels: Record<string, string> }>>([]);
  
  // État pour les prompts éditables
  const [promptExtraction, setPromptExtraction] = useState(DEFAULT_PROMPTS.extraction);
  const [promptDictation, setPromptDictation] = useState(DEFAULT_PROMPTS.dictation);
  const [promptAnalysis, setPromptAnalysis] = useState(DEFAULT_PROMPTS.analysis);

  // Vérifier si l'utilisateur est admin
  const { data: adminData, isLoading: loadingAdmin } = trpc.admin.isAdmin.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Récupérer les paramètres globaux (admin only)
  const { data: globalSettings, isLoading: loadingSettings } = trpc.admin.getGlobalSettings.useQuery(
    undefined,
    { enabled: !!user && adminData?.isAdmin === true }
  );

  // Récupérer les voix ElevenLabs (admin only)
  const { data: voicesData } = trpc.admin.getElevenlabsVoices.useQuery(
    undefined,
    { enabled: !!user && adminData?.isAdmin === true && !!elevenlabsApiKey }
  );

  // Mutation pour sauvegarder les paramètres globaux
  const saveSettingsMutation = trpc.admin.saveGlobalSettings.useMutation({
    onSuccess: () => {
      toast.success("Paramètres globaux sauvegardés avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Charger les paramètres globaux existants
  useEffect(() => {
    if (globalSettings) {
      if (globalSettings.geminiApiKey) setApiKey(globalSettings.geminiApiKey);
      if (globalSettings.wordInterval) setWordInterval(Number(globalSettings.wordInterval));
      if (globalSettings.elevenlabsApiKey) setElevenlabsApiKey(globalSettings.elevenlabsApiKey);
      if (globalSettings.elevenlabsVoiceId) setElevenlabsVoiceId(globalSettings.elevenlabsVoiceId);
      if (globalSettings.enablePauses !== undefined) setEnablePauses(globalSettings.enablePauses === 'true');
      if (globalSettings.promptExtraction) setPromptExtraction(globalSettings.promptExtraction);
      if (globalSettings.promptDictation) setPromptDictation(globalSettings.promptDictation);
      if (globalSettings.promptAnalysis) setPromptAnalysis(globalSettings.promptAnalysis);
    }
  }, [globalSettings]);

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
    saveSettingsMutation.mutate({
      geminiApiKey: apiKey,
      wordInterval,
      elevenlabsApiKey: elevenlabsApiKey.trim() || undefined,
      elevenlabsVoiceId,
      enablePauses,
      promptExtraction,
      promptDictation,
      promptAnalysis,
    });
  };

  const resetPrompt = (type: 'extraction' | 'dictation' | 'analysis') => {
    switch (type) {
      case 'extraction':
        setPromptExtraction(DEFAULT_PROMPTS.extraction);
        break;
      case 'dictation':
        setPromptDictation(DEFAULT_PROMPTS.dictation);
        break;
      case 'analysis':
        setPromptAnalysis(DEFAULT_PROMPTS.analysis);
        break;
    }
    toast.success("Prompt réinitialisé");
  };

  if (authLoading || loadingAdmin || loadingSettings) {
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

  // Vérifier si l'utilisateur est admin
  if (!adminData?.isAdmin) {
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
          </div>
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div>
                  <CardTitle className="text-orange-700">Accès restreint</CardTitle>
                  <CardDescription className="text-orange-600">
                    Cette page est réservée aux administrateurs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                Les paramètres de l'application (clés API, prompts) sont gérés globalement par les administrateurs.
                Vous n'avez pas besoin de configurer quoi que ce soit pour utiliser l'application.
              </p>
              <Button
                onClick={() => setLocation("/")}
                className="mt-4"
              >
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container max-w-3xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            ← Retour
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Paramètres Administrateur</h1>
              <p className="text-gray-600 mt-1">
                Configuration globale de l'application (accessible uniquement aux administrateurs)
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clé API Gemini</CardTitle>
            <CardDescription>
              Clé API globale utilisée par tous les utilisateurs.
              Obtenez une clé sur{" "}
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
              <Label htmlFor="wordInterval">Intervalle par défaut entre les mots (secondes)</Label>
              <Input
                id="wordInterval"
                type="number"
                min="1"
                max="60"
                value={wordInterval}
                onChange={(e) => setWordInterval(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>ElevenLabs (Synthèse vocale)</CardTitle>
            <CardDescription>
              Clé API globale pour la synthèse vocale. Obtenez une clé sur{" "}
              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                ElevenLabs
              </a>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="elevenlabsApiKey">Clé API ElevenLabs</Label>
              <Input
                id="elevenlabsApiKey"
                type="password"
                placeholder="sk_..."
                value={elevenlabsApiKey}
                onChange={(e) => setElevenlabsApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="elevenlabsVoiceId">Voix par défaut</Label>
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
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="enablePauses" className="font-medium">Activer les pauses</Label>
                <p className="text-sm text-gray-500">Pauses après virgules (1s) et points (1.5s)</p>
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Prompts personnalisables</CardTitle>
            <CardDescription>
              Modifiez les prompts utilisés par l'IA pour l'extraction, la génération et l'analyse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Prompt d'extraction de mots</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetPrompt('extraction')}
                >
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                value={promptExtraction}
                onChange={(e) => setPromptExtraction(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Prompt de génération de dictée</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetPrompt('dictation')}
                >
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                value={promptDictation}
                onChange={(e) => setPromptDictation(e.target.value)}
                className="min-h-[250px] font-mono text-xs"
              />
              <p className="text-xs text-gray-500">
                Variables disponibles : [liste des mots], [longueur], [nombre]
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Prompt d'analyse des erreurs</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetPrompt('analysis')}
                >
                  Réinitialiser
                </Button>
              </div>
              <Textarea
                value={promptAnalysis}
                onChange={(e) => setPromptAnalysis(e.target.value)}
                className="min-h-[250px] font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="w-full"
          >
            {saveSettingsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              "Sauvegarder les paramètres globaux"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
