# 08 — Logique Métier, Calculs et Règles Financières

Ce document présente l'intégralité des règles financières et des calculs mathématiques appliqués dans **Masrouf**, avec des exemples numériques complets et détaillés.

---

## 1. Cycle de Vie Complet d'un Achat

Voici le cheminement exact d'une transaction, de la frappe au clavier jusqu'à l'ajustement du solde et des alertes :

```
[1. Saisie de l'utilisateur]
   Nom du produit : "Lait" ──► Suggestions instantanées avec ProductThumb
   Quantité : 2 L
   Prix total payé : 3.200 DT
   Magasin : "Monoprix"
          │
          ▼
[2. Calcul du Prix Unitaire & Comparaison immédiate]
   Prix unitaire actuel = 3.200 / 2 = 1.600 DT/L
   Dernier achat connu pour ce produit = 1.500 DT/L
   Delta montant = 1.600 - 1.500 = +0.100 DT
   Delta pourcentage = (+0.100 / 1.500) * 100 = +6.7 %
   ──► Affichage : Flèche rouge vers le haut "+0.100 DT (+6.7 %)"
          │
          ▼
[3. Validation et Écriture SQLite en Millimes Entiers]
   Conversion en millimes : 3.200 * 1000 = 3 200 millimes
   INSERT INTO purchase (..., price = 3.200, quantity = 2, ...)
          │
          ▼
[4. Recalcul Réactif de l'Enveloppe Budgétaire]
   Enveloppe "Alimentation" : Alloué = 400.000 DT
   Ancien total dépensé = 318.000 DT
   Nouveau total dépensé = 318.000 + 3.200 = 321.200 DT
   Consommation = (321.200 / 400.000) * 100 = 80.3 %
          │
          ▼
[5. Déclenchement Automatique de l'Alerte 80 %]
   Puisque Consommation >= 80 % et < 100 % :
   - La jauge de la catégorie passe du vert (#1B4332) à l'ambre (#B07D00).
   - Une entrée est consignée dans `alert_log`.
   - L'écran d'accueil affiche la bannière d'alerte préventive.
          │
          ▼
[6. Attribution des Points de Gamification]
   Si 1er achat de la période : +50 points.
   Si budget de la période resté <= 100 % en fin de cycle : +100 points.
```

---

## 2. Formules et Exemples Chiffrés Précis

### A. Prix Unitaire
$$\text{Prix Unitaire} = \frac{\text{Prix Total Payé}}{\text{Quantité}}$$
- **Exemple** : $3\text{ paquets de café}$ pour $14.400\text{ DT}$.  
  $$\text{PU} = \frac{14.400}{3} = 4.800\text{ DT/paquet}$$

### B. Comparaison avec le Dernier Achat
1. **Écart en montant ($\Delta M$)** :
   $$\Delta M = \text{PU}_{\text{actuel}} - \text{PU}_{\text{dernier}}$$
2. **Écart en pourcentage ($\Delta \%$)** :
   $$\Delta \% = \left(\frac{\Delta M}{\text{PU}_{\text{dernier}}}\right) \times 100$$
- **Cas 1 : Hausse de prix**
  - Dernier PU = $4.000\text{ DT}$, Nouveau PU = $4.500\text{ DT}$.
  - $\Delta M = 4.500 - 4.000 = +0.500\text{ DT}$.
  - $\Delta \% = (+0.500 / 4.000) \times 100 = \mathbf{+12.5\ \%}$ (affiché en rouge avec flèche montante).
- **Cas 2 : Baisse de prix**
  - Dernier PU = $5.000\text{ DT}$, Nouveau PU = $4.000\text{ DT}$.
  - $\Delta M = 4.000 - 5.000 = -1.000\text{ DT}$.
  - $\Delta \% = (-1.000 / 5.000) \times 100 = \mathbf{-20.0\ \%}$ (affiché en vert avec flèche descendante).
- **Cas 3 : Unités incompatibles**
  - Si le dernier achat était en *Litre* et le nouveau en *Gramme*, le système affiche les deux montants sans faux calcul de pourcentage :  
    *« Prix actuel : 2.500 DT / 500g — Dernier achat : 4.800 DT / L »*.

### C. Consommation et Seuils d'Alerte Budgétaire
Soit un budget total de $1\,200.000\text{ DT}$ :
- **État Sain** : Total dépensé = $750.000\text{ DT}$ ($62.5\ \%$). Jauge verte, solde disponible = $+450.000\text{ DT}$.
- **Seuil d'Alerte 80 %** : Dépensé = $960.000\text{ DT}$ ($80.0\ \%$). Bannière orange ambre : « Attention, vous avez atteint 80 % de votre enveloppe ! ».
- **Budget Dépassé (>= 100 %)** : Dépensé = $1\,250.000\text{ DT}$ ($104.2\ \%$). Bannière rouge cramoisi : « Budget dépassé de 50.000 DT ».

---

## 3. La Règle de Modification par Différence (Règle du Delta)

Lorsqu'un utilisateur modifie le montant d'un achat existant (ex. une erreur de saisie où $25.000\text{ DT}$ devait être $35.000\text{ DT}$) :
- L'application ne réinitialise pas le budget.
- Elle calcule la différence nette :
  $$\Delta = \text{Nouveau Montant} - \text{Ancien Montant} = 35.000 - 25.000 = +10.000\text{ DT}$$
- Le total dépensé de la catégorie et du budget global est ajusté uniquement de ces $+10.000\text{ DT}$.
- Si le montant diminue ($20.000$ au lieu de $25.000$), le delta est négatif ($-5.000\text{ DT}$), ce qui recrédite immédiatement l'enveloppe disponible.

---

## 4. Distinction Stricte : « Produit » vs « Dépense Simple »

Pour répondre aux exigences de clarté conceptuelle du professeur et du design :

| Critère | Produit (`product` / `purchase`) | Dépense Simple (`expense`) |
|---|---|---|
| **Nature** | Article physique achetable et récurrent | Charge, abonnement, facture, service |
| **Exemples** | Lait, Pain, Café, Huile, Détergent | Loyer, Facture STEG/SONEDE, Internet, Taxi |
| **Quantité & Unité** | Oui (ex: 2 kg, 3 bouteilles, 1 pièce) | Non (montant direct unique) |
| **Prix unitaire calculé** | Oui ($\text{Prix Total} / \text{Quantité}$) | Non (montant global forfaitaire) |
| **Photo associée** | Oui (photo réelle stockée ou icône) | Non (icône vectorielle de catégorie) |
| **Magasin / Enseigne** | Oui (comparaison multi-magasins) | Facultatif / Non applicable |
| **Historique & Tendances** | Courbe d'évolution du prix unitaire | Suivi mensuel dans les sous-totaux |

---

## 5. Système de Gamification : Points, Niveaux et Succès

Le barème configuré dans la table `settings` récompense la régularité sans caractère punitif :
- **+50 points** : Enregistrement du premier achat d'une période budgétaire.
- **+20 points** : Palier intermédiaire atteint (ex: avoir tenu 15 jours sans dépasser 50 % du budget).
- **+100 points** : Période complète terminée sans dépasser l'enveloppe budgétaire globale.
- **+10 points** : Ajout d'une photo réelle sur un nouveau produit.

### Niveaux de profil :
1. **Débutant** : 0 à 99 points.
2. **Économe Averti** : 100 à 299 points.
3. **Expert du Budget** : 300 points et plus.

---

## 6. Thème Visuel et Tokens de Design

Toutes les couleurs et espacements sont centralisés dans `src/theme/index.ts` et `src/constants/theme.ts` :
- **Primaire Vert Forêt** : `#1B4332` (action principale, budget sain).
- **Vert Clair / Accents** : `#2D6A4F` et `#40916C`.
- **Texte Neutre Atténué (`muted`)** : `#61746D` (rigoureusement conforme à la maquette Figma).
- **Alerte Ambre** : `#B07D00` (seuil de 80 %).
- **Danger Rouge** : `#B3261E` (dépassement de budget, suppression).
- **Surfaces Claires** : `#F7FBF8` (fond d'écran), `#FFFFFF` (cartes).

---

## 7. Formatage Monétaire Strict `formatDT` et Support RTL Arabe

### Le formatage monétaire
Le module `src/utils/format.ts` applique la règle :
- 3 décimales fixes en permanence.
- En français et anglais : `14.500 DT`.
- En arabe : chiffres occidentaux (plus lisibles pour la gestion comptable) suivis immédiatement du symbole monétaire local attaché : `14.500 د.ت`.

### Le support RTL (*Right-To-Left*) pour l'Arabe
- L'alignement du texte passe automatiquement à droite (`textAlign: isRTL ? 'right' : 'left'`).
- L'ordre des icônes et flèches de navigation s'inverse (`flexDirection: isRTL ? 'row-reverse' : 'row'`).
- Le tiroir latéral **AppDrawer** se déploie depuis le côté **droit** de l'écran en arabe, et depuis la gauche en français/anglais.

### Les Bannières Qualifiées et Manuels d'Utilisation PDF
- Bannières d'en-tête exportées en résolutions complètes `@1x`, `@2x`, `@3x` pour chaque langue (`banner_fr.png`, `banner_ar.png`, `banner_en.png`).
- Manuels d'utilisation de 4 pages standard au format PDF-1.4 embarqués localement dans `assets/manuals/`.
- Ouverture directe dans la visionneuse système via `src/utils/pdf.ts`.

