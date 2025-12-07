# Project TODO

- [x] Créer le schéma de base de données pour stocker les clés API et les sessions de dictée
- [x] Développer l'endpoint backend pour sauvegarder/récupérer la clé API Gemini
- [x] Développer l'endpoint backend pour uploader une image et extraire les mots via Gemini
- [x] Créer l'interface utilisateur pour le panel admin (configuration de la clé API)
- [x] Créer l'interface utilisateur pour uploader une image
- [x] Créer l'interface utilisateur pour afficher et lire les mots extraits
- [x] Implémenter la lecture audio avec intervalle configurable
- [x] Implémenter la fonctionnalité de reprise de lecture à partir d'un mot spécifique
- [x] Tester l'application complète
- [x] Créer le checkpoint final

## Nouvelles améliorations demandées

- [x] Corriger le modèle Gemini pour utiliser 2.5 Flash au lieu de 2.0 Flash Exp
- [x] Rendre l'intervalle entre les mots configurable dans les paramètres
- [x] Ajouter un bouton pour générer une dictée complète basée sur les mots extraits
- [x] Permettre la lecture audio de la dictée générée
- [x] Tester toutes les nouvelles fonctionnalités
- [x] Créer le checkpoint final avec les améliorations

## Fonctionnalité de correction de dictée

- [x] Créer le schéma de base de données pour stocker les corrections et les scores
- [x] Développer l'endpoint backend pour uploader et analyser la photo de dictée
- [x] Développer l'endpoint backend pour comparer le texte écrit avec le texte original
- [x] Créer l'interface utilisateur pour uploader la photo de dictée rédigée
- [x] Créer l'interface d'affichage des erreurs détaillées avec explications
- [x] Implémenter le système de notation (score sur 100)
- [x] Créer la page d'historique avec graphiques d'évolution
- [x] Tester toutes les fonctionnalités de correction
- [x] Créer le checkpoint final

## Corrections importantes

- [x] Améliorer l'extraction de mots pour identifier les mots complets (ex: "l'antilope" au lieu de "l'" et "antilope")
- [x] Ajouter les dictées créées à l'historique automatiquement
- [x] Corriger la génération de dictée pour afficher le texte généré
- [x] Ajouter la lecture vocale du texte de dictée généré
- [x] Ajouter le bouton d'upload de photo pour correction dans le contexte de la dictée
- [x] Tester toutes les corrections
- [x] Créer le checkpoint final

## Amélioration de l'extraction

- [x] Améliorer le prompt pour filtrer les en-têtes et numéros
- [x] Améliorer le prompt pour ne garder que les vrais mots de dictée
- [x] Tester l'extraction avec l'image fournie
- [x] Tester la génération de dictée
- [x] Créer le checkpoint final
