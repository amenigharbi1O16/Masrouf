import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BudgetCard, CategoryCard, ExpenseCard, TransactionRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, EmptyState, Eyebrow, LoadingScreen, SectionTitle } from '@/components/ui';
import { colors } from '@/constants/theme';
import { categoryName, currentBudget, pointsFor, summarize, userTxns } from '@/state/selectors';
import { useStore } from '@/state/store';
import { fmtDate, fmtDateLocale, fmtRange, money, monthNameLocale, parseISO, short } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import { getCategoryIcon } from '@/utils/categoryIcons';

/**
 * MISSION DE LA FONCTION : HomeScreen
 *   Écran principal et tableau de bord central de l'application Masrouf (`/(tabs)`).
 *   Aggrège les données financières du mois en cours : solde disponible, dépenses totales,
 *   jauge d'alerte, enveloppes de catégories et dernières transactions.
 *
 * RÔLE DANS L'APPLICATION :
 *   C'est le point d'atterrissage quotidien de l'utilisateur. Il pilote la gamification,
 *   détecte les périodes budgétaires réussies pour déclencher l'écran de félicitations,
 *   et fournit des raccourcis vers la création d'achats et de dépenses.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - En-tête de bienvenue personnalisé avec salutation horaire et prénom (ex: "Bonjour, Ahmed").
 *   - Carte de budget principale `<BudgetCard />` avec grand solde restant en DT, jauge de couleur
 *     et dates de validité.
 *   - Liste des enveloppes de catégories `<CategoryCard />` (avec bouton "Voir tout").
 *   - Liste des 4 transactions les plus récentes `<TransactionRow />` ou `<EmptyState />` si aucune dépense.
 *   - Bouton flottant FAB vert forêt en bas d'écran "＋ Ajouter achat".
 */
export default function HomeScreen() {
  // Outil de redirection et de changement de page
  const router = useRouter();

  // Accès à la base locale SQLite, au profil connecté et à la période centrale sélectionnée
  const { db, me, selectedBudget } = useStore();

  // Fonctions de traduction multilingue (français/anglais/arabe) et détection du sens d'écriture droite-à-gauche
  const { t, isRTL, langue, traduireCategorie } = useTranslation();

  // État local pour afficher plus ou moins de catégories dans le tableau de bord
  const [expanded, setExpanded] = useState(false);

  // La période sélectionnée est la référence centrale absolue de l'écran d'accueil
  const budget = selectedBudget;

  // Calcul statistique du budget (dépensé, restant, pourcentage consommé, état healthy/warning/exceeded)
  const sum = budget && me ? summarize(db, me.id, budget) : null;

  /**
   * 🏆 Détection de récompense (Gamification) :
   * Vérifie si l'utilisateur a réussi un budget sans le dépasser pour afficher l'écran festif de félicitations.
   */
  const reward = useMemo(() => {
    if (!me) return null;
    return (
      pointsFor(db, me).periods.find(
        (p) => p.success && !(me.celebratedBudgetIds ?? []).includes(p.budget.id)
      ) ?? null
    );
  }, [db, me]);

  // Si une période réussie est détectée, redirection automatique vers la page de félicitations
  useEffect(() => {
    if (reward) {
      router.push({ pathname: '/felicitations', params: { id: reward.budget.id } } as never);
    }
  }, [reward?.budget.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Récupération sécurisée des 4 transactions les plus récentes rattachées à la période centrale sélectionnée
  const txns = useMemo(() => {
    // Si aucun profil connecté n'est chargé, liste vide par précaution
    if (!me) return [];
    // Récupération de l'ensemble des transactions de l'utilisateur
    const all = userTxns(db, me.id);
    // Si aucun budget n'est actif, retourne les 4 premières transactions
    if (!budget) return all.slice(0, 4);
    // Filtrage rigoureux sur l'intervalle de dates du budget avec vérification d'existence
    return all
      .filter((t) => Boolean(t && t.date && t.date >= budget.start && t.date <= budget.end))
      .slice(0, 4);
  }, [db, me, budget]);

  // Si l'utilisateur n'est pas encore chargé depuis la mémoire, affichage du sablier animé (placé strictement après tous les hooks)
  if (!me) return <LoadingScreen />;

  // Vérification de la présence d'une période sélectionnée avec un budget alloué
  const hasBudget = Boolean(budget && Number(budget.total) > 0);

  // Filtrage des catégories associées au budget ayant une allocation définie
  const allocCats = budget
    ? Object.keys(budget.allocations).filter((id) => (budget.allocations[id] ?? 0) > 0)
    : [];

  // Découpage pour afficher soit les 2 premières catégories, soit l'ensemble si "Voir plus" est cliqué
  const shown = expanded ? allocCats : allocCats.slice(0, 2);
  const rest = allocCats.slice(2);
  const restSpent = rest.reduce((a, id) => a + (sum?.byCat[id] ?? 0), 0);
  const restAlloc = rest.reduce((a, id) => a + (budget?.allocations[id] ?? 0), 0);
  const d = budget ? parseISO(budget.start) : null;

  return (
    <Screen
      // Titre en haut de page avec salutation selon l'heure et prénom de l'utilisateur
      title={`${t('bonjour')}, ${me.name.split(' ')[0]}`}
      // Bouton flottant d'action principale (+ Ajouter un achat) actif uniquement si une période et un budget sont alloués
      fab={
        hasBudget
          ? {
              label: `＋ ${t('ajouter_un_achat')}`,
              onPress: () => router.push('/nouveau-produit'),
            }
          : undefined
      }
    >
      {budget && sum && d ? (
        <>
          {/* Libellé du mois et intervalle exact de dates de la période de budget sélectionnée */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
              {monthNameLocale(d.getUTCMonth(), langue).toUpperCase()} {d.getUTCFullYear()}  ·  {fmtRange(budget.start, budget.end, langue)}
            </Eyebrow>
            <Pressable
              onPress={() => router.push('/(tabs)/calendrier')}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.green }}>
                {t('calendrier')} {isRTL ? '‹' : '›'}
              </Text>
            </Pressable>
          </View>

          {/* Carte principale de budget avec jauge colorée */}
          <BudgetCard
            available={sum.left}
            spent={sum.spent}
            total={sum.total}
            pct={sum.pct}
            over={sum.status === 'exceeded' ? sum.over : undefined}
            range={fmtRange(budget.start, budget.end, langue)}
            onPress={() =>
              router.push({ pathname: '/budget-mois', params: { mode: 'edit', id: budget.id } } as never)
            }
          />

          {/* Bannière verte rassurante si le budget est bien tenu */}
          {sum.status === 'healthy' && (
            <AlertBanner
              tone="success"
              title={t('budget_se_porte_bien')}
              detail={t('budget_se_porte_bien_detail', { montant: money(sum.left) })}
            />
          )}

          {/* Bannière jaune d'avertissement dès que 80% du budget est consommé */}
          {sum.status === 'warning' && (
            <AlertBanner
              tone="warning"
              title={t('budget_alerte_80')}
              detail={t('budget_alerte_80_detail', { montant: money(sum.left) })}
            />
          )}

          {/* Bannière rouge critique en cas de dépassement réel du budget */}
          {sum.status === 'exceeded' && (
            <AlertBanner
              tone="danger"
              title={t('budget_depasse')}
              detail={t('budget_depasse_detail', { montant: money(sum.over) })}
            />
          )}

          {/* Titre de section : Vos catégories */}
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('vos_categories')}
          </SectionTitle>

          {/* Cartes individuelles des catégories affichées avec icône descriptive */}
          {shown.map((id) => {
            // Récupération du libellé de référence de la catégorie
            const rawCatName = categoryName(db, id);
            // Traduction automatique dans la langue courante
            const translatedCatName = traduireCategorie(rawCatName);
            // Résolution de l'icône évocatrice dédiée (ex: restaurant, voiture, reçu)
            const catIcon = getCategoryIcon(rawCatName);

            return (
              // Carte de catégorie affichant uniquement son nom et son budget alloué
              <CategoryCard
                key={id}
                name={translatedCatName}
                icon={catIcon}
                allocation={budget.allocations[id] ?? 0}
              />
            );
          })}

          {/* Ligne récapitulative des autres catégories lorsque la liste est repliée (montre uniquement le budget alloué) */}
          {!expanded && rest.length > 0 && (
            <Pressable
              onPress={() => setExpanded(true)}
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                paddingVertical: 4,
              }}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.muted,
                  flex: 1,
                  textAlign: isRTL ? 'right' : 'left',
                }}
                numberOfLines={1}
              >
                {rest.map((id) => traduireCategorie(categoryName(db, id))).join(' · ')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.forest }}>
                {short(restAlloc)} DT
              </Text>
            </Pressable>
          )}

          {/* Bouton pour replier la liste des catégories */}
          {expanded && rest.length > 0 && (
            <Pressable
              onPress={() => setExpanded(false)}
              accessibilityRole="button"
              style={{ alignSelf: isRTL ? 'flex-end' : 'flex-start' }}
            >
              <Text style={{ fontSize: 13, color: colors.green, fontWeight: '600' }}>
                {t('voir_moins')}
              </Text>
            </Pressable>
          )}
        </>
      ) : (
        /* Affichage de l'état vide si l'utilisateur n'a pas encore créé de budget */
        <>
          <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('aucun_budget_periode').toUpperCase()}
          </Eyebrow>
          <EmptyState
            icon="wallet-outline"
            title={t('donner_direction_dinar')}
            detail={t('aucun_budget_actif_detail')}
            actionLabel={t('creer_budget')}
            onAction={() => router.push('/budget-mois')}
          />
        </>
      )}

      {/* Titre de section : Transactions récentes */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('transactions_recentes')}
      </SectionTitle>

      {/* Affichage des transactions récentes ou état vide si aucune opération n'a encore été saisie */}
      {(!txns || txns.length === 0) ? (
        // Composant d'état vide invitant l'utilisateur à créer sa première dépense
        <EmptyState
          icon="receipt-outline"
          title={t('aucune_transaction_enregistree')}
          detail={t('premiere_transaction_detail')}
        />
      ) : (
        // Parcours et affichage sécurisé de chaque transaction récente filtrée
        txns
          .filter((item): item is typeof item & { id: string } => Boolean(item && typeof item === 'object' && item.id))
          .map((tItem, index) => {
            // Date sécurisée de l'opération
            const safeDate = tItem.date || '';
            // Détails textuels (magasin ou note)
            const safeDetail = tItem.detail || '';
            // Titre descriptif
            const safeTitle = tItem.title || 'Transaction';
            // Montant numérique garanti
            const safeAmount = Number(tItem.amount) || 0;
            // Libellé de date localisé (ex: "12 nov. 2026")
            const formattedDate = safeDate ? fmtDateLocale(safeDate, langue) : '';
            // Concaténation élégante du magasin et de la date
            const fullDetail = [safeDetail, formattedDate].filter(Boolean).join(' · ');
            // Clé React garantie unique combinant le type, l'identifiant et l'index (évite toute collision)
            const uniqueKey = `${tItem.kind || 'txn'}-${tItem.id}-${index}`;

            // Branche 1 : Transaction d'achat de produits avec ticket détaillé
            if (tItem.kind === 'purchase') {
              return (
                <TransactionRow
                  key={uniqueKey}
                  title={safeTitle}
                  detail={fullDetail}
                  amount={`−${money(safeAmount).replace(' DT', '')}`}
                  onPress={() =>
                    router.push({ pathname: '/modifier-achat', params: { id: tItem.id } } as never)
                  }
                />
              );
            }

            // Branche 2 : Dépense directe avec icône personnalisée selon la catégorie
            return (
              <ExpenseCard
                key={uniqueKey}
                title={safeTitle}
                detail={fullDetail}
                icon={getCategoryIcon(categoryName(db, tItem.categoryId), 'expense')}
                amount={money(safeAmount)}
                onPress={() =>
                  router.push({ pathname: '/modifier-depense', params: { id: tItem.id } } as never)
                }
              />
            );
          })
      )}

      {/* Bouton secondaire d'ajout de dépense simple */}
      <Button
        label={t('ajouter_depense_simple')}
        variant="secondary"
        onPress={() => router.push('/nouvelle-depense')}
      />
      <View style={{ height: 4 }} />
    </Screen>
  );
}
