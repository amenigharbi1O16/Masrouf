/**
 * FICHIER : src/app/(admin)/pourcentages.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-006 (Admin Pourcentages)
 * ÉCRAN : ECRAN-ADM-04 (Configuration des Pourcentages Budgétaires par Défaut)
 *
 * MISSION DU FICHIER :
 * Permettre à l'administrateur de définir la clé de répartition budgétaire par défaut
 * qui sera suggérée automatiquement aux nouveaux utilisateurs lors de la création de leur budget.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il garantit l'équilibre financier global. Quand un utilisateur entre par exemple '1000 DT'
 * comme budget mensuel, Masrouf utilise ces pourcentages (ex: 35% Alimentation, 15% Énergie, etc.)
 * pour pré-remplir instantanément le montant en dinars de chaque enveloppe.
 * Une règle mathématique absolue est appliquée : la somme de tous les pourcentages doit valoir exactement 100.0%.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand titre 'Pourcentages par défaut' avec le surtitre 'RÉPARTITION SUGGÉRÉE (100%)'.
 * - Une ligne d'information dynamique 'TOTAL' : elle s'affiche en vert si la somme fait exactement 100%,
 *   et vire au rouge corail d'alerte dès que la somme s'écarte de 100% (ex: 95% ou 102%).
 * - Un champ de saisie pour chaque catégorie active avec son nom et le symbole '%'.
 * - Une bannière rouge explicative indiquant l'écart actuel tant que le total n'atteint pas 100%.
 * - Une bannière verte de confirmation dès que la nouvelle clé de répartition est enregistrée.
 * - Un bouton vert d'action 'Enregistrer les pourcentages', désactivé tant que la somme n'est pas égale à 100%.
 */

import React, { useState } from 'react';
// Ligne de données synthétique bicolore affichant un libellé à gauche et une valeur colorée à droite
import { InfoRow } from '@/components/Cards';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonction utilitaire de conversion sécurisée de texte en nombre
import { toNum } from '@/utils/format';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'état du formulaire de calibrage des pourcentages par catégorie.
 *
 * RÔLE DANS L'APPLICATION :
 * Assure la cohérence arithmétique (somme = 100%) avant d'écrire les nouveaux ratios dans SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La liste des champs de pourcentage, la jauge de somme et les alertes de validation.
 */
export default function AdminDefaultPercentagesScreen() {
  // Extraction des données de la base et de l'action de sauvegarde
  const { db, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Filtrage des catégories actives (les catégories masquées ne reçoivent pas de quota par défaut)
  const cats = db.categories.filter((c) => c.active);

  // État local : dictionnaire associant l'ID de chaque catégorie à sa valeur textuelle saisie
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(
      cats.map((c) => [c.id, String(db.defaultPercentages[c.id] ?? 0)])
    )
  );
  // État local : indique si l'enregistrement a réussi pour afficher la bannière verte
  const [saved, setSaved] = useState(false);

  // Conversion de toutes les saisies textuelles en nombres réels
  const nums = Object.fromEntries(
    cats.map((c) => [
      c.id,
      Number.isFinite(toNum(vals[c.id])) ? toNum(vals[c.id]) : 0,
    ])
  );
  // Calcul de la somme totale de tous les pourcentages saisis
  const total = Object.values(nums).reduce((a, b) => a + b, 0);

  // Règle de validation mathématique : la somme doit faire exactement 100% (tolérance 0.0001 pour flottants)
  // et aucun pourcentage ne doit être négatif
  const ok =
    Math.abs(total - 100) < 0.0001 && Object.values(nums).every((v) => v >= 0);

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('pourcentages_defaut')}>
      {/* Surtitre explicatif en lettres majuscules */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('repartition_suggeree_100')}
      </Eyebrow>

      {/* Ligne récapitulative du total : verte si 100%, rouge si déséquilibré */}
      <InfoRow
        label={t('total_label')}
        value={`${total.toFixed(1).replace(/\.0$/, '')}%`}
        tone={ok ? 'good' : 'danger'}
      />

      {/* Génération dynamique d'un champ de saisie pour chaque catégorie active */}
      {cats.map((c) => (
        <Input
          key={c.id}
          label={`${c.name} · %`}
          value={vals[c.id]}
          keyboardType="decimal-pad"
          onChangeText={(text) => {
            // Met à jour la valeur spécifique de cette catégorie
            setVals((prev) => ({ ...prev, [c.id]: text }));
            // Réinitialise la bannière de succès dès qu'une modification intervient
            setSaved(false);
          }}
        />
      ))}

      {/* Bannière d'erreur rouge affichée si le total s'éloigne de 100% */}
      {!ok ? (
        <AlertBanner
          tone="danger"
          title={t('pourcentages_total_100')}
          detail={t('actuellement_pourcent', { val: total.toFixed(1) })}
        />
      ) : null}

      {/* Bannière de succès verte affichée après la validation en base SQLite */}
      {saved ? (
        <AlertBanner
          tone="success"
          title={t('pourcentages_defaut_enregistres')}
          detail={t('utilisateurs_personnalisation_info')}
        />
      ) : null}

      {/* Bouton d'enregistrement vert : cliquable uniquement si le total est rigoureusement égal à 100% */}
      <Button
        label={t('enregistrer_pourcentages')}
        disabled={!ok}
        onPress={() => {
          // Écriture de la nouvelle répartition dans la table de configuration SQLite
          actions.setDefaultPercentages({
            ...db.defaultPercentages,
            ...nums,
          });
          // Affichage de la confirmation verte
          setSaved(true);
        }}
      />
    </Screen>
  );
}
