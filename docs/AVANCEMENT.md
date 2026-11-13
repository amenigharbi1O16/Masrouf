# Avancement du grand chantier Masrouf

## Bloc 0 — Terminé et vérifié
- Tag `avant-grand-chantier` créé et poussé sur GitHub (`git push origin avant-grand-chantier`).
- Sauvegarde et intégrité du dépôt vérifiées (aucun fichier temporaire de base SQLite `masrouf.db` commité).

## Bloc 1 — Terminé et poussé (commit `602d952`)
- Périodes de budget libres : date de début et date de fin au jour près (pas de mois civil forcé).
- Achats et dépenses : stockage explicite du prix total en base, recalcul unitaire précis, calcul en millimes entiers pour zéro dérive d'arrondi.
- Assistant de démarrage en 3 écrans sans budget forcé.
- Recalcul des enveloppes par différence lors de la modification ou suppression.
- Script de migration SQLite testé avec succès (`scripts/test-migration.mjs`).

## Bloc 2 — Terminé et poussé (commit `c4c348f`)
- 9 écrans admin complets alignés au design Figma (écrans 35 à 43).
- Écran 41 : pourcentages de répartition par défaut des catégories avec somme exacte 100%.
- Barème de gamification du design (1er achat = 50 pts, palier = 20 pts, etc.).
- Règle absolue de confidentialité admin : aucune lecture de libellés d'achats personnels, de magasins ou de montants individuels ; agrégats globaux anonymes uniquement (`scripts/test-admin-privacy.mjs` testé avec succès).

## Bloc 3 — Terminé
- **43 types d'écrans reliés** sans boucle ni cul-de-sac : auth, onboarding, accueil 4 états, tiroir de navigation 78% (gauche en FR/EN, droite en AR), produits, achats, dépenses, comparaisons, analyses, gamification, réglages, 9 écrans admin.
- **Photos de produits réelles** :
  - Composant partagé `ProductThumb` avec repli automatique sur icône SVG si absence ou erreur de chargement (`onError`).
  - Module `src/utils/photos.ts` utilisant l'API moderne d'Expo File System (`Paths.document`, `Directory`, `File`).
  - Copie dans le stockage permanent sous nom unique (`p_${timestamp}_${rand}.${ext}`).
  - Seul le **nom du fichier** est persisté en SQLite (survit aux réinstallations et mises à jour).
  - Suppression automatique du fichier orphelin lors du remplacement de photo ou de la suppression du produit.
- **Fonctions d'achat avancées** :
  - Suggestions en temps réel pendant la frappe (insensible à la casse et aux accents) avec alerte de ressemblance.
  - Comparaison du prix unitaire par rapport au dernier achat (montant et %, flèche et couleur verte/rouge) ou libellé « premier achat de ce produit ».
  - Magasin le moins cher calculé sur la fiche produit.
  - Section « Achats du jour » sur l'écran Produits.
  - Écran `modifier-achat.tsx` et `modifier-produit.tsx` avec modal de confirmation, suppression en cascade des achats liés (avec décompte affiché) et ajustement budgétaire par différence.
- **Écran Analyses complet** :
  - Comparaison avec la période précédente de **même durée** (symétrique jour pour jour).
  - Calculs en **millimes entiers** (`CAST(ROUND(prix * 1000) AS INTEGER)`) évitant toute imprécision en virgule flottante.
  - Diagramme horizontal à 5 catégories max + regroupement automatique « Autres ».
  - Lignes de détail avec écart vs période précédente, barre de progression de l'enveloppe, ligne « Non budgétisé », sous-totaux séparant produits et dépenses simples.
  - Conclusion automatique 100% par règles (sans IA), phrases traduites avec paramètres dans les 3 langues, gestion des égalités.
  - Classements des plus grosses dépenses, des produits les plus coûteux et courbe d'évolution du prix d'un produit sélectionnable.
  - Validé par le banc de test `scripts/test-analyses.mjs`.

## Bloc 4 — Terminé
- **Thème visuel** :
  - Couleur `muted` corrigée exactement à `#61746D` (charte Figma).
  - Centralisation dans `src/theme/index.ts` et `src/constants/theme.ts`.
  - Composants atomiques réutilisables créés dans `src/components/ui/` (`Button`, `Input`, `AlertBanner`, `EmptyState`, `PriceIndicator`, `Skeleton`).
- **Formatage strict** :
  - Module `src/utils/format.ts` : `formatDT` (3 décimales fixes, chiffres occidentaux en arabe avec symbole `د.ت` attaché), `formatPourcentage`, `formatDate`, `formatPeriode`.
- **Internationalisation (i18n)** :
  - Support des traductions paramétrées `{param}` dans `src/utils/i18n.ts`.
  - 196 clés rigoureusement synchronisées dans `fr.json`, `ar.json` et `en.json` (0 clé orpheline, 0 clé manquante).
- **Ressources qualifiées & Manuels d'utilisation** :
  - Bannières localisées `@1x`, `@2x`, `@3x` créées pour `fr`, `ar` et `en` avec sélecteur `getLocalizedAsset`.
  - Manuels d'utilisation PDF standard 4 pages générés dans `assets/manuals/` (`manuel_fr.pdf`, `manuel_ar.pdf`, `manuel_en.pdf`).
  - Fonction d'ouverture sécurisée `ouvrirManuelUtilisation(langue)` avec repli d'alerte explicatif si aucune visionneuse PDF n'est présente.
  - Boutons d'accès direct au manuel intégrés dans les écrans Réglages utilisateur et admin.
  - Raccourcis de test `user@masrouf.tn` / `admin@masrouf.tn` masqués en production et réservés à `__DEV__`.

## Bloc 5 — En cours
- Audit exhaustif de l'application et matrice de vérification.
- Rédaction du rapport de conformité `docs/RAPPORT_VERIFICATION.md`.

## Bloc 6 — À venir immédiatement
- Documentation technique et pédagogique complète dans `docs/explications/` (9 chapitres pour soutenance orale).
- Validation finale TypeScript et Git push.
