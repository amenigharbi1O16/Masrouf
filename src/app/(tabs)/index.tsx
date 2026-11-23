import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
// Composants de base de React Native pour la mise en page, les boutons tactiles et les alertes natives
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BudgetCard, CategoryCard, ExpenseCard, TransactionRow } from '@/components/Cards';
// Modal de création rapide d'une catégorie personnalisée
import { CustomCategoryModal } from '@/components/CustomCategoryModal';
// Modal de saisie vocale intelligente pour tous les types d'utilisateurs
import { VoiceTransactionModal } from '@/components/VoiceTransactionModal';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, EmptyState, Eyebrow, SectionTitle } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { categoryConsumptionStats, categoryName, pointsFor, summarize } from '@/state/selectors';
import { useStore } from '@/state/store';
import { fmtDateLocale, fmtRange, money, monthNameLocale, parseISO, short } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import { getCategoryIcon } from '@/utils/categoryIcons';

/**
 * MISSION DE LA FONCTION : HomeScreen
 *   Écran d'accueil principal et tableau de bord central de Masrouf (`/(tabs)`).
 *   Fournit une vue d'ensemble complète et unifiée des finances du foyer ou de l'utilisateur :
 *   1. Carte de budget principale : démarre à 0.000 DT lorsqu'aucun budget n'a été attribué.
 *   2. Bouton "Ajouter une catégorie" placé exactement sous le cadre vert à droite.
 *   3. Deux actions clairement distinctes sans duplication :
 *      - "Ajouter un achat / produit"
 *      - "Ajouter une dépense"
 *   4. Suivi budgétaire des enfants pour le parent (alloué, dépensé, restant, %).
 *   5. Liste des dernières transactions réelles de la base SQLite.
 *   6. Bouton microphone en bas de l'écran pour la saisie vocale intelligente (bilingue FR/AR).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - En-tête personnalisé avec salutation selon l'heure.
 *   - Carte de budget verte Masrouf (0.000 DT par défaut si vierge).
 *   - Bouton "+ Catégorie" sous la carte à droite.
 *   - Barre d'actions à deux boutons (Achat vs Dépense).
 *   - Progression des enveloppes catégorielles et des budgets enfants.
 *   - Historique des transactions récentes.
 *   - Bouton microphone en bas pour la dictée vocale.
 */
export default function HomeScreen() {
  // Outil de navigation impérative Expo Router
  const router = useRouter();

  // Paramètres passés via la navigation (ex: message de succès et ancre de défilement)
  const params = useLocalSearchParams<{
    categorySuccessMsg?: string;
    budgetSuccessMsg?: string;
    scrollToCategories?: string;
    t?: string;
  }>();

  const scrollRef = useRef<any>(null);
  const categoriesY = useRef<number>(0);

  // Données globales de la base SQLite et profil utilisateur connecté
  const { db, me, selectedBudget } = useStore();

  // Système d'internationalisation (FR, EN, AR) et détection du sens d'écriture RTL
  const { t, isRTL, langue, traduireCategorie } = useTranslation();

  // État d'expansion pour afficher toutes les catégories ou seulement les premières
  const [expanded, setExpanded] = useState(false);

  // Contrôle d'ouverture de la modale de création d'une nouvelle catégorie
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  // Message de succès après ajout d'une catégorie
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);

  // Réception et affichage du message de succès avec défilement vers la section des catégories
  useEffect(() => {
    const msg = params.categorySuccessMsg || params.budgetSuccessMsg;
    if (msg) {
      setCategorySuccess(msg);
      const timer = setTimeout(() => {
        if (categoriesY.current > 0) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, categoriesY.current - 20),
            animated: true,
          });
        }
      }, 250);
      const clearTimer = setTimeout(() => {
        setCategorySuccess(null);
      }, 6000);
      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [params.categorySuccessMsg, params.budgetSuccessMsg, params.t]);

  // Contrôle d'ouverture de la modale de saisie vocale intelligente
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Référence de période active (peut être null si aucun budget n'a encore été créé)
  const budget = selectedBudget;

  // Calcul statistique réel du budget sélectionné
  const sum = budget && me ? summarize(db, me.id, budget) : null;

  // Date du jour et bornes du mois courant pour affichage lorsque aucun budget n'est créé
  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const defaultRangeText = fmtRange(currentMonthStart, currentMonthEnd, langue);

  // Valeurs budgétaires garanties réelles (0 lorsqu'aucun budget n'a été attribué)
  const isChild = me?.role === 'child' || me?.accountType === 'child';
  const childBudget = isChild ? (budget || db.budgets.find((b) => b.userId === me.id)) : null;
  const childSpent = isChild
    ? db.purchases.filter((p) => p.userId === me.id).reduce((s, p) => s + p.price, 0) +
      db.expenses.filter((e) => e.userId === me.id).reduce((s, e) => s + e.amount, 0)
    : 0;
  const childTotal = isChild ? (childBudget?.total || me?.allocatedTotal || me?.balance || me?.budgetMensuel || 0) : 0;
  const childAvailable = isChild
    ? (me?.balance !== undefined ? me.balance : Math.max(0, childTotal - childSpent))
    : 0;

  const availableAmount = isChild ? childAvailable : (sum ? sum.left : 0);
  const spentAmount = isChild ? (sum ? sum.spent : childSpent) : (sum ? sum.spent : 0);
  const totalBudgetAmount = isChild ? childTotal : (sum ? sum.total : 0);
  const consumedPct = totalBudgetAmount > 0 ? Math.round((spentAmount / totalBudgetAmount) * 100) : 0;
  const displayRange = budget ? fmtRange(budget.start, budget.end, langue) : defaultRangeText;

  // Liste des enfants rattachés au parent
  const myChildren = useMemo(() => {
    if (!me || (me.role !== 'parent' && me.role !== 'admin')) return [];
    return db.users.filter(
      (u) => u.role === 'child' && (u.parentId === me.id || u.familyId === me.familyId)
    );
  }, [db.users, me]);

  // Synthèse de la progression de chaque enfant sans exposer leurs achats détaillés
  const childrenProgress = useMemo(() => {
    if (myChildren.length === 0) return [];
    const activeStart = budget?.start || currentMonthStart;
    const activeEnd = budget?.end || currentMonthEnd;

    return myChildren.map((ch) => {
      const chBudget = db.budgets.find(
        (b) => b.userId === ch.id && b.start === activeStart
      );
      const allocated = chBudget?.total || ch.allocatedTotal || 0;
      const chExpenses = db.expenses
        .filter((e) => e.userId === ch.id && e.date >= activeStart && e.date <= activeEnd)
        .reduce((s, e) => s + e.amount, 0);
      const chPurchases = db.purchases
        .filter((p) => p.userId === ch.id && p.date >= activeStart && p.date <= activeEnd)
        .reduce((s, p) => s + p.price, 0);
      const spent = chExpenses + chPurchases;
      const remaining = Math.max(0, allocated - spent);
      const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

      return {
        child: ch,
        allocated,
        spent,
        remaining,
        pct,
      };
    });
  }, [myChildren, db.budgets, db.expenses, db.purchases, budget, currentMonthStart, currentMonthEnd]);

  // Détection de récompense (Gamification)
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
      router.push({
        pathname: '/felicitations',
        params: { id: reward.budget.id },
      } as never);
    }
  }, [reward, router]);

  // Transactions récentes de l'utilisateur connecté
  const txns = useMemo(() => {
    if (!me) return [];
    const activeStart = budget?.start || currentMonthStart;
    const activeEnd = budget?.end || currentMonthEnd;

    // Récupération des achats de l'utilisateur
    const myPurchases = db.purchases
      .filter((p) => p.userId === me.id && p.date >= activeStart && p.date <= activeEnd)
      .map((p) => {
        const prod = db.products.find((pr) => pr.id === p.productId);
        return {
          id: p.id,
          kind: 'purchase' as const,
          title: prod?.name || 'Achat',
          detail: p.store || '',
          amount: p.price,
          date: p.date,
          categoryId: prod?.categoryId || 'food',
        };
      });

    // Récupération des dépenses directes de l'utilisateur
    const myExpenses = db.expenses
      .filter((e) => e.userId === me.id && e.date >= activeStart && e.date <= activeEnd)
      .map((e) => ({
        id: e.id,
        kind: 'expense' as const,
        title: e.note || categoryName(db, e.categoryId),
        detail: categoryName(db, e.categoryId),
        amount: e.amount,
        date: e.date,
        categoryId: e.categoryId,
      }));

    // Fusion et tri décroissant par date
    return [...myPurchases, ...myExpenses].sort((a, b) => b.date.localeCompare(a.date));
  }, [db, me, budget, currentMonthStart, currentMonthEnd]);

  const activeBudget = isChild ? (childBudget || budget) : budget;

  // Liste des catégories à afficher sur le tableau de bord :
  // Priorité aux catégories suivies par l'utilisateur (me.categoryIds),
  // complétées par toute catégorie présente dans l'enveloppe du budget actif
  // Placé AVANT tout return conditionnel pour respecter strictement les règles des Hooks React
  const displayCategoryIds = useMemo(() => {
    const followed = me?.categoryIds ?? [];
    if (!activeBudget) return followed;
    const allocKeys = Object.keys(activeBudget.allocations || {}).filter(
      (id) => (activeBudget.allocations[id] ?? 0) > 0
    );
    return Array.from(new Set([...followed, ...allocKeys]));
  }, [me?.categoryIds, activeBudget]);

  const shown = expanded ? displayCategoryIds : displayCategoryIds.slice(0, 3);
  const rest = displayCategoryIds.slice(3);
  const restAlloc = rest.reduce((a, id) => a + (activeBudget?.allocations?.[id] ?? 0), 0);

  const displayMonthDate = budget ? parseISO(budget.start) : now;

  // Sécurité : si aucun utilisateur n'est connecté
  if (!me) return null;

  return (
    <Screen
      // Salutation dynamique avec le nom de l'utilisateur
      title={`${t('bonjour')}, ${me.name.split(' ')[0]}`}
      scrollRef={scrollRef}
      // Aucun bouton flottant redondant : actions uniques et distinctes intégrées directement dans la page
    >
      {/* 1. En-tête de période calendaire */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {monthNameLocale(displayMonthDate.getUTCMonth(), langue).toUpperCase()}{' '}
          {displayMonthDate.getUTCFullYear()} · {displayRange}
        </Eyebrow>
        <Pressable
          onPress={() => router.push('/(tabs)/calendrier')}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.forest }}>
            {t('calendrier')} {isRTL ? '‹' : '›'}
          </Text>
        </Pressable>
      </View>

      {/* 2. Carte principale de Budget (commence à 0 lorsqu'aucun budget n'a été alloué) */}
      <BudgetCard
        available={availableAmount}
        spent={spentAmount}
        total={totalBudgetAmount}
        pct={consumedPct}
        over={sum && sum.status === 'exceeded' ? sum.over : undefined}
        range={displayRange}
        onPress={() => {
          // Si compte enfant : navigation vers la répartition si budget alloué disponible
          if (isChild) {
            if (totalBudgetAmount > 0) {
              router.push({
                pathname: '/allocation-budget',
                params: {
                  start: childBudget?.start || budget?.start || currentMonthStart,
                  end: childBudget?.end || budget?.end || currentMonthEnd,
                  total: String(totalBudgetAmount),
                },
              } as never);
              return;
            }
            Alert.alert(t('compte_enfant'), t('budget_alloue_par_parent'));
            return;
          }
          // Si aucun budget créé ou modification : navigation vers l'écran de configuration du budget
          if (budget) {
            router.push({ pathname: '/budget-mois', params: { mode: 'edit', id: budget.id } } as never);
          } else {
            router.push('/budget-mois');
          }
        }}
        partitionButton={
          isChild && totalBudgetAmount > 0
            ? {
                label: isRTL
                  ? 'تقسيم الميزانية على الفئات'
                  : 'Partitionner mon budget sur les catégories',
                onPress: () => {
                  router.push({
                    pathname: '/allocation-budget',
                    params: {
                      start: childBudget?.start || budget?.start || currentMonthStart,
                      end: childBudget?.end || budget?.end || currentMonthEnd,
                      total: String(totalBudgetAmount),
                    },
                  } as never);
                },
              }
            : undefined
        }
      />

      {/* 3. Bouton "Ajouter une catégorie" positionné exactement sous le cadre vert du budget, à droite */}
      <View
        // Disposition horizontale inversée en arabe (RTL)
        style={{
          // Direction adaptée au sens de lecture
          flexDirection: isRTL ? 'row-reverse' : 'row',
          // Alignement à droite (ou à gauche en RTL)
          justifyContent: 'flex-end',
          // Espacement vertical sous le cadre vert
          marginTop: 8,
          // Marge inférieure avant les actions
          marginBottom: 10,
        }}
      >
        {/* Bouton tactile d'ouverture du modal de sélection ou création de catégorie */}
        <TouchableOpacity
          // Déclencheur d'ouverture du modal de catégorie
          onPress={() => setCategoryModalOpen(true)}
          // Style en pilule menthe avec bordure discrète
          style={{
            // Direction d'affichage des icônes et textes
            flexDirection: isRTL ? 'row-reverse' : 'row',
            // Alignement centré des éléments
            alignItems: 'center',
            // Fond vert menthe clair distinctif
            backgroundColor: colors.mint,
            // Rembourrage vertical
            paddingVertical: 7,
            // Rembourrage horizontal
            paddingHorizontal: 12,
            // Forme en pilule arrondie
            borderRadius: radius.pill,
            // Bordure fine
            borderWidth: 1,
            // Couleur de bordure subtile
            borderColor: colors.border,
          }}
          // Opacité réduite au clic
          activeOpacity={0.7}
          // Rôle d'accessibilité
          accessibilityRole="button"
          // Libellé d'accessibilité
          accessibilityLabel={t('ajouter_categorie')}
        >
          {/* Icône vectorielle plus d'ajout */}
          <Ionicons
            name="add-circle"
            size={16}
            color={colors.forest}
            style={{ marginHorizontal: 4 }}
          />
          {/* Libellé 'Ajouter une catégorie' */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.forest }}>
            {t('ajouter_categorie')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Message clair et bouton si aucun budget n'a encore été saisi (affiche 0 partout) */}
      {totalBudgetAmount === 0 && (
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: radius.card,
            padding: 14,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: me.role === 'child' ? 0 : 10 }}>
            {me.role === 'child'
              ? (isRTL ? 'لم يتم تعيين أي ميزانية لك بعد من قِبل والدك.' : 'Aucun budget ne vous a encore été alloué par votre parent.')
              : (isRTL ? 'لم يتم تحديد أي ميزانية لهذا الشهر.' : 'Aucun budget défini pour ce mois.')}
          </Text>
          {me.role !== 'child' && (
            <Button
              label={isRTL ? 'تحديد ميزانية الشهر' : 'Définir le budget du mois'}
              variant="secondary"
              onPress={() => router.push('/budget-mois')}
            />
          )}
        </View>
      )}

      {/* 4. Alertes de seuils budgétaires (s'il y a un budget actif) */}
      {sum && sum.status === 'healthy' && (
        <AlertBanner
          tone="success"
          title={t('budget_se_porte_bien')}
          detail={t('budget_se_porte_bien_detail', { montant: money(sum.left) })}
        />
      )}
      {sum && sum.status === 'warning' && (
        <AlertBanner
          tone="warning"
          title={t('budget_alerte_80')}
          detail={t('budget_alerte_80_detail', { montant: money(sum.left) })}
        />
      )}
      {sum && sum.status === 'exceeded' && (
        <AlertBanner
          tone="danger"
          title={t('budget_depasse')}
          detail={t('budget_depasse_detail', { montant: money(sum.over) })}
        />
      )}

      {/* 5. Deux actions clairement distinctes : "Ajouter un achat / produit" et "Ajouter une dépense" */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: 12,
          marginVertical: 10,
        }}
      >
        {/* Action 1 : Ajouter un achat / produit */}
        <TouchableOpacity
          onPress={() => router.push('/nouveau-produit')}
          style={{
            flex: 1,
            backgroundColor: colors.forest,
            borderRadius: radius.card,
            paddingVertical: 14,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: isRTL ? 'row-reverse' : 'row',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('ajouter_un_achat')}
        >
          <Ionicons
            name="cart-outline"
            size={18}
            color={colors.white}
            style={{ marginHorizontal: 4 }}
          />
          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
            {t('ajouter_un_achat')}
          </Text>
        </TouchableOpacity>

        {/* Action 2 : Ajouter une dépense */}
        <TouchableOpacity
          onPress={() => router.push('/nouvelle-depense')}
          style={{
            flex: 1,
            backgroundColor: colors.white,
            borderRadius: radius.card,
            paddingVertical: 14,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderWidth: 1.5,
            borderColor: colors.forest,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 1,
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('ajouter_depense_simple')}
        >
          <Ionicons
            name="receipt-outline"
            size={18}
            color={colors.forest}
            style={{ marginHorizontal: 4 }}
          />
          <Text style={{ color: colors.forest, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
            {t('ajouter_depense_simple')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 6. Section Vos Catégories */}
      <View
        onLayout={(e) => {
          categoriesY.current = e.nativeEvent.layout.y;
        }}
        style={{ marginTop: 8, marginBottom: 8 }}
      >
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 0 }}>
            {t('vos_categories')}
          </SectionTitle>
          <Pressable
            onPress={() => router.push('/gerer-categories')}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.forest }}>
              {isRTL ? 'إدارة الفئات' : 'Gérer'} {isRTL ? '‹' : '›'}
            </Text>
          </Pressable>
        </View>

        {/* Message de succès après enregistrement des catégories */}
        {categorySuccess ? (
          <View style={{ marginBottom: 10 }}>
            <AlertBanner
              tone="success"
              title={isRTL ? 'نجاح' : 'Succès'}
              detail={categorySuccess}
            />
          </View>
        ) : null}

        {displayCategoryIds.length > 0 ? (
          <>
            {shown.map((id) => {
              const rawCatName = categoryName(db, id);
              const translatedCatName = traduireCategorie(rawCatName);
              const catIcon = getCategoryIcon(rawCatName);
              const catAlloc = activeBudget?.allocations?.[id] ?? 0;
              // Calcul du pourcentage prévu : (allocation catégorie / budget total) * 100
              const plannedPct =
                totalBudgetAmount > 0
                  ? Math.round((catAlloc / totalBudgetAmount) * 100)
                  : (db.defaultPercentages[id] ?? 0);
              // Dépenses de la catégorie ce mois-ci
              const catSpent = txns
                .filter((tx) => tx.categoryId === id)
                .reduce((s, tx) => s + tx.amount, 0);
              // Pourcentage réalisé : rapport strict entre la consommation réelle et le budget alloué de cette catégorie
              const stats = categoryConsumptionStats(catSpent, catAlloc);
              const actualPct = Math.round(stats.pct);

              return (
                <CategoryCard
                  key={id}
                  name={translatedCatName}
                  icon={catIcon}
                  allocation={catAlloc}
                  spent={catSpent}
                  plannedPct={plannedPct}
                  actualPct={actualPct}
                />
              );
            })}

            {!expanded && rest.length > 0 && (
              <Pressable
                onPress={() => setExpanded(true)}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 6,
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
                {restAlloc > 0 && (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.forest }}>
                    {short(restAlloc)} DT
                  </Text>
                )}
              </Pressable>
            )}

            {expanded && rest.length > 0 && (
              <Pressable
                onPress={() => setExpanded(false)}
                accessibilityRole="button"
                style={{ alignSelf: isRTL ? 'flex-end' : 'flex-start', paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 13, color: colors.forest, fontWeight: '600' }}>
                  {t('voir_moins')}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radius.card,
              padding: 16,
              marginVertical: 4,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="pricetags-outline" size={30} color={colors.forest} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.forest,
                textAlign: 'center',
              }}
            >
              {isRTL
                ? 'لم تحدد أي فئات للمتابعة بعد.'
                : 'Aucune catégorie suivie pour le moment.'}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.muted,
                textAlign: 'center',
              }}
            >
              {isRTL
                ? 'حدد الفئات التي تهمك لتنظيم ميزانيتك وتتبع مصاريفك بدقة.'
                : 'Choisissez les catégories qui vous intéressent pour organiser votre budget et répartir vos dépenses.'}
            </Text>
            <Button
              label={isRTL ? 'اختيار فئاتي' : 'Choisir mes catégories'}
              variant="secondary"
              onPress={() => router.push('/gerer-categories')}
            />
          </View>
        )}
      </View>

      {/* 7. Suivi budgétaire des enfants pour le parent (sans révéler le détail d'achats) */}
      {(me.role === 'parent' || me.role === 'admin') && childrenProgress.length > 0 && (
        <View style={{ marginTop: 14, marginBottom: 8 }}>
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <SectionTitle style={{ marginBottom: 0 }}>
              {t('budget_enfants') || 'Budget des enfants'}
            </SectionTitle>
            <Pressable
              onPress={() => router.push('/(admin)/enfants')}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.forest }}>
                {t('gerer') || 'Gérer'} {isRTL ? '‹' : '›'}
              </Text>
            </Pressable>
          </View>

          {childrenProgress.map((cp) => (
            <View
              key={cp.child.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.card,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.forest }}>
                  {cp.child.name}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.forest }}>
                  {money(cp.spent)} / {money(cp.allocated)}
                </Text>
              </View>

              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.warm,
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(cp.pct, 100)}%`,
                    backgroundColor: cp.pct > 100 ? colors.coral : colors.forest,
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {t('reste')} : {money(cp.remaining)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: cp.pct > 100 ? colors.coral : colors.mint,
                  }}
                >
                  {cp.pct}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 8. Transactions récentes */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left', marginTop: 10 }}>
        {t('transactions_recentes')}
      </SectionTitle>

      {(!txns || txns.length === 0) ? (
        <EmptyState
          icon="receipt-outline"
          title={t('aucune_transaction_enregistree')}
          detail={t('premiere_transaction_detail')}
        />
      ) : (
        txns.slice(0, 5).map((tItem, index) => {
          const safeDate = tItem.date || '';
          const safeDetail = tItem.detail || '';
          const safeTitle = tItem.title || 'Transaction';
          const safeAmount = Number(tItem.amount) || 0;
          const formattedDate = safeDate ? fmtDateLocale(safeDate, langue) : '';
          const fullDetail = [safeDetail, formattedDate].filter(Boolean).join(' · ');
          const uniqueKey = `${tItem.kind}-${tItem.id}-${index}`;

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

      {/* 9. Bouton Microphone en bas de la Home pour la saisie vocale intelligente */}
      <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 24 }}>
        <TouchableOpacity
          onPress={() => setVoiceModalOpen(true)}
          style={{
            backgroundColor: colors.forest,
            width: 58,
            height: 58,
            borderRadius: 29,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.forest,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 5,
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Saisie vocale intelligente"
        >
          <Ionicons name="mic" size={28} color={colors.mint} />
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6, fontWeight: '500' }}>
          {isRTL ? 'اضغط للتحدث' : 'Appuyez pour dicter'}
        </Text>
      </View>

      {/* Boîte modale de création de catégorie */}
      <CustomCategoryModal
        visible={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSuccess={(cat) => {
          const msg = isRTL
            ? `تمت إضافة فئة "${traduireCategorie(cat.name)}" بنجاح!`
            : `La catégorie "${traduireCategorie(cat.name)}" a été ajoutée avec succès !`;
          setCategorySuccess(msg);
          setTimeout(() => setCategorySuccess(null), 6000);
        }}
        scope={me.role === 'parent' || me.role === 'admin' ? 'family' : 'personal'}
      />

      {/* Boîte modale de saisie vocale intelligente */}
      <VoiceTransactionModal
        visible={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSuccess={() => setVoiceModalOpen(false)}
      />

      <View style={{ height: 10 }} />
    </Screen>
  );
}
