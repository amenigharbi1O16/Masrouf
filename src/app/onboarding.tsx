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
import { useTranslation } from '@/utils/i18n';

const DEFAULTS = ['food', 'transport', 'bills', 'entertainment', 'savings'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { db, actions } = useStore();
  const { t, isRTL, traduireCategorie } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string[]>(DEFAULTS);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const chosen = db.categories.filter((c) => selected.includes(c.id));

  const finish = () => {
    actions.completeOnboarding(selected);
    router.replace('/(tabs)');
  };

  const getTitle = () => {
    if (step === 1) return t('bienvenue');
    if (step === 2) return t('vos_categories');
    return t('recapitulatif_selection');
  };

  return (
    <Screen
      title={getTitle()}
      back={step > 1}
      plain={step === 1}
      onBack={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s))}
    >
      {step === 1 && (
        <>
          <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
            01 / 03  ·  {t('onboarding_intro').toUpperCase()}
          </Eyebrow>
          <View
            style={{
              backgroundColor: colors.forest,
              borderRadius: 24,
              height: 248,
              padding: 24,
              justifyContent: 'space-between',
            }}
          >
            <Ionicons name="leaf" size={48} color={colors.mint} />
            <Text
              style={{
                color: colors.white,
                fontSize: 27,
                lineHeight: 36,
                fontWeight: '600',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('onboarding_titre_hero')}
            </Text>
          </View>
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('onboarding_intro')}
          </SectionTitle>
          <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('onboarding_decouvrez')}
          </Body>
          <TransactionRow
            title={traduireCategorie('Alimentation')}
            detail={t('onboarding_cat_desc')}
            amount="−42.500 DT"
          />
          <TransactionRow
            title={`${traduireCategorie('Alimentation')} · Huile d'olive`}
            detail={t('onboarding_points_desc')}
            amount="−14.500 DT"
            icon="trending-down"
          />
          <TransactionRow
            title={traduireCategorie('Transport')}
            detail={t('onboarding_budget_desc')}
            amount="−35.000 DT"
            icon="wallet-outline"
          />
          <Button label={t('choisir_categories')} onPress={() => setStep(2)} />
        </>
      )}

      {step === 2 && (
        <>
          <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
            02 / 03  ·  {t('choisir_ce_que_vous_suivez').toUpperCase()}
          </Eyebrow>
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('vie_quotidienne_organisee')}
          </SectionTitle>
          <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('changer_a_tout_moment')}
          </Body>
          <CategoryPicker
            categories={db.categories}
            selected={selected}
            onToggle={toggle}
          />
          <View style={{ marginTop: 12 }}>
            <Button
              label={t('verifier_categories', { count: selected.length })}
              onPress={() => setStep(3)}
              disabled={selected.length === 0}
            />
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
            03 / 03  ·  {t('recapitulatif_selection').toUpperCase()}
          </Eyebrow>
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('plan_qui_vous_ressemble')}
          </SectionTitle>
          <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('categories_selectionnees_compte', { count: selected.length })}
          </Body>
          {chosen.map((c) => (
            <TransactionRow
              key={c.id}
              title={traduireCategorie(c.name)}
              detail={
                c.kind === 'product'
                  ? t('categorie_produit')
                  : t('categorie_depense')
              }
              amount="✓"
              icon={c.kind === 'product' ? 'bag-outline' : 'wallet-outline'}
            />
          ))}
          <AlertBanner
            tone="info"
            title={t('budget_quand_pret')}
            detail={t('definir_depuis_accueil')}
          />
          <Button label={t('aller_a_accueil')} onPress={finish} />
          <Button
            label={t('modifier_la_selection')}
            variant="secondary"
            onPress={() => setStep(2)}
          />
        </>
      )}
    </Screen>
  );
}
