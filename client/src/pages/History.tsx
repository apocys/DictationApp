import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Loader2, TrendingUp, Calendar, Target } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Star, Trash2, Tag, Search } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const utils = trpc.useUtils();

  const { data: corrections, isLoading: correctionsLoading } = trpc.correction.getHistory.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: dictations, isLoading: dictationsLoading } = trpc.dictation.getSessions.useQuery(undefined, {
    enabled: !!user,
  });

  const deleteSessionMutation = trpc.dictation.deleteSession.useMutation({
    onSuccess: () => {
      utils.dictation.getSessions.invalidate();
      toast.success("Session supprimée avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const toggleFavoriteMutation = trpc.dictation.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.dictation.getSessions.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateTagsMutation = trpc.dictation.updateTags.useMutation({
    onSuccess: () => {
      utils.dictation.getSessions.invalidate();
      toast.success("Tags mis à jour");
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const isLoading = correctionsLoading || dictationsLoading;

  // Combiner les dictées et corrections dans l'historique
  const history = [
    ...(dictations || []).map((d: any) => {
      let parsedWords = [];
      try {
        parsedWords = JSON.parse(d.words);
      } catch (error) {
        console.error('Error parsing words for dictation:', d.id, error);
        // Si le parsing échoue, essayer de split par virgule comme fallback
        parsedWords = typeof d.words === 'string' ? d.words.split(',').map((w: string) => w.trim()) : [];
      }
      return {
        ...d,
        type: 'dictation' as const,
        words: parsedWords,
      };
    }),
    ...(corrections || []).map((c: any) => ({
      ...c,
      type: 'correction' as const,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filtrer l'historique selon la recherche et les filtres
  const filteredHistory = history.filter((item: any) => {
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesWords = item.words && item.words.some((w: string) => w.toLowerCase().includes(query));
      const matchesTags = item.tags && JSON.parse(item.tags || '[]').some((t: string) => t.toLowerCase().includes(query));
      if (!matchesWords && !matchesTags) return false;
    }

    // Filtre par favoris
    if (showFavoritesOnly && item.type === 'dictation' && item.isFavorite !== 1) {
      return false;
    }

    // Filtre par tag
    if (selectedTag && item.type === 'dictation') {
      const tags = JSON.parse(item.tags || '[]');
      if (!tags.includes(selectedTag)) return false;
    }

    return true;
  });

  // Extraire tous les tags uniques
  const allTags = Array.from(new Set(
    (dictations || [])
      .flatMap((d: any) => {
        try {
          return JSON.parse(d.tags || '[]');
        } catch {
          return [];
        }
      })
      .filter(Boolean)
  )) as string[];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-blue-100 text-blue-800";
    if (score >= 50) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Bien";
    if (score >= 50) return "Moyen";
    return "À améliorer";
  };

  const calculateStats = () => {
    if (!history || history.length === 0) return null;

    const correctionsOnly = history.filter((h: any) => h.type === 'correction');
    const totalCorrections = correctionsOnly.length;
    const totalDictations = history.filter((h: any) => h.type === 'dictation').length;
    
    if (totalCorrections === 0) {
      return {
        totalCorrections: 0,
        totalDictations,
        averageScore: 0,
        bestScore: 0,
        latestScore: 0,
        trend: "stable",
      };
    }

    const averageScore = Math.round(
      correctionsOnly.reduce((sum: number, h: any) => sum + h.score, 0) / totalCorrections
    );
    const bestScore = Math.max(...correctionsOnly.map((h: any) => h.score));
    const latestScore = correctionsOnly[0]?.score || 0;
    
    // Calculer la tendance (dernières 5 vs précédentes)
    const recent = correctionsOnly.slice(0, Math.min(5, correctionsOnly.length));
    const older = correctionsOnly.slice(5, Math.min(10, correctionsOnly.length));
    
    let trend = "stable";
    if (older.length > 0) {
      const recentAvg = recent.reduce((sum: number, h: any) => sum + h.score, 0) / recent.length;
      const olderAvg = older.reduce((sum: number, h: any) => sum + h.score, 0) / older.length;
      if (recentAvg > olderAvg + 5) trend = "up";
      else if (recentAvg < olderAvg - 5) trend = "down";
    }

    return {
      totalCorrections,
      averageScore,
      bestScore,
      latestScore,
      trend,
    };
  };

  const stats = calculateStats();

  if (authLoading || isLoading) {
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
              Vous devez être connecté pour voir votre historique
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
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Historique & Progression</h1>
              <p className="text-gray-600 mt-2">
                Suivez votre évolution et analysez vos performances
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/correction")}
            >
              ← Retour
            </Button>
          </div>

          {/* Barre de recherche et filtres */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par mots ou tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showFavoritesOnly ? "default" : "outline"}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className="flex items-center gap-2"
                >
                  <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  Favoris
                </Button>
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    Tags:
                  </span>
                  <Button
                    variant={selectedTag === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(null)}
                  >
                    Tous
                  </Button>
                  {allTags.map((tag) => (
                    <Button
                      key={tag}
                      variant={selectedTag === tag ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTag(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalCorrections}</p>
                      <p className="text-xs text-gray-500 mt-1">dictées corrigées</p>
                    </div>
                    <Calendar className="h-10 w-10 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Moyenne</p>
                      <p className="text-3xl font-bold text-blue-600">{stats.averageScore}</p>
                      <p className="text-xs text-gray-500 mt-1">score moyen</p>
                    </div>
                    <Target className="h-10 w-10 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Meilleur</p>
                      <p className="text-3xl font-bold text-green-600">{stats.bestScore}</p>
                      <p className="text-xs text-gray-500 mt-1">score maximum</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tendance</p>
                      <p className="text-3xl font-bold">
                        {stats.trend === "up" && "📈"}
                        {stats.trend === "down" && "📉"}
                        {stats.trend === "stable" && "➡️"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats.trend === "up" && "En progression"}
                        {stats.trend === "down" && "À améliorer"}
                        {stats.trend === "stable" && "Stable"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!filteredHistory || filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">Aucune correction pour le moment</p>
                <Button onClick={() => setLocation("/correction")}>
                  Commencer une correction
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historique complet</CardTitle>
                <CardDescription>
                  Toutes vos dictées et corrections par ordre chronologique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredHistory.map((item: any) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            if (item.type === 'correction') {
                              setLocation(`/correction/${item.id}`);
                            } else {
                              const wordsParam = encodeURIComponent(JSON.stringify(item.words));
                              setLocation(`/dictation?sessionId=${item.id}&words=${wordsParam}`);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {item.type === 'correction' ? (
                              <Badge className={getScoreColor(item.score)}>
                                {item.score}/100 - {getScoreGrade(item.score)}
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800">
                                Dictée créée
                              </Badge>
                            )}
                            {item.type === 'dictation' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteMutation.mutate({ sessionId: item.id });
                                }}
                                className="p-1 h-auto"
                              >
                                <Star className={`h-4 w-4 ${item.isFavorite === 1 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                              </Button>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString("fr-FR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {item.type === 'dictation' && item.imageUrl && (
                            <div className="mb-2">
                              <img 
                                src={item.imageUrl} 
                                alt="Image de dictée" 
                                className="w-32 h-32 object-cover rounded border"
                              />
                            </div>
                          )}
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {item.type === 'correction' ? item.originalText : `${item.words.length} mots extraits`}
                          </p>
                        </div>
                        {item.type === 'correction' && (
                          <div className="text-right ml-4">
                            <p className="text-2xl font-bold text-gray-900">{item.score}</p>
                            <p className="text-xs text-gray-500">
                              {item.correctWords}/{item.totalWords} mots
                            </p>
                          </div>
                        )}
                        {item.type === 'dictation' && (
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Voulez-vous vraiment supprimer cette session ?')) {
                                  deleteSessionMutation.mutate({ sessionId: item.id });
                                }
                              }}
                              className="p-1 h-auto text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{item.words.length}</p>
                              <p className="text-xs text-gray-500">mots</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {item.type === 'correction' ? (
                          <>
                            <span>{item.errors.length} erreur(s) détectée(s)</span>
                            <span className="text-blue-600 hover:underline">Voir les détails →</span>
                          </>
                        ) : (
                          <>
                            <span>Dictée prête à être utilisée</span>
                            <span className="text-blue-600 hover:underline">Ouvrir →</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
