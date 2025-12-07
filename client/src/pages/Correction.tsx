import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { AlertCircle, CheckCircle2, Loader2, Upload, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Correction() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [originalText, setOriginalText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [correctionResult, setCorrectionResult] = useState<any>(null);

  const analyzeMutation = trpc.correction.analyze.useMutation({
    onSuccess: (data) => {
      setCorrectionResult(data);
      toast.success("Correction terminée !");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!imageFile) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (!originalText.trim()) {
      toast.error("Veuillez entrer le texte de la dictée originale");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'upload");
      }

      const { url } = await response.json();
      
      analyzeMutation.mutate({
        originalText,
        userImageUrl: url,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload de l'image");
    }
  };

  const getErrorTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      orthographe: "bg-red-100 text-red-800",
      grammaire: "bg-orange-100 text-orange-800",
      conjugaison: "bg-yellow-100 text-yellow-800",
      accord: "bg-blue-100 text-blue-800",
      ponctuation: "bg-purple-100 text-purple-800",
      autre: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors.autre;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connexion requise</CardTitle>
            <CardDescription>
              Vous devez être connecté pour corriger vos dictées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Se connecter</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Correction de dictée</h1>
              <p className="text-gray-600 mt-2">
                Uploadez votre dictée rédigée pour obtenir une correction détaillée
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation("/history")}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Historique
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
              >
                ← Retour
              </Button>
            </div>
          </div>

          {!correctionResult ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>1. Texte de la dictée originale</CardTitle>
                  <CardDescription>
                    Collez le texte de la dictée que vous avez rédigée
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Entrez le texte de la dictée originale..."
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    rows={6}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>2. Photo de votre dictée</CardTitle>
                  <CardDescription>
                    Uploadez une photo claire de votre dictée rédigée
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dictation-image">Image</Label>
                    <Input
                      id="dictation-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                  {imagePreview && (
                    <div className="border rounded-lg p-4">
                      <img
                        src={imagePreview}
                        alt="Prévisualisation"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleUpload}
                    disabled={analyzeMutation.isPending || !imageFile || !originalText}
                    className="w-full"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Analyser ma dictée
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Score Card */}
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Votre score</p>
                      <p className={`text-6xl font-bold ${getScoreColor(correctionResult.score)}`}>
                        {correctionResult.score}
                        <span className="text-2xl">/100</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {correctionResult.correctWords} / {correctionResult.totalWords} mots corrects
                      </p>
                    </div>
                    <div className="text-right">
                      {correctionResult.score >= 90 ? (
                        <CheckCircle2 className="h-20 w-20 text-green-500" />
                      ) : (
                        <AlertCircle className="h-20 w-20 text-orange-500" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">{correctionResult.feedback}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Errors List */}
              {correctionResult.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Erreurs détectées ({correctionResult.errors.length})</CardTitle>
                    <CardDescription>
                      Analyse détaillée de vos erreurs pour vous aider à progresser
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {correctionResult.errors.map((error: any, index: number) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <Badge className={getErrorTypeColor(error.type)}>
                            {error.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Position: mot #{error.position}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Vous avez écrit:</p>
                            <p className="text-red-600 font-medium line-through">{error.user}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Correction:</p>
                            <p className="text-green-600 font-medium">{error.original}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-sm text-gray-700">{error.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Extracted Text Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparaison des textes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600">Texte original</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border">
                      <p className="text-sm whitespace-pre-wrap">{originalText}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Votre texte (extrait de l'image)</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border">
                      <p className="text-sm whitespace-pre-wrap">{correctionResult.extractedUserText}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setCorrectionResult(null);
                    setImageFile(null);
                    setImagePreview("");
                    setOriginalText("");
                  }}
                  className="flex-1"
                >
                  Nouvelle correction
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/history")}
                  className="flex-1"
                >
                  Voir l'historique
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
