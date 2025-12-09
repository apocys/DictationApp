import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Copy, Download, Loader2, Pause, Play, Upload } from "lucide-react";
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
  const [generatedDictation, setGeneratedDictation] = useState("");
  const [isEditingDictation, setIsEditingDictation] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReadingDictation, setIsReadingDictation] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.8);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [correctionImageFile, setCorrectionImageFile] = useState<File | null>(null);
  const [correctionImagePreview, setCorrectionImagePreview] = useState<string>("");
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(undefined);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isProgressiveMode, setIsProgressiveMode] = useState(false);
  const [dictationLength, setDictationLength] = useState(120);
  const [wordsToUse, setWordsToUse] = useState(words.length);

  const { data: apiKeyData } = trpc.apiKeys.get.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (apiKeyData?.wordInterval) {
      setIntervalSeconds(apiKeyData.wordInterval);
    }
  }, [apiKeyData]);

  // Mettre à jour wordsToUse quand words change
  useEffect(() => {
    setWordsToUse(words.length);
  }, [words.length]);

  const { data: allSessions } = trpc.dictation.getSessions.useQuery(undefined, {
    enabled: !!user,
  });

  // Charger les mots depuis les paramètres d'URL si présents
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionIdParam = params.get('sessionId');
    const wordsParam = params.get('words');
    
    // Prioriser le paramètre words de l'URL (chargement immédiat)
    if (wordsParam) {
      try {
        const decodedWords = JSON.parse(decodeURIComponent(wordsParam));
        if (Array.isArray(decodedWords) && decodedWords.length > 0) {
          setWords(decodedWords);
          if (sessionIdParam) {
            setCurrentSessionId(parseInt(sessionIdParam));
          }
          toast.success(`${decodedWords.length} mots chargés depuis l'historique`);
        }
      } catch (error) {
        console.error('Error parsing words from URL:', error);
      }
    }
    
    // Charger la dictée générée depuis la session si disponible
    if (sessionIdParam && allSessions) {
      const sessionId = parseInt(sessionIdParam);
      const session = allSessions.find((s: any) => s.id === sessionId);
      if (session && session.generatedDictation) {
        setGeneratedDictation(session.generatedDictation);
      }
    }
  }, [location, allSessions]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const extractWordsMutation = trpc.dictation.extractWords.useMutation({
    onSuccess: (data) => {
      setWords(data.words);
      setCurrentWordIndex(0);
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }
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

  const generateAudioMutation = trpc.dictation.generateDictationAudio.useMutation({
    onSuccess: (data) => {
      if (data.audioUrl) {
        // Sauvegarder l'URL audio
        setAudioUrl(data.audioUrl);
        // Jouer l'audio généré par ElevenLabs
        const audio = new Audio(data.audioUrl);
        audio.onended = () => setIsReadingDictation(false);
        audio.play();
        setIsReadingDictation(true);
      } else {
        // Fallback: utiliser la synthèse vocale du navigateur
        useBrowserSpeech();
      }
    },
    onError: (error) => {
      toast.error(`Erreur audio: ${error.message}`);
      // Fallback en cas d'erreur
      useBrowserSpeech();
    },
  });

  const updateDictationMutation = trpc.dictation.updateDictation.useMutation({
    onSuccess: () => {
      toast.success("Dictée sauvegardée");
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
      utterance.rate = speechRate;
      utterance.volume = speechVolume;
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
    if (isProgressiveMode && selectedWords.length === 0) {
      toast.error("Veuillez sélectionner au moins un mot pour le mode progressif");
      return;
    }
    
    // Déterminer les mots à utiliser
    let baseWords = isProgressiveMode ? selectedWords : words;
    
    // Limiter le nombre de mots si nécessaire
    const finalWords = wordsToUse > 0 && wordsToUse < baseWords.length 
      ? baseWords.slice(0, wordsToUse)
      : baseWords;
    
    generateDictationMutation.mutate({ 
      words: finalWords, 
      sessionId: currentSessionId,
      targetLength: dictationLength 
    });
  };

  const useBrowserSpeech = () => {
    if ('speechSynthesis' in window) {
      setIsReadingDictation(true);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(generatedDictation);
      utterance.lang = 'fr-FR';
      utterance.rate = speechRate;
      utterance.volume = speechVolume;
      utterance.onend = () => {
        setIsReadingDictation(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakDictation = () => {
    if (!generatedDictation) {
      toast.error("Veuillez d'abord générer une dictée");
      return;
    }
    // Essayer de générer l'audio avec ElevenLabs
    generateAudioMutation.mutate({ 
      text: generatedDictation,
      sessionId: currentSessionId 
    });
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
            >
              ← Retour
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/settings")}
            >
              Paramètres
            </Button>
          </div>
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
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="space-y-2">
                      <Label htmlFor="dictationLength" className="text-sm font-medium">
                        Longueur de la dictée (mots)
                      </Label>
                      <Input
                        id="dictationLength"
                        type="number"
                        min="50"
                        max="300"
                        value={dictationLength}
                        onChange={(e) => setDictationLength(Number(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600">
                        Nombre approximatif de mots dans la dictée générée (50-300)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wordsToUse" className="text-sm font-medium">
                        Nombre de mots à utiliser
                      </Label>
                      <Input
                        id="wordsToUse"
                        type="number"
                        min="1"
                        max={words.length}
                        value={wordsToUse}
                        onChange={(e) => setWordsToUse(Number(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600">
                        Nombre de mots de la liste à inclure dans la dictée (max: {words.length})
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleGenerateDictation}
                    disabled={generateDictationMutation.isPending}
                    className="w-full"
                  >
                    {generateDictationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération en cours... {wordsToUse}/{words.length} mots
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
                       <div className="relative">
                        <textarea
                          value={generatedDictation}
                          onChange={(e) => setGeneratedDictation(e.target.value)}
                          readOnly={!isEditingDictation}
                          className={`w-full min-h-[200px] p-4 pr-24 border rounded-lg text-sm text-gray-700 resize-y ${
                            isEditingDictation ? 'bg-white border-blue-500' : 'bg-gray-50'
                          }`}
                          style={{ lineHeight: '1.6' }}
                        />
                        <div className="absolute top-2 right-2 flex flex-col gap-2">
                          <Button
                            onClick={() => {
                              if (isEditingDictation) {
                                // Sauvegarder la dictée éditée
                                if (currentSessionId) {
                                  updateDictationMutation.mutate({
                                    sessionId: currentSessionId,
                                    dictationText: generatedDictation
                                  });
                                }
                                setIsEditingDictation(false);
                              } else {
                                setIsEditingDictation(true);
                              }
                            }}
                            variant="outline"
                            size="sm"
                          >
                            {isEditingDictation ? 'Sauvegarder' : 'Éditer'}
                          </Button>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedDictation);
                              toast.success("Texte copié dans le presse-papiers");
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm">Contrôles vocaux</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">
                              Vitesse: {speechRate.toFixed(1)}x
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="2"
                              step="0.1"
                              value={speechRate}
                              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">
                              Volume: {Math.round(speechVolume * 100)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={speechVolume}
                              onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                      
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
                        {audioUrl && (
                          <Button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = audioUrl;
                              link.download = `dictee-${Date.now()}.mp3`;
                              link.click();
                              toast.success("Téléchargement lancé");
                            }}
                            variant="outline"
                            title="Télécharger l'audio"
                          >
                            <Download className="h-4 w-4" />
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>4. Mots extraits ({words.length})</CardTitle>
                      <CardDescription>
                        {isProgressiveMode ? "Sélectionnez les mots pour votre entraînement" : "Cliquez sur un mot pour reprendre la lecture à partir de celui-ci"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isProgressiveMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setIsProgressiveMode(!isProgressiveMode);
                          if (!isProgressiveMode) {
                            setSelectedWords([]);
                          }
                        }}
                      >
                        {isProgressiveMode ? "Mode normal" : "Mode progressif"}
                      </Button>
                      {isProgressiveMode && selectedWords.length > 0 && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedWords([])}
                          variant="ghost"
                        >
                          Désélectionner tout
                        </Button>
                      )}
                    </div>
                  </div>
                  {isProgressiveMode && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                      {selectedWords.length} mot(s) sélectionné(s) pour l'entraînement
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {words.map((word, index) => (
                      <Button
                        key={index}
                        variant={
                          isProgressiveMode
                            ? selectedWords.includes(word)
                              ? "default"
                              : "outline"
                            : index === currentWordIndex
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          if (isProgressiveMode) {
                            if (selectedWords.includes(word)) {
                              setSelectedWords(selectedWords.filter(w => w !== word));
                            } else {
                              setSelectedWords([...selectedWords, word]);
                            }
                          } else {
                            jumpToWord(index);
                          }
                        }}
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
