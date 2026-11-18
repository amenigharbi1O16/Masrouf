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
  const { db, me, selectedBudgetId, actions } = useStore();
  const { t, isRTL, langue } = useTranslation();

  // Date actuelle du système servant de point d'ancrage pour l'année et le mois
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
   * Calcule avec exactitude les dates de début et de fin d'un mois civil donné,
   * gérant rigoureusement février (années bissextiles à 29 jours), les mois de 30/31 jours et les transitions d'années.
   */
  const getMonthExactRange = (y: number, m: number) => {
    const start = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    return { start, end, lastDay };
  };

  /**
   * Détermine si un mois donné est déjà passé par rapport à la date réelle courante (mois clos / consultation seule).
   */
  const isPastMonth = (y: number, m: number) => {
    const currentY = now.getFullYear();
    const currentM = now.getMonth();
    return y < currentY || (y === currentY && m < currentM);
  };

  /**
   * Calcule les périodes de budget de l'utilisateur qui chevauchent le mois donné.
   */
  const monthBudgets = (m: number) => {
    const { start, end } = getMonthExactRange(year, m);
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
  const isSelectedPast = month !== null && isPastMonth(year, month);
  const selectedRange = month !== null ? getMonthExactRange(year, month) : { start: '', end: '', lastDay: 30 };

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
                flexBasis: '47%',
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
              detail={isSelectedPast ? t('periode_cloturee_detail') : t('aucune_periode_ce_mois')}
              actionLabel={isSelectedPast ? undefined : t('creer_periode_budget')}
              onAction={
                isSelectedPast
                  ? undefined
                  : () =>
                      router.push({
                        pathname: '/budget-mois',
                        params: {
                          defaultStart: selectedRange.start,
                          defaultEnd: selectedRange.end,
                        },
                      } as never)
              }
            />
          ) : (
            // Liste des périodes de budget chevauchant le mois avec sélection centrale
            selected.map((b) => {
              const s = summarize(db, me.id, b);
              const isActive = selectedBudgetId === b.id;
              return (
                <View
                  key={b.id}
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isActive ? colors.green : colors.border,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: colors.forest,
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        {fmtRange(b.start, b.end, langue)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: s.status === 'exceeded' ? colors.coral : colors.muted,
                          fontWeight: '600',
                          marginTop: 2,
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        {money(s.spent, 0)} / {money(b.total, 0)}
                      </Text>
                    </View>

                    {isActive && (
                      <View
                        style={{
                          backgroundColor: '#E8F5E9',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.green,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.green }}>
                          ✓ Active
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    {/* Bouton d'action permettant de définir cette période comme référence centrale dans l'application */}
                    {!isActive && (
                      <Pressable
                        onPress={() => {
                          actions.setSelectedBudgetId(b.id);
                          router.push('/(tabs)');
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: colors.forest,
                          paddingVertical: 8,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                        accessibilityRole="button"
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                          Sélectionner comme référence
                        </Text>
                      </Pressable>
                    )}

                    {/* Badge grisé pour les mois révolus où la période budgétaire est désormais clôturée */}
                    {isSelectedPast ? (
                      <View
                        style={{
                          paddingVertical: 7,
                          paddingHorizontal: 12,
                          backgroundColor: '#F5F5F5',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#E0E0E0',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>
                          {t('periode_cloturee_badge')}
                        </Text>
                      </View>
                    ) : (
                      // Bouton d'édition ouvrant l'éditeur de budget pour réajuster les montants de la période
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/budget-mois',
                            params: { mode: 'edit', id: b.id },
                          } as never)
                        }
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          backgroundColor: '#EFEFEF',
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                        accessibilityRole="button"
                      >
                        <Text style={{ color: colors.forest, fontSize: 12, fontWeight: '600' }}>
                          {t('modifier')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </>
      )}

      {/* Marge inférieure de sécurité */}
      <View style={{ height: 16 }} />
    </Screen>
  );
}
