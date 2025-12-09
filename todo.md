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

## Correction de la génération de dictée

- [x] Corriger la fonction generateDictation qui retourne une chaîne vide (problème de quota API)
- [x] Tester la génération de dictée avec l'application publiée

## Correction de l'erreur JSON dans l'historique

- [x] Corriger le parsing JSON dans la page History
- [x] Nettoyer les données corrompues dans la base de données
- [x] Tester l'historique
- [x] Créer le checkpoint final

## Amélioration de la gestion d'erreur generateDictation

- [x] Améliorer la gestion d'erreur pour propager les erreurs Gemini au frontend
- [x] Tester avec une nouvelle tentative de génération
- [x] Créer le checkpoint final

## Historique des uploads d'images

- [x] Ajouter le champ imageUrl dans le schéma dictationSessions (déjà présent)
- [x] Mettre à jour l'endpoint extractWords pour sauvegarder l'URL de l'image (déjà implémenté)
- [x] Améliorer la page History pour afficher les images uploadées
- [x] Permettre de cliquer sur une session pour recharger les mots
- [x] Tester l'historique complet
- [x] Créer le checkpoint final

## Améliorations de l'historique

- [x] Ajouter les champs isFavorite et tags dans le schéma dictationSessions
- [x] Créer l'endpoint pour supprimer une session
- [x] Créer l'endpoint pour marquer/démarquer une session comme favorite
- [x] Créer l'endpoint pour ajouter/modifier les tags d'une session
- [x] Implémenter la recherche dans l'historique (par mots, tags, date)
- [x] Ajouter les boutons de suppression dans l'interface
- [x] Ajouter le système d'étoile pour les favoris
- [x] Créer l'interface de gestion des tags
- [x] Ajouter les filtres (favoris, par tag)
- [x] Tester toutes les fonctionnalités
- [x] Créer le checkpoint final

## Correction du formatage de la dictée générée

- [x] Corriger le prompt de génération de dictée pour retourner du texte brut sans astérisques
- [x] Tester la génération de dictée
- [x] Créer le checkpoint final

## Amélioration de l'affichage de la dictée

- [x] Remplacer l'input par un textarea multiligne pour afficher la dictée
- [x] Créer le checkpoint final

## Améliorations de l'interface de dictée

- [x] Ajouter un bouton de copie pour le texte de la dictée
- [x] Ajouter des contrôles de vitesse et volume pour la synthèse vocale
- [x] Implémenter la sauvegarde automatique des dictées générées dans l'historique
- [x] Corriger le bug de suppression dans l'historique
- [x] Tester toutes les fonctionnalités
- [x] Créer le checkpoint final

## Nouvelles améliorations demandées

- [x] Afficher les dictées générées dans l'historique avec possibilité de les relire/copier
- [x] Implémenter le mode d'entraînement progressif (sélection de sous-ensemble de mots)
- [x] Ajouter un bouton retour sur la page de dictée
- [x] Corriger le chargement depuis l'historique (sessionId avec words vides)
- [x] Désactiver le bouton d'extraction pendant le traitement pour éviter les clics multiples
- [x] Corriger l'erreur de génération de dictée avec Gemini (erreur 500)
- [x] Tester toutes les fonctionnalités
- [x] Créer le checkpoint final

## Bugs critiques à corriger

- [x] L'historique affiche "0 mots extraits" alors que 40 mots ont été extraits
- [x] Le chargement depuis l'historique redirige vers une page vide sans contenu
