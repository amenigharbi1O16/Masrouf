import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import { useTranslation } from '@/utils/i18n';

function Row({
  icon,
  label,
  detail,
  onPress,
  isRTL,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
  isRTL?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: colors.white,
        borderRadius: radius.card,
        padding: 16,
        minHeight: 60,
      }}
    >
      <Ionicons name={icon} size={22} color={colors.green} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.forest,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {label}
        </Text>
        {detail ? (
          <Text
            style={{
              fontSize: 12,
              color: colors.muted,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={colors.muted}
      />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { me, actions } = useStore();
  const { t, isRTL } = useTranslation();
  const [name, setName] = useState(me?.name ?? '');
  const [saved, setSaved] = useState(false);

  if (!me) return null;

  return (
    <Screen title={t('reglages')}>
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('compte_personnel').toUpperCase()}
      </Eyebrow>
      <Input
        label={t('nom_complet')}
        value={name}
        onChangeText={(textVal) => {
          setName(textVal);
          setSaved(false);
        }}
        autoCapitalize="words"
      />
      <Input label={t('email')} value={me.email} editable={false} />
      {saved ? <AlertBanner tone="success" title={t('profil_enregistre')} /> : null}
      <Button
        label={t('enregistrer')}
        variant="secondary"
        disabled={!name.trim() || name.trim() === me.name}
        onPress={() => {
          actions.updateProfile(name);
          setSaved(true);
        }}
      />

      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('preferences')}
      </SectionTitle>

      <Row
        icon="wallet-outline"
        label={t('budget_du_mois')}
        detail={t('modifier_budget_detail')}
        onPress={() =>
          router.push({ pathname: '/budget-mois', params: { mode: 'edit' } } as never)
        }
        isRTL={isRTL}
      />
      <Row
        icon="pricetags-outline"
        label={t('gerer_categories')}
        detail={t('gerer_categories_detail')}
        onPress={() => router.push('/gerer-categories')}
        isRTL={isRTL}
      />
      <Row
        icon="trophy-outline"
        label={t('points')}
        detail={t('points_succes_detail')}
        onPress={() => router.push('/points')}
        isRTL={isRTL}
      />
      <Row
        icon="lock-closed-outline"
        label={t('changer_mot_de_passe')}
        onPress={() => router.push('/changer-mot-de-passe')}
        isRTL={isRTL}
      />

      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('langue')}
      </SectionTitle>
      <LanguageSelector />

      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('stockage_local_info')}
      </Body>
      <Button label={t('se_deconnecter')} variant="danger" onPress={actions.logout} />
    </Screen>
  );
}
