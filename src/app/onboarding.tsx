import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { CategoryPicker } from '@/components/CategoryPicker';
import { TransactionRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, SectionTitle } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useStore } from '@/state/store';

const DEFAULTS = ['food', 'transport', 'bills', 'entertainment', 'savings'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { db, actions } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string[]>(DEFAULTS);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chosen = db.categories.filter((c) => selected.includes(c.id));

  const finish = () => {
    actions.completeOnboarding(selected);
    router.replace('/');
  };

  return (
    <Screen
      title={step === 1 ? 'Welcome' : step === 2 ? 'Your categories' : 'Your plan'}
      back={step > 1}
      plain={step === 1}
      onBack={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s))}
    >
      {step === 1 && (
        <>
          <Eyebrow>01 / 03  ·  MAKE IT YOURS</Eyebrow>
          <View style={{ backgroundColor: colors.forest, borderRadius: 24, height: 248, padding: 24, justifyContent: 'space-between' }}>
            <Ionicons name="leaf" size={48} color={colors.mint} />
            <Text style={{ color: colors.white, fontSize: 27, lineHeight: 36, fontWeight: '600' }}>A calmer relationship with everyday money.</Text>
          </View>
          <SectionTitle>Meet your money, differently.</SectionTitle>
          <Body>Plan flexible periods, follow everyday spending and watch your habits grow.</Body>
          <TransactionRow title="Groceries" detail="Track what you buy" amount="−42.500" />
          <TransactionRow title="Olive oil · 1 L" detail="See every price, remembered" amount="−14.500" icon="trending-down" />
          <TransactionRow title="Bus pass" detail="Everyday expenses stay separate" amount="−35.000" icon="wallet-outline" />
          <Button label="Choose my categories" onPress={() => setStep(2)} />
        </>
      )}
      {step === 2 && (
        <>
          <Eyebrow>02 / 03  ·  CHOOSE WHAT YOU TRACK</Eyebrow>
          <SectionTitle>Everyday life, organized.</SectionTitle>
          <Body>You can change these at any time.</Body>
          <CategoryPicker categories={db.categories} selected={selected} onToggle={toggle} />
          <Button label={`Review ${selected.length} categories`} onPress={() => setStep(3)} disabled={selected.length === 0} />
        </>
      )}
      {step === 3 && (
        <>
          <Eyebrow>03 / 03  ·  YOUR SELECTION</Eyebrow>
          <SectionTitle>A plan that feels like you.</SectionTitle>
          <Body>{selected.length} categories selected. No budget needed yet.</Body>
          {chosen.map((c) => (
            <TransactionRow key={c.id} title={c.name} detail={c.kind === 'product' ? 'Product category' : 'Expense category'} amount="✓" icon={c.kind === 'product' ? 'bag-outline' : 'wallet-outline'} />
          ))}
          <AlertBanner tone="info" title="Create a budget whenever you are ready" detail="You can set one from Home at any time." />
          <Button label="Go to my home" onPress={finish} />
          <Button label="Change selection" variant="secondary" onPress={() => setStep(2)} />
        </>
      )}
    </Screen>
  );
}
