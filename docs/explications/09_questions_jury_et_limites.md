# 09 — Préparation à la Soutenance, Questions du Jury et Limites du Système

Ce document prépare l'étudiant à sa soutenance orale devant son professeur ou son jury d'évaluation. Il recense les questions prévisibles les plus pointues avec des réponses simples, argumentées et percutantes, ainsi qu'une analyse lucide et honnête des limites techniques du système.

---

## 🎓 1. Questions Typiques du Jury et Réponses Clé en Main

### Question 1 : « Pourquoi avoir choisi une architecture 100 % locale plutôt qu'une API REST avec une base PostgreSQL dans le Cloud ? »
- **Réponse simple et percutante** :  
  *« C'est un choix délibéré répondant à deux impératifs majeurs : la **confidentialité absolue** et la **disponibilité totale**. Les dépenses quotidiennes et les habitudes d'achat relèvent de la vie privée intime. En conservant 100 % des données dans SQLite sur le téléphone :
  1. Aucun tiers ni serveur distant ne peut être piraté ou exploiter les données des utilisateurs.
  2. L'application fonctionne sans aucune latence, instantanément, même dans les zones sans réseau (supermarchés en sous-sol, marchés de plein air, zones rurales).
  3. L'application ne coûte rien en hébergement serveur et ne tombe jamais en panne réseau. »*

---

### Question 2 : « Comment faites-vous pour garantir qu'il n'y a pas d'erreurs d'arrondi sur les sommes en Dinars Tunisiens ? »
- **Réponse technique claire** :  
  *« Le Dinar Tunisien possède 3 décimales (les millimes). Si l'on additionne des nombres flottants en JavaScript ou en SQL standard, des erreurs d'imprécision binaire apparaissent inévitablement (comme 0.1 + 0.2 qui donne 0.30000000000000004). Pour éliminer définitivement ce problème, nous convertissons toutes les sommes en **millimes entiers** dans nos requêtes SQL (`CAST(ROUND(prix * 1000) AS INTEGER)`). Les additions et soustractions se font uniquement sur des nombres entiers stricts. La division par 1 000 n'intervient qu'au moment de l'affichage final via notre formateur `formatDT`. »*

---

### Question 3 : « Si l'utilisateur met à jour l'application ou la réinstalle, pourquoi ses photos de produits ne sont-elles pas perdues ? »
- **Réponse technique claire** :  
  *« C'est un piège classique sur iOS et Android : le chemin absolu du dossier de l'application change lors d'une mise à jour. Si nous avions stocké `file:///data/user/0/.../photo.jpg` dans SQLite, les liens auraient été brisés. Nous avons résolu cela en copiant les images dans le dossier permanent de l'application avec un nom unique, et en n'enregistrant en base de données que le **nom relatif du fichier** (ex: `p_1731500000_1234.jpg`). Au moment de l'affichage, notre composant `ProductThumb` reconstruit dynamiquement l'adresse complète en la concaténant au chemin document actif du téléphone. Et si un fichier venait à manquer, le composant bascule en douceur sur l'icône de la catégorie sans planter l'écran. »*

---

### Question 4 : « Comment fonctionne la conclusion automatique sur l'écran Analyses ? Est-ce de l'IA ? »
- **Réponse technique claire** :  
  *« Non, et c'est une fierté de notre conception : nous n'avons pas utilisé d'IA générative externe car elle aurait nécessité une connexion internet, introduit des temps d'attente de plusieurs secondes et risqué des hallucinations. Nous avons conçu un **moteur de règles expertes déterministe** : l'algorithme classe les données consolidées, identifie la catégorie prépondérante, calcule les plus fortes variations par rapport à la période précédente symétrique de même durée, détecte les dépassements de quotas et injecte ces grandeurs dans des phrases types paramétrées et traduites en 3 langues. Le résultat est instantané, exact et disponible hors-ligne. »*

---

### Question 5 : « Comment garantissez-vous que l'administrateur n'espionne pas les achats de ses utilisateurs ? »
- **Réponse technique claire** :  
  *« Par conception logicielle étanche (*Privacy by Design*). Toutes les requêtes SQL dédiées au tableau de bord administrateur n'exécutent que des fonctions d'agrégation globale (`COUNT(DISTINCT user_id)`, `SUM(montant)`, `AVG`). Aucune requête de l'espace admin n'effectue de jointure nominative sur les libellés de la table `purchase` ou sur les magasins individuels. De plus, notre banc de test automatisé `test-admin-privacy.mjs` vérifie que les objets retournés à l'administrateur ne contiennent aucun champ personnel. »*

---

### Question 6 : « Pourquoi utiliser PBKDF2 avec 10 000 itérations plutôt qu'un SHA-256 standard pour les mots de passe ? »
- **Réponse technique claire** :  
  *« Un hachage SHA-256 s'exécute en quelques fractions de microseconde. Si un individu malveillant récupère le fichier SQLite, il peut tester des milliards de combinaisons par seconde avec une carte graphique. L'algorithme PBKDF2-HMAC-SHA256 avec 10 000 itérations et sel aléatoire unique ralentit volontairement le calcul. Il prend 30 à 60 millisecondes sur le téléphone (totalement indolore pour l'utilisateur qui tape son mot de passe), mais rend une attaque par force brute ou dictionnaire hors de portée. Et nous avons prévu une migration automatique transparente pour les anciens comptes v1 dès leur prochaine connexion. »*

---

## ⚠️ 2. Les Limites Réelles du Système et Transparence Technique

Tout projet d'ingénierie comporte des compromis techniques. Pouvoir les expliciter avec lucidité prouve au jury votre maturité technique :

### 1. Absence de Synchronisation Multi-Appareils
- **La limite** : Puisque la base SQLite est 100 % locale, un utilisateur ne peut pas synchroniser ses achats en direct entre son smartphone et la tablette de son conjoint sans exporter manuellement sa base ou un fichier de sauvegarde.
- **La justification** : C'est le prix à payer pour l'absence totale de serveurs cloud et le respect absolu de la vie privée.
- **Évolution future possible** : Mise en place d'une synchronisation locale chiffrée de bout en bout en réseau local (Wi-Fi direct / Bluetooth) sans serveur central.

---

### 2. Vulnérabilité sur Appareil Rooté ou Jailbreaké
- **La limite** : Si un utilisateur utilise un smartphone Android « rooté » ou un iPhone « jailbreaké », l'isolation du bac à sable du système d'exploitation peut être contournée par un attaquant disposant d'un accès administrateur *root* sur l'appareil.
- **La protection mise en place** : La session reste protégée par le *Keystore* matériel (`expo-secure-store`) et les mots de passe sont hachés en PBKDF2 avec sel, ce qui protège les données même en cas d'extraction brute du fichier `.db`.

---

### 3. La Séparation des Rôles (RBAC) Reste Côté Client
- **La limite** : Dans une architecture client-serveur classique, le serveur web vérifie les droits sur chaque requête d'API (sécurité côté serveur). Dans une application mobile 100 % locale, la vérification des rôles (`user` vs `admin`) s'exécute dans le code de l'application cliente sur l'appareil.
- **La mitigation** : Nous avons implémenté une **double barrière** : le pare-feu de routage (`NavigationGuard` dans `_layout.tsx`) combiné à une vérification interne au niveau de chaque composant d'écran sous `src/app/(admin)/`.

---

### 4. Sauvegarde en Cas de Perte du Téléphone
- **La limite** : Si l'utilisateur perd ou casse son smartphone sans avoir au préalable exporté sa base ou effectué une sauvegarde système (Google Drive / iCloud Backup), ses données financières locales sont perdues avec l'appareil.
- **La mitigation** : La commande `VACUUM INTO` génère des copies de sauvegarde intègres facilement exportables par l'utilisateur.
