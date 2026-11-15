/**
 * FICHIER : src/app/(tabs)/calendrier.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-012
 * ÉCRAN : ECRAN-TAB-03 (Calendrier Financier et Historique Annuel)
 *
 * RÔLE DU COMPOSANT :
 * Présente une vue matricielle des 12 mois de l'année sélectionnée, avec pour chaque mois :
 * - Le total des dépenses réelles calculé
 * - Une jauge de consommation budgétaire proportionnelle au total des budgets du mois
 * - La liste détaillée des périodes budgétaires actives pour le mois sélectionné
 *
 * ACTIONS ASSOCIÉES :
 * - ACTION-USER-08 : Naviguer d'une année à l'autre (boutons ‹ et ›)
 * - ACTION-USER-09 : Sélectionner un mois pour déplier ses périodes de budget
 * - ACTION-USER-10 : Cliquer sur une période pour l'ouvrir dans l'éditeur de budget
 * - Navigation vers la création d'une nouvelle période de budget (`/budget-mois`)
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Sélecteur d'année centré avec flèches latérales, grille 2 colonnes des 12 mois (la carte active
 * est en fond vert forêt `forest`, les inactives en fond blanc avec barre de progression),
 * et section de détail en bas avec liste de cartes `InfoRow` pour chaque budget.
 */

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
// Ligne d'information synthétique bicolore
import { InfoRow } from '@/components/Cards';
// Composant conteneur d'écran avec menu tiroir
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Body, Button, EmptyState, Eyebrow, SectionTitle } from '@/components/ui';
// Constantes de thème (couleurs écologiques, arrondis)
import { colors, radius } from '@/constants/theme';
// Sélecteurs de calcul financier SQLite (dépenses mensuelles, budgets chevauchants, synthèse)
import { budgetsOverlapping, monthlySpend, summarize } from '@/state/selectors';
// Magasin d'état global SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de date et montant
import { addDays, fmtRange, money, pad } from '@/utils/format';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DE LA FONCTION : CalendarScreen
 *   Composant principal de l'écran Calendrier Financier (`/(tabs)/calendrier`).
 *   Calcule la ventilation annuelle des dépenses mois par mois, gère la navigation
 *   entre les années, et affiche les périodes budgétaires rattachées à chaque mois.
 *
 * RÔLE DANS L'APPLICATION :
 *   Offre à l'utilisateur une vision macroscopique et rétrospective de sa gestion financière
 *   sur l'ensemble des 12 mois de l'année.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - En-tête avec navigation d'année (flèches ‹ et › entourant l'année en grand).
 *   - Grille 2 colonnes des 12 mois avec jauges de consommation colorées et montants en DT.
 *   - Section détaillée du mois sélectionné avec cartes `InfoRow` pour chaque budget actif.
 *   - Bouton d'action vert forêt "＋ Définir un budget" pour planifier une nouvelle période.
 */
export default function CalendarScreen() {
  const router = useRouter();
  const { db, me } = useStore();
  const { t, isRTL } = useTranslation();

  const now = new Date();
  // État local : année courante sélectionnée (par défaut l'année actuelle)
  const [year, setYear] = useState(now.getFullYear());
  // État local : index du mois sélectionné (0 pour Janvier, 11 pour Décembre)
  const [month, setMonth] = useState<number | null>(now.getMonth());

  // Sécurité : si aucun utilisateur n'est connecté, ne rien afficher
  if (!me) return null;

  // Calcul du tableau des dépenses réelles pour les 12 mois de l'année
  const spend = monthlySpend(db, me.id, year);

  /**
   * Calcule les périodes de budget de l'utilisateur qui chevauchent le mois donné.
   */
  const monthBudgets = (m: number) => {
    const start = `${year}-${pad(m + 1)}-01`;
    const end = addDays(
      `${m === 11 ? year + 1 : year}-${pad(m === 11 ? 1 : m + 2)}-01`,
      -1
    );
    return budgetsOverlapping(db, me.id, start, end);
  };

  /**
   * Calcule le ratio de consommation budgétaire pour un mois (dépensé / total alloué).
   */
  const ratio = (m: number) => {
    const total = monthBudgets(m).reduce((a, b) => a + b.total, 0);
    return total > 0 ? Math.min(1, spend[m] / total) : 0;
  };

  // Liste des périodes pour le mois actuellement sélectionné
  const selected = month === null ? [] : monthBudgets(month);

  /**
   * Retourne le nom traduit du mois (janvier à décembre).
   */
  const getMonthName = (m: number) => {
    return t(`mois_${m + 1}`);
  };

  return (
    // ECRAN-TAB-03-01 : Conteneur principal avec titre traduit
    <Screen title={t('calendrier')}>
      {/* ECRAN-TAB-03-02 : En-tête surtitre */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('votre_annee_financiere')}
      </Eyebrow>

      {/* ECRAN-TAB-03-03 : Sélecteur d'année avec navigation interactive */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* ACTION-USER-08 : Année précédente */}
        <Pressable
          onPress={() => setYear((y) => y - 1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('annee_precedente')}
        >
          <Text style={{ fontSize: 28, color: colors.forest }}>
            {isRTL ? '›' : '‹'}
          </Text>
        </Pressable>

        {/* Année affichée */}
        <Text style={{ fontSize: 22, fontWeight: '600', color: colors.forest }}>
          {year}
        </Text>

        {/* ACTION-USER-08 : Année suivante */}
        <Pressable
          onPress={() => setYear((y) => y + 1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('annee_suivante')}
        >
          <Text style={{ fontSize: 28, color: colors.forest }}>
            {isRTL ? '‹' : '›'}
          </Text>
        </Pressable>
      </View>

      {/* ECRAN-TAB-03-04 : Sous-titre descriptif */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('choisir_mois_explorer')}
      </Body>

      {/* ECRAN-TAB-03-05 : Grille des 12 mois de l'année */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {Array.from({ length: 12 }, (_, m) => {
          const on = month === m;
          const currentRatio = ratio(m);
          return (
            // ACTION-USER-09 : Sélection d'un mois au toucher
            <Pressable
              key={m}
              onPress={() => setMonth(m)}
              accessibilityRole="button"
              style={{
                width: '48%',
                flexGrow: 1,
                backgroundColor: on ? colors.forest : colors.white,
                borderRadius: radius.card,
                padding: 14,
                gap: 6,
                alignItems: isRTL ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Nom du mois traduit */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: on ? colors.white : colors.forest,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {getMonthName(m)}
              </Text>

              {/* Total des dépenses du mois */}
              <Text
                style={{
                  fontSize: 12,
                  color: on ? colors.mint : colors.muted,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {Math.round(spend[m])} DT
              </Text>

              {/* Jauge de progression du budget */}
              <View
                style={{
                  width: '100%',
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: on ? colors.track : colors.border,
                }}
              >
                <View
                  style={{
                    height: 5,
                    borderRadius: 3,
                    width: `${currentRatio * 100}%`,
                    backgroundColor: on
                      ? colors.mint
                      : currentRatio >= 1
                      ? colors.coral
                      : colors.green,
                    alignSelf: isRTL ? 'flex-end' : 'flex-start',
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ECRAN-TAB-03-06 : Détail des périodes du mois sélectionné */}
      {month !== null && (
        <>
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {getMonthName(month)} {year}
          </SectionTitle>

          {selected.length === 0 ? (
            // État vide si aucune période définie pour ce mois
            <EmptyState
              icon="calendar-outline"
              title={t('aucun_budget_periode')}
              detail={t('aucune_periode_ce_mois')}
              actionLabel={t('creer_periode_budget')}
              onAction={() => router.push('/budget-mois')}
            />
          ) : (
            // Liste des périodes de budget chevauchant le mois
            selected.map((b) => {
              const s = summarize(db, me.id, b);
              return (
                // ACTION-USER-10 : Accéder à l'édition de la période au toucher
                <Pressable
                  key={b.id}
                  onPress={() =>
                    router.push({
                      pathname: '/budget-mois',
                      params: { mode: 'edit', id: b.id },
                    } as never)
                  }
                  accessibilityRole="button"
                >
                  <InfoRow
                    label={fmtRange(b.start, b.end)}
                    value={`${money(s.spent, 0)} / ${money(b.total, 0)}`}
                    tone={s.status === 'exceeded' ? 'danger' : undefined}
                  />
                </Pressable>
              );
            })
          )}
        </>
      )}

      {/* ECRAN-TAB-03-07 : Bouton de création d'une nouvelle période */}
      <Button
        label={t('creer_periode_budget')}
        variant="secondary"
        onPress={() => router.push('/budget-mois')}
      />
    </Screen>
  );
}
