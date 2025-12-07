import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { BookOpen, Loader2, Settings } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Dictée Interactive
            </h1>
            <p className="text-xl text-gray-600 mb-12">
              Uploadez une image contenant des mots, et écoutez-les lus automatiquement avec un intervalle configurable. Parfait pour l'apprentissage et la pratique de la dictée.
            </p>
            <Button
              size="lg"
              onClick={() => window.location.href = getLoginUrl()}
              className="text-lg px-8 py-6"
            >
              Se connecter pour commencer
            </Button>
          </div>

          <div className="max-w-5xl mx-auto mt-20 grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Upload d'image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Uploadez une image contenant les mots de votre dictée. L'IA Gemini extrait automatiquement tous les mots.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Lecture audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Les mots sont lus un par un avec synthèse vocale. Configurez l'intervalle entre chaque mot selon vos besoins.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Contrôle total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Reprenez la lecture à partir de n'importe quel mot. Mettez en pause et ajustez la vitesse à tout moment.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="container py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dictée Interactive</h1>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setLocation("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
            <Button variant="outline" onClick={() => logout()}>
              Déconnexion
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Bienvenue, {user.name || "utilisateur"} !
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Commencez votre dictée en uploadant une image contenant les mots à apprendre.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/dictation")}
            className="text-lg px-8 py-6"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Commencer une dictée
          </Button>
        </div>
      </div>
    </div>
  );
}
