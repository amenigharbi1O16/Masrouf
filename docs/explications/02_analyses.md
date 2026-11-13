# 02 — L'Écran Analyses et le Moteur Décisionnel Sans IA

L'écran **Analyses** (`src/app/(tabs)/analyses.tsx`) est l'un des piliers technologiques et pédagogiques de Masrouf. Il répond à une question simple et essentielle pour l'utilisateur :  
> **« Où ai-je dépensé mon argent sur la période choisie, et comment cela se compare-t-il exactement à la période précédente ? »**

Tout est calculé **localement**, en temps réel, sans réseau et **sans recourir à une intelligence artificielle externe**, garantissant une rapidité absolue et une confidentialité totale des données financières.

---

## 1. Calcul de la Période Précédente Symétrique de Même Durée

Pour qu'une comparaison statistique soit scientifiquement et économiquement rigoureuse, la période de comparaison doit avoir **exactement le même nombre de jours** que la période courante, et se terminer la veille de son premier jour.

### Règle mathématique :
1. Soit la période active définie par $[DateDébut, DateFin]$.
2. La durée en jours est :
   $$\text{Durée} = (\text{DateFin} - \text{DateDébut}) + 1\text{ jour}$$
3. La date de fin de la période précédente est la veille :
   $$\text{FinPrécédente} = \text{DateDébut} - 1\text{ jour}$$
4. La date de début de la période précédente est :
   $$\text{DébutPrécédente} = \text{FinPrécédente} - (\text{Durée} - 1)\text{ jours}$$

### Exemples concrets :
- **Mois complet de novembre 2026** (du 01/11 au 30/11, soit 30 jours) :
  - Fin précédente : `31/10/2026`
  - Début précédente : `02/10/2026` (soit exactement 30 jours, du 2 au 31 octobre).
- **Semaine glissante** (du 10/11 au 16/11, soit 7 jours) :
  - Fin précédente : `09/11/2026`
  - Début précédente : `03/11/2026` (soit exactement 7 jours, du 3 au 9 novembre).

```typescript
// Extrait de src/db/queries.ts
const dureeJours = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)) + 1;
const finPrecDate = new Date(debut.getTime() - 24 * 60 * 60 * 1000);
const debutPrecDate = new Date(finPrecDate.getTime() - (dureeJours - 1) * 24 * 60 * 60 * 1000);
```

---

## 2. Précision Monétaire Absolue : Le Calcul en Millimes Entiers

Le Dinar Tunisien (TND) possède 3 décimales ($1\text{ DT} = 1\,000\text{ millimes}$). Les nombres flottants en informatique introduisent des imprécisions résiduelles (ex. $0.1 + 0.2 = 0.30000000000000004$).

Pour éliminer définitivement toute erreur d'arrondi :
1. Toutes les agrégations SQL convertissent immédiatement les montants en **millimes entiers** :
   ```sql
   CAST(ROUND(COALESCE(SUM(prix_total), 0) * 1000) AS INTEGER)
   ```
2. Les calculs arithmétiques internes restent des opérations sur des entiers.
3. Le résultat final est divisé par $1\,000$ au moment de l'affichage avec `formatDT(montant)`.

---

## 3. Requête SQL d'Agrégation par Catégorie

La fonction `getAnalysesParCategoriePeriode(userId, debutStr, finStr)` consolide à la fois les achats de produits et les dépenses simples, les enveloppes budgétaires associées, et les dépenses de la période antérieure.

```sql
SELECT 
  c.id AS categorie_id,
  c.nom AS categorie_nom,
  c.type AS categorie_type,
  c.couleur AS categorie_couleur,
  c.icone AS categorie_icone,
  COALESCE(b.montant_alloue, 0) AS montant_alloue,
  -- Total période courante en millimes entiers
  CAST(ROUND(COALESCE(SUM(CASE 
    WHEN a.date_achat >= :debutCourante AND a.date_achat <= :finCourante 
    THEN a.prix_total ELSE 0 END), 0) * 1000) AS INTEGER) AS total_courant_millimes,
  -- Total période précédente en millimes entiers
  CAST(ROUND(COALESCE(SUM(CASE 
    WHEN a.date_achat >= :debutPrec AND a.date_achat <= :finPrec 
    THEN a.prix_total ELSE 0 END), 0) * 1000) AS INTEGER) AS total_precedent_millimes
FROM categories c
LEFT JOIN budget_categories b 
  ON b.categorie_id = c.id 
  AND b.budget_id = (
    SELECT id FROM budgets 
    WHERE user_id = :userId 
      AND date_debut <= :finCourante 
      AND date_fin >= :debutCourante 
    ORDER BY date_fin DESC LIMIT 1
  )
LEFT JOIN achats a 
  ON a.categorie_id = c.id 
  AND a.user_id = :userId 
  AND a.date_achat >= :debutPrec 
  AND a.date_achat <= :finCourante
WHERE c.user_id = :userId OR c.user_id IS NULL
GROUP BY c.id
ORDER BY total_courant_millimes DESC;
```

### Traitement des cas particuliers :
- **Catégorie sans dépense** : Exclue du diagramme graphique pour ne pas encombrer l'affichage.
- **Dépense sans budget associé** : Automatiquement regroupée dans la ligne **« Non budgétisé »**.
- **Sous-totaux** : Séparation claire entre les catégories de **produits** et les catégories de **dépenses simples** (loyer, abonnements, etc.).
- **Part du total (%)** : $\frac{\text{Total Catégorie}}{\text{Total Période}} \times 100$, arrondie à une décimale.
- **Écart (%)** : $\frac{\text{Dépense Courante} - \text{Dépense Précédente}}{\text{Dépense Précédente}} \times 100$. Si la dépense précédente était de $0$, le système affiche le badge textuel clair **« Nouveau »** sans générer de faux pourcentage mathématique.

---

## 4. Diagramme de Répartition Horizontal

Pour préserver la lisibilité sur les écrans mobiles :
- Les **5 premières catégories** les plus dépensées sont représentées par des segments colorés proportionnels à leur part.
- Toutes les catégories suivantes sont automatiquement regroupées dans un segment neutre intitulé **« Autres »**.
- Une légende sous la barre affiche le nom, le pourcentage et le montant pour chaque catégorie visible.

---

## 5. Moteur de Conclusion Automatique par Règles (Sans IA)

Une intelligence artificielle distante serait lente, coûteuse et indisponible hors-ligne. Masrouf intègre un **moteur de règles expertes déterministe** qui synthétise les données en phrases courtes, claires et percutantes, traduites dans les 3 langues.

### Algorithme décisionnel :
1. **Règle 1 : Catégorie principale**  
   Identifie la catégorie ayant le plus gros montant.
   - Traduction : `analyses.conclusion_top`
   - Paramètres : `{categorie}`, `{montant}`, `{part}`
2. **Règle 2 : Plus forte augmentation**  
   Identifie la catégorie dont l'écart absolu $(\text{courant} - \text{précédent})$ est le plus élevé et positif.
   - Traduction : `analyses.conclusion_hausse`
   - Paramètres : `{categorie}`, `{montant}`, `{pourcentage}`
3. **Règle 3 : Plus forte baisse**  
   Identifie la catégorie ayant le plus reculé par rapport à la période précédente.
   - Traduction : `analyses.conclusion_baisse`
   - Paramètres : `{categorie}`, `{montant}`, `{pourcentage}`
4. **Règle 4 : Dépassement d'enveloppe budgétaire**  
   Détecte toutes les catégories où $\text{Dépensé} > \text{Alloué}$.
   - Traduction : `analyses.conclusion_depassement`
   - Paramètre : `{categories}` (liste séparée par des virgules)
5. **Règle 5 : Tendance globale des dépenses**  
   Compare le montant total de la période au total précédent.
   - En baisse : `analyses.conclusion_total_baisse`
   - En hausse : `analyses.conclusion_total_hausse`
6. **Règle 6 : Gestion des égalités et cas limites**  
   En cas d'égalité sur la première place, les deux catégories sont explicitement citées. Si la période précédente ne comporte aucune dépense, aucune fausse comparaison n'est énoncée.

---

## 6. Clés de Traduction Paramétrées (FR, AR, EN)

Les messages ne contiennent **aucun texte en dur**. Le moteur de traduction remplace dynamiquement les variables balisées entre accolades `{variable}` :

### Exemple en Français (`src/i18n/fr.json`)
```json
"conclusion_top": "Votre poste de dépense principal est {categorie} ({montant}, soit {part}% de votre budget).",
"conclusion_hausse": "{categorie} a connu la plus forte augmentation (+{montant}, +{pourcentage}%).",
"conclusion_baisse": "{categorie} a le plus diminué (-{montant}, -{pourcentage}%).",
"conclusion_depassement": "Attention, enveloppe dépassée pour : {categories}.",
"conclusion_total_baisse": "Excellente gestion : vos dépenses globales sont en baisse de {pourcentage}%."
```

### Exemple en Arabe (`src/i18n/ar.json`)
```json
"conclusion_top": "أكبر بند للمصاريف هو {categorie} ({montant}، أي {part}% من ميزانيتك).",
"conclusion_hausse": "شهد {categorie} أعلى زيادة (+{montant}، +{pourcentage}%).",
"conclusion_baisse": "شهد {categorie} أكبر انخفاض (-{montant}، -{pourcentage}%).",
"conclusion_depassement": "تنبيه، تم تجاوز الظرف المخصص لـ: {categories}.",
"conclusion_total_baisse": "تصرف ممتاز: مصاريفك الإجمالية انخفضت بنسبة {pourcentage}%."
```

### Exemple en Anglais (`src/i18n/en.json`)
```json
"conclusion_top": "Your main expense category is {categorie} ({montant}, which is {part}% of your budget).",
"conclusion_hausse": "{categorie} experienced the largest increase (+{montant}, +{pourcentage}%).",
"conclusion_baisse": "{categorie} decreased the most (-{montant}, -{pourcentage}%).",
"conclusion_depassement": "Warning: envelope exceeded for: {categories}.",
"conclusion_total_baisse": "Great budget discipline: your overall spending decreased by {pourcentage}%."
```

