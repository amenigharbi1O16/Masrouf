# 03 — Le Cycle de Vie des Photos de Produits

Les photos de produits apportent un confort visuel majeur dans Masrouf : elles permettent d'identifier instantanément un article dans la liste des courses, sur l'historique d'accueil ou dans les suggestions d'achat.

Pour assurer la robustesse, la fluidité des listes et la pérennité du stockage local, l'architecture des photos suit un cycle de vie rigoureux implémenté dans `src/utils/photos.ts` et `src/components/ProductThumb.tsx`.

---

## 1. Vue d'Ensemble du Flux

```
[Utilisateur clique sur "+ Photo"]
       │
       ▼
[Dialogue natif : "Prendre une photo" OU "Choisir dans la galerie"]
       │
       ▼
[Demande de permission système (Caméra ou Photos)]
       │
   Acceptée ? ─── NON ───► [Alerte informative claire : l'utilisateur continue sans photo]
       │
      OUI
       ▼
[Expo Image Picker : Cadrage carré 1:1, compression qualité 0.7]
       │
       ▼
[URI temporaire reçue : file:///data/user/0/.../cache/ImagePicker/xyz.jpg]
       │
       ▼
[Copie sécurisée vers le dossier permanent : documentDirectory/product-photos/p_1731500000_abc.jpg]
       │
       ▼
[Sauvegarde dans SQLite : UNIQUEMENT le nom relatif du fichier "p_1731500000_abc.jpg"]
       │
       ▼
[Affichage via ProductThumb : Reconstitution dynamique du chemin complet]
       │
   Erreur ou absent ? ───► [Repli automatique et propre sur l'icône de la catégorie]
```

---

## 2. Sélecteur Natif et Gestion des Permissions

L'accès à l'appareil photo et à la galerie utilise la bibliothèque native `expo-image-picker`.

### Règle d'or : La photo est toujours facultative
Si l'utilisateur refuse la permission ou annule la sélection :
- L'application **ne plante jamais**.
- Une alerte bienveillante l'informe qu'il peut enregistrer son produit sans photo.
- Le produit utilisera automatiquement l'icône vectorielle de sa catégorie.

### Paramètres de capture optimisés :
- `allowsEditing: true` : Permet à l'utilisateur de recadrer son image.
- `aspect: [1, 1]` : Force un format **carré** pour s'intégrer harmonieusement dans les vignettes de l'application.
- `quality: 0.7` : Réduit la taille du fichier (environ $150\text{ Ko}$ à $300\text{ Ko}$ par photo au lieu de plusieurs mégaoctets), assurant un défilement ultra-fluide des listes même sur des téléphones d'entrée de gamme.

---

## 3. Stockage Temporaire vs Stockage Permanent

Lorsqu'une image est sélectionnée via `expo-image-picker`, le système d'exploitation la dépose temporairement dans un répertoire de cache (ex: `/data/user/0/host.exp.exponent/cache/...`).

### Le piège à éviter :
Si l'on enregistre directement cette adresse de cache :
- Le système Android ou iOS peut purger ce dossier de cache à tout moment pour libérer de l'espace.
- L'image disparaîtrait sans avertissement après quelques jours !

### La solution Masrouf :
Le module `src/utils/photos.ts` utilise l'API moderne d'Expo File System (`File`, `Directory`, `Paths.document`) :
1. Crée le répertoire permanent dédié : `Paths.document + '/product-photos/'`.
2. Génère un nom de fichier unique basé sur l'horodatage et un nombre aléatoire :  
   `p_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`
3. Copie l'image du cache vers ce répertoire permanent.

---

## 4. Pourquoi n'enregistrer QUE le nom du fichier en base ?

C'est une question classique et fondamentale posée par les jurys d'examen :  
> **« Pourquoi enregistrez-vous `p_12345.jpg` dans la colonne `produit.photo_path` au lieu du chemin complet `file:///data/user/0/.../p_12345.jpg` ? »**

### La raison technique :
Sur les systèmes mobiles modernes (iOS et Android) :
- Le chemin absolu du bac à sable (*sandbox*) d'une application contient un identifiant unique ou une version d'application qui change :
  - Lors d'une mise à jour de l'application.
  - Lors d'une restauration de sauvegarde.
  - Lors de la réouverture dans Expo Go.
- Si le chemin complet était enregistré dans la base SQLite, **toutes les photos deviendraient introuvables dès la mise à jour suivante** !
- En n'enregistrant que le **nom du fichier**, l'application reconstruit dynamiquement le chemin absolu à l'exécution en le concaténant avec le répertoire document actif :

```typescript
// Reconstitution dynamique du chemin complet
export function uriPhotoProduit(nomFichier: string | null | undefined): string | null {
  if (!nomFichier || nomFichier.trim() === '') return null;
  // Reconstitution à partir du dossier document actuel du téléphone
  return `${Paths.document.uri}/product-photos/${nomFichier.trim()}`;
}
```

---

## 5. Le Composant Partagé `ProductThumb`

Plutôt que de dupliquer la logique d'affichage des photos dans chaque écran, Masrouf utilise un composant unique et réutilisable : `src/components/ProductThumb.tsx`.

Il est utilisé partout :
- Liste des produits (`produits.tsx`).
- Fiche produit détaillée (`produit/[id].tsx`).
- Cartes d'achats sur l'accueil (`index.tsx`).
- Liste des suggestions en direct pendant la frappe (`nouvel-achat.tsx`).

### Gestion du repli (*fallback*) :
1. Si le produit n'a pas de photo (`photo_path` est nul ou vide) : affiche l'icône de la catégorie avec sa couleur de fond.
2. Si une photo est renseignée mais que le fichier a été supprimé ou est corrompu : l'événement `onError` de l'image est capturé et bascule instantanément vers l'icône, **sans provoquer de crash ni d'écran blanc**.

```tsx
<Image
  source={{ uri }}
  style={{ width: size, height: size, borderRadius: size / 4 }}
  onError={() => setHasError(true)}
  resizeMode="cover"
/>
```

---

## 6. Nettoyage des Fichiers Orphelins

Pour ne pas saturer l'espace disque du téléphone de l'utilisateur :
1. **Remplacement de photo** : Lorsqu'un utilisateur modifie un produit et choisit une nouvelle photo, l'ancienne photo permanente est immédiatement effacée du stockage via `supprimerPhotoProduit(ancienNom)`.
2. **Suppression de produit** : Lorsqu'un produit est supprimé du catalogue, son fichier photo associé est automatiquement supprimé du disque.
