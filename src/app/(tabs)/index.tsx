import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BudgetCard, CategoryCard, ExpenseCard, TransactionRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, EmptyState, Eyebrow, LoadingScreen, SectionTitle } from '@/components/ui';
import { colors } from '@/constants/theme';
import { categoryName, currentBudget, pointsFor, summarize, userTxns } from '@/state/selectors';
import { useStore } from '@/state/store';
import { fmtDate, fmtRange, greeting, money, monthName, parseISO, short } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { db, me } = useStore();
  const [expanded, setExpanded] = useState(false);
  const budget = me ? currentBudget(db, me.id) : null;
  const sum = budget && me ? summarize(db, me.id, budget) : null;

  // Celebrate a newly completed successful period once.
  const reward = useMemo(() => {
    if (!me) return null;
    return pointsFor(db, me).periods.find((p) => p.success && !(me.celebratedBudgetIds ?? []).includes(p.budget.id)) ?? null;
  }, [db, me]);
  useEffect(() => {
    if (reward) router.push({ pathname: '/felicitations', params: { id: reward.budget.id } } as never);
  }, [reward?.budget.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return <LoadingScreen />;
  const txns = userTxns(db, me.id).slice(0, 4);
  const allocCats = budget ? Object.keys(budget.allocations).filter((id) => (budget.allocations[id] ?? 0) > 0 || (sum?.byCat[id] ?? 0) > 0) : [];
  const shown = expanded ? allocCats : allocCats.slice(0, 2);
  const rest = allocCats.slice(2);
  const restSpent = rest.reduce((a, id) => a + (sum?.byCat[id] ?? 0), 0);
  const restAlloc = rest.reduce((a, id) => a + (budget?.allocations[id] ?? 0), 0);
  const d = budget ? parseISO(budget.start) : null;

  return (
    <Screen title={`${greeting()}, ${me.name.split(' ')[0]}`} fab={{ label: '＋ Add purchase', onPress: () => router.push('/nouvel-achat') }}>
      {budget && sum && d ? (
        <>
          <Eyebrow>{monthName(d.getUTCMonth()).toUpperCase()} {d.getUTCFullYear()}  ·  {fmtRange(budget.start, budget.end).split(' ').slice(0, 1)[0]} {fmtRange(budget.start, budget.end).split(' ')[1]}</Eyebrow>
          <BudgetCard
            available={sum.left} spent={sum.spent} total={sum.total} pct={sum.pct} over={sum.status === 'exceeded' ? sum.over : undefined}
            range={fmtRange(budget.start, budget.end)}
            onPress={() => router.push({ pathname: '/budget-mois', params: { mode: 'edit', id: budget.id } } as never)}
          />
          {sum.status === 'healthy' && <AlertBanner tone="success" title="Your budget is looking healthy" detail={`${money(sum.left)} left for the rest of this period.`} />}
          {sum.status === 'warning' && <AlertBanner tone="warning" title={`You have used ${Math.round(sum.pct)}% of your budget`} detail={`${money(sum.left)} left — slow down on non-essentials.`} />}
          {sum.status === 'exceeded' && <AlertBanner tone="danger" title="Budget exceeded" detail={`You are ${money(sum.over)} over your plan for this period.`} />}

          <SectionTitle>Your categories</SectionTitle>
          {shown.map((id) => (
            <CategoryCard key={id} name={categoryName(db, id)} spent={sum.byCat[id] ?? 0} allocation={budget.allocations[id] ?? 0} />
          ))}
          {!expanded && rest.length > 0 && (
            <Pressable onPress={() => setExpanded(true)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }} accessibilityRole="button">
              <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }} numberOfLines={1}>{rest.map((id) => categoryName(db, id)).join(' · ')}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.forest }}>{short(restSpent)} / {short(restAlloc)} DT</Text>
            </Pressable>
          )}
          {expanded && rest.length > 0 && (
            <Pressable onPress={() => setExpanded(false)} accessibilityRole="button"><Text style={{ fontSize: 13, color: colors.green, fontWeight: '600' }}>Show less</Text></Pressable>
          )}
        </>
      ) : (
        <>
          <Eyebrow>NO ACTIVE BUDGET PERIOD</Eyebrow>
          <EmptyState
            icon="wallet-outline"
            title="Give every dinar a direction"
            detail="You have no budget for today. Create one for any period — it does not have to be a calendar month."
            actionLabel="Create a budget"
            onAction={() => router.push('/budget-mois')}
          />
        </>
      )}

      <SectionTitle>Recent transactions</SectionTitle>
      {txns.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Nothing recorded yet" detail="Add your first purchase or expense to see it here." />
      ) : (
        txns.map((t) =>
          t.kind === 'purchase' ? (
            <TransactionRow
              key={t.id} title={t.title} detail={`${t.detail} · ${fmtDate(t.date)}`} amount={`−${money(t.amount).replace(' DT', '')}`}
              onPress={() => router.push({ pathname: '/modifier-achat', params: { id: t.id } } as never)}
            />
          ) : (
            <ExpenseCard
              key={t.id} title={t.title} detail={`${t.detail} · ${fmtDate(t.date)}`} amount={money(t.amount)}
              onPress={() => router.push({ pathname: '/modifier-depense', params: { id: t.id } } as never)}
            />
          ),
        )
      )}
      <Button label="Add a simple expense" variant="secondary" onPress={() => router.push('/nouvelle-depense')} />
      <View style={{ height: 4 }} />
    </Screen>
  );
}
