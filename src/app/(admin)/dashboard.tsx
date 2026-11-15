/**
 * FICHIER : src/app/(admin)/dashboard.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-004
 * ÉCRAN : ECRAN-ADM-01 (Tableau de Bord Administrateur)
 *
 * MISSION DU FICHIER :
 * Présenter le tableau de bord synthétique de l'administrateur système.
 * Il regroupe l'ensemble des indicateurs quantitatifs clés de la base de données
 * tout en respectant une règle de confidentialité absolue : aucun montant monétaire
 * individuel ni ticket de caisse privé n'est affiché.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il offre au responsable technique ou au jury une vision panoramique de l'activité
 * globale de Masrouf (nombre d'inscrits, comptes suspendus, volumétrie des achats
 * et dépenses) et sert de plaque tournante pour naviguer vers les autres outils de gestion.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand titre traduit 'Vue d'ensemble' avec un badge 'ADMINISTRATEUR'.
 * - Une grille responsive de 8 tuiles statistiques blanches avec de grands chiffres vert forêt
 *   (Comptes totaux, Comptes actifs, Comptes suspendus, Périodes de budget, Produits suivis,
 *   Achats totaux, Dépenses fixes, Catégories actives).
 * - Une bannière d'information bleue/menthe rappelant le secret strict de la vie privée.
 * - Quatre grands boutons d'accès rapide vers les modules d'administration :
 *   'Utilisateurs', 'Catégories', 'Pourcentages par défaut' et 'Règles des points'.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
// Composant conteneur d'écran avec gestion du défilement et marges adaptées
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, SectionTitle } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, bordures et arrondis)
import { colors, radius } from '@/constants/theme';
// Magasin d'état global connecté à la base SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation (FR, EN, AR) et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DE LA FONCTION :
 * Afficher une carte blanche individuelle présentant une métrique quantitative.
 *
 * RÔLE DANS L'APPLICATION :
 * Composant de présentation réutilisable pour structurer les compteurs statistiques du tableau de bord.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Une boîte blanche avec des coins arrondis (radius.card) contenant le nombre en très grand (taille 28)
 * en vert forêt (#102B27) et son intitulé explicatif en petit en dessous en gris ardoise.
 */
function Stat({
  label,
  value,
  isRTL,
}: {
  label: string;
  value: number;
  isRTL: boolean;
}) {
  return (
    // Boîte de la statistique occupant environ la moitié de la largeur de l'écran pour former une grille à 2 colonnes
    <View
      style={{
        width: '48%',
        flexGrow: 1,
        backgroundColor: colors.white,
        borderRadius: radius.card,
        padding: 16,
        gap: 4,
        alignItems: isRTL ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Valeur numérique mise en évidence en grand caractère gras vert forêt */}
      <Text style={{ fontSize: 28, fontWeight: '600', color: colors.forest }}>
        {value}
      </Text>
      {/* Intitulé traduit de la métrique en police discrète */}
      <Text
        style={{
          fontSize: 12,
          color: colors.muted,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * MISSION DU COMPOSANT :
 * Assembler et afficher le tableau de bord complet d'administration.
 *
 * RÔLE DANS L'APPLICATION :
 * Calcule dynamiquement les métriques agrégées depuis le store SQLite et gère les redirections de navigation.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'écran d'accueil administrateur complet avec ses tuiles, sa bannière de confidentialité et ses boutons.
 */
export default function AdminDashboard() {
  // Hook de navigation pour se déplacer vers les autres écrans d'administration
  const router = useRouter();
  // Données globales de la base SQLite
  const { db } = useStore();
  // Traductions dynamiques
  const { t, isRTL } = useTranslation();

  // Filtrage pour isoler les utilisateurs normaux des comptes administrateurs
  const people = db.users.filter((u) => u.role === 'user');

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('vue_ensemble_admin')}>
      {/* Surtitre en lettres majuscules identifiant le rôle administrateur */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('administrateur').toUpperCase()}
      </Eyebrow>

      {/* Grille de statistiques agrégées (8 indicateurs au total) */}
      <View
        style={{
          // Inverse le sens des colonnes en mode arabe RTL
          flexDirection: isRTL ? 'row-reverse' : 'row',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {/* Tuile 1 : Nombre total de comptes utilisateurs inscrits */}
        <Stat label={t('stat_comptes')} value={people.length} isRTL={isRTL} />
        {/* Tuile 2 : Nombre d'utilisateurs actuellement actifs */}
        <Stat
          label={t('stat_comptes_actifs')}
          value={people.filter((u) => u.active).length}
          isRTL={isRTL}
        />
        {/* Tuile 3 : Nombre de comptes ayant été suspendus par l'administrateur */}
        <Stat
          label={t('stat_suspendus')}
          value={people.filter((u) => !u.active).length}
          isRTL={isRTL}
        />
        {/* Tuile 4 : Nombre total de périodes de budget créées par les utilisateurs */}
        <Stat
          label={t('stat_periodes_budget')}
          value={db.budgets.length}
          isRTL={isRTL}
        />
        {/* Tuile 5 : Nombre d'articles d'épicerie différents répertoriés */}
        <Stat
          label={t('stat_produits_suivis')}
          value={db.products.length}
          isRTL={isRTL}
        />
        {/* Tuile 6 : Nombre de tickets de caisse et achats individuels enregistrés */}
        <Stat
          label={t('stat_achats_enregistres')}
          value={db.purchases.length}
          isRTL={isRTL}
        />
        {/* Tuile 7 : Nombre de dépenses directes (factures, loyers) notées */}
        <Stat
          label={t('stat_depenses_enregistrees')}
          value={db.expenses.length}
          isRTL={isRTL}
        />
        {/* Tuile 8 : Nombre de catégories actives dans le système */}
        <Stat
          label={t('stat_categories_actives')}
          value={db.categories.filter((c) => c.active).length}
          isRTL={isRTL}
        />
      </View>

      {/* Bannière informative garantissant le secret des transactions personnelles */}
      <AlertBanner
        tone="info"
        title={t('admin_confidentialite_titre')}
        detail={t('admin_confidentialite_detail')}
      />

      {/* Titre de la section des actions de configuration */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('gerer_section')}
      </SectionTitle>

      {/* Bouton vert forêt : navigation vers la liste et la gestion des comptes utilisateurs */}
      <Button
        label={t('utilisateurs_admin')}
        onPress={() => router.push('/(admin)/utilisateurs')}
      />
      {/* Bouton secondaire clair : navigation vers le catalogue des catégories */}
      <Button
        label={t('categories_admin')}
        variant="secondary"
        onPress={() => router.push('/(admin)/categories')}
      />
      {/* Bouton secondaire clair : navigation vers le calibrage des pourcentages par défaut */}
      <Button
        label={t('pourcentages_defaut')}
        variant="secondary"
        onPress={() => router.push('/(admin)/pourcentages')}
      />
      {/* Bouton secondaire clair : navigation vers les paliers et barèmes de points de fidélité */}
      <Button
        label={t('regles_points_admin')}
        variant="secondary"
        onPress={() => router.push('/(admin)/points-regles')}
      />
    </Screen>
  );
}
