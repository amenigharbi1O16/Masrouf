# Avancement du grand chantier

## Bloc 0 — terminé

- Tag Git `avant-grand-chantier` créé sur `5a6ea153987f8fcef9db4f3bab83e09b23454c90` et poussé : `git push origin avant-grand-chantier` a réussi.
- Connexion GitHub vérifiée avec `git ls-remote` avant le premier push. Elle fonctionne. Les prochains blocs poussent `origin main` tant que ce push reste un avance rapide.
- Aucune base `masrouf.db` dans le dossier du projet ni ailleurs hors `node_modules`. La base de test vit sur le téléphone (expo-sqlite). Rien n'a été copié, rien n'a été supprimé.

## Bloc 1 — terminé dans le code, en attente du commit

- Tables `budget` et `envelope`. Un ancien mois devient une période du 1er au dernier jour.
- `purchase.price` est le prix total. Test en mémoire : 10 × 2 devient 20, une quantité de 1 ne change pas, une seconde exécution ne remultiplie pas.
- « Copier la période précédente » remplit le formulaire et n'enregistre rien tant que la personne ne valide pas.
- `npx tsc --noEmit` : aucune erreur.
- `node scripts/test-migration.mjs` : réussi.
- Pas de base téléphone à migrer depuis ce PC.

## Bloc en cours

Bloc 2 — points, pourcentages, admin.

## Ce qui reste

- Bloc 1 : commit et push si GitHub accepte l'avance rapide
- Bloc 2 — points, pourcentages de l'écran 41, admin, confidentialité
- Bloc 3 — 43 écrans, photos, analyses
- Bloc 4 — thème, textes, langues, PDF (emplacements d'images à remplacer)
- Bloc 5 — contrôles et matrice du rapport
- Bloc 6 — explications, y compris les exigences du cours
