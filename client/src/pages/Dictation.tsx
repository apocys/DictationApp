import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Loader2, Pause, Play, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Dictation() {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [generatedDictation, setGeneratedDictation] = useState<string>("");
  const [isReadingDictation, setIsReadingDictation] = useState(false);
  const [correctionImageFile, setCorrectionImageFile] = useState<File | null>(null);
  const [correctionImagePreview, setCorrectionImagePreview] = useState<string>("");

  const { data: apiKeyData } = trpc.apiKeys.get.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (apiKeyData?.wordInterval) {
      setIntervalSeconds(apiKeyData.wordInterval);
    }
  }, [apiKeyData]);

  // Charger les mots depuis les paramètres d'URL si présents
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const wordsParam = params.get('words');
    if (wordsParam) {
      try {
        const decodedWords = JSON.parse(decodeURIComponent(wordsParam));
        if (Array.isArray(decodedWords) && decodedWords.length > 0) {
          setWords(decodedWords);
          toast.success(`${decodedWords.length} mots chargés depuis l'historique`);
        }
      } catch (error) {
        console.error('Error parsing words from URL:', error);
      }
    }
  }, [location]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const extractWordsMutation = trpc.dictation.extractWords.useMutation({
    onSuccess: (data) => {
      setWords(data.words);
      setCurrentWordIndex(0);
      toast.success(`${data.words.length} mots extraits avec succès`);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const generateDictationMutation = trpc.dictation.generateDictation.useMutation({
    onSuccess: (data) => {
      console.log('=== generateDictation onSuccess ===');
      console.log('Full data object:', data);
      console.log('data.dictationText:', data.dictationText);
      console.log('Type of data:', typeof data);
      console.log('Keys in data:', Object.keys(data));
      
      if (data && data.dictationText) {
        setGeneratedDictation(data.dictationText);
        toast.success("Dictée générée avec succès");
      } else {
        console.error('dictationText is missing or undefined!');
        toast.error("Erreur: le texte de la dictée n'a pas été reçu");
      }
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const analyzeCorrectionMutation = trpc.correction.analyze.useMutation({
    onSuccess: (data) => {
      toast.success("Correction terminée !");
      setLocation("/history");
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
    console.log('handleUpload called');
    if (!imageFile) {
      console.log('No image file');
      toast.error("Veuillez sélectionner une image");
      return;
    }

    console.log('Image file:', imageFile.name);
    // Upload to S3
    const formData = new FormData();
    formData.append("file", imageFile);

    try {
      console.log('Uploading to /api/upload...');
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log('Upload response status:', response.status);
      if (!response.ok) {
        throw new Error("Erreur lors de l'upload");
      }

      const { url } = await response.json();
      console.log('Image uploaded to:', url);
      extractWordsMutation.mutate({ imageUrl: url });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload de l'image");
    }
  };

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.8;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startReading = () => {
    if (words.length === 0) return;
    setIsPlaying(true);
    speakWord(words[currentWordIndex] || "");
  };

  const pauseReading = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    window.speechSynthesis.cancel();
  };

  const handleGenerateDictation = () => {
    if (words.length === 0) {
      toast.error("Veuillez d'abord extraire des mots d'une image");
      return;
    }
    generateDictationMutation.mutate({ words });
  };

  const speakDictation = () => {
    if (!generatedDictation) {
      toast.error("Veuillez d'abord générer une dictée");
      return;
    }
    if ('speechSynthesis' in window) {
      setIsReadingDictation(true);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(generatedDictation);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.8;
      utterance.onend = () => {
        setIsReadingDictation(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopDictation = () => {
    setIsReadingDictation(false);
    window.speechSynthesis.cancel();
  };

  const handleCorrectionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCorrectionImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCorrectionImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadCorrection = async () => {
    if (!correctionImageFile) {
      toast.error("Veuillez sélectionner une image de votre dictée");
      return;
    }

    if (!generatedDictation) {
      toast.error("Veuillez d'abord générer une dictée");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", correctionImageFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'upload");
      }

      const { url } = await response.json();
      
      analyzeCorrectionMutation.mutate({
        originalText: generatedDictation,
        userImageUrl: url,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload de l'image");
    }
  };

  const jumpToWord = (index: number) => {
    setCurrentWordIndex(index);
    if (isPlaying) {
      pauseReading();
    }
  };

  useEffect(() => {
    if (isPlaying && words.length > 0) {
      speakWord(words[currentWordIndex] || "");
      
      const timer = setInterval(() => {
        setCurrentWordIndex((prev) => {
          const next = prev + 1;
          if (next >= words.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, intervalSeconds * 1000);
      
      intervalRef.current = timer;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, intervalSeconds, words, currentWordIndex]);

  if (authLoading) {
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
      <div className="container max-w-4xl">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dictée Interactive</h1>
            <p className="text-gray-600 mt-2">
              Uploadez une image pour extraire et écouter les mots
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/settings")}
          >
            Paramètres
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>1. Uploader une image</CardTitle>
              <CardDescription>
                Sélectionnez une image contenant les mots de la dictée
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
              {imagePreview && (
                <div className="border rounded-lg p-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto"
                  />
                </div>
              )}
              <Button
                onClick={handleUpload}
                disabled={!imageFile || extractWordsMutation.isPending}
                className="w-full"
              >
                {extractWordsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extraction en cours...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Extraire les mots
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Reading Section */}
          {words.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>2. Configurer la lecture</CardTitle>
                  <CardDescription>
                    Ajustez l'intervalle entre chaque mot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Intervalle: {intervalSeconds} secondes</Label>
                    <Slider
                      value={[intervalSeconds]}
                      onValueChange={(value) => setIntervalSeconds(value[0] || 5)}
                      min={1}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    {!isPlaying ? (
                      <Button onClick={startReading} className="flex-1">
                        <Play className="mr-2 h-4 w-4" />
                        Lire
                      </Button>
                    ) : (
                      <Button onClick={pauseReading} variant="secondary" className="flex-1">
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>3. Générer une dictée</CardTitle>
                  <CardDescription>
                    Créez une dictée complète utilisant tous les mots extraits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleGenerateDictation}
                    disabled={generateDictationMutation.isPending}
                    className="w-full"
                  >
                    {generateDictationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      "Générer une dictée"
                    )}
                  </Button>
                  <div className="text-xs text-gray-500 mt-2">
                    Debug: generatedDictation = {generatedDictation ? `"${generatedDictation.substring(0, 50)}..."` : "null/empty"}
                  </div>
                  {generatedDictation && (
                    <>
                      <textarea
                        value={generatedDictation}
                        readOnly
                        className="w-full min-h-[200px] p-4 border rounded-lg bg-gray-50 text-sm text-gray-700 resize-y"
                        style={{ lineHeight: '1.6' }}
                      />
                      <div className="flex gap-2">
                        {!isReadingDictation ? (
                          <Button onClick={speakDictation} className="flex-1">
                            <Play className="mr-2 h-4 w-4" />
                            Lire la dictée
                          </Button>
                        ) : (
                          <Button onClick={stopDictation} variant="secondary" className="flex-1">
                            <Pause className="mr-2 h-4 w-4" />
                            Arrêter
                          </Button>
                        )}
                      </div>
                      <div className="mt-4 p-4 border-2 border-dashed rounded-lg">
                        <h4 className="font-medium mb-2">Uploadez votre dictée rédigée</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Prenez une photo de votre dictée et uploadez-la pour obtenir une correction détaillée
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleCorrectionImageChange}
                          className="mb-2"
                        />
                        {correctionImagePreview && (
                          <div className="mb-2 border rounded p-2">
                            <img
                              src={correctionImagePreview}
                              alt="Prévisualisation"
                              className="max-w-full h-auto rounded"
                            />
                          </div>
                        )}
                        <Button
                          onClick={handleUploadCorrection}
                          disabled={analyzeCorrectionMutation.isPending || !correctionImageFile}
                          className="w-full"
                        >
                          {analyzeCorrectionMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyse en cours...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Corriger ma dictée
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>4. Mots extraits ({words.length})</CardTitle>
                  <CardDescription>
                    Cliquez sur un mot pour reprendre la lecture à partir de celui-ci
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {words.map((word, index) => (
                      <Button
                        key={index}
                        variant={index === currentWordIndex ? "default" : "outline"}
                        onClick={() => jumpToWord(index)}
                        className="h-auto py-3"
                      >
                        {index + 1}. {word}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
