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
  }, [existingApiKey]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Veuillez entrer une clé API");
      return;
    }
    saveApiKeyMutation.mutate({ geminiApiKey: apiKey, wordInterval });
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
