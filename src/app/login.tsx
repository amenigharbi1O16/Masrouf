import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { useTranslation } from '@/utils/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { t, isRTL } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(t('erreur') + ' : ' + t('connexion_sous_titre'));
      return;
    }
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? t('erreur'));
    }
    // success: the root route guard sends the user to the right screen
  };

  return (
    <Screen title="MASROUF" plain>
      <LanguageSelector />
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('slogan').toUpperCase()}
      </Eyebrow>
      <View
        style={{
          backgroundColor: colors.forest,
          borderRadius: 24,
          height: 176,
          padding: 24,
          justifyContent: 'space-between',
        }}
      >
        <Ionicons name="leaf" size={42} color={colors.mint} />
        <Text
          style={{
            color: colors.white,
            fontSize: 27,
            lineHeight: 39,
            fontWeight: '600',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {t('connexion_bienvenue')}
        </Text>
      </View>
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('se_connecter')}
      </SectionTitle>
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('connexion_sous_titre')}
      </Body>
      {error ? <AlertBanner tone="danger" title={t('erreur')} detail={error} /> : null}
      <Input
        label={t('email')}
        value={email}
        onChangeText={(tVal) => {
          setEmail(tVal);
          setError('');
        }}
        keyboardType="email-address"
        placeholder="vous@email.tn"
      />
      <Input
        label={t('mot_de_passe')}
        value={password}
        onChangeText={(tVal) => {
          setPassword(tVal);
          setError('');
        }}
        secure
        placeholder="••••••••"
      />
      <Button label={t('se_connecter')} onPress={submit} loading={busy} />
      <Button
        label={t('creer_compte')}
        variant="secondary"
        onPress={() => router.push('/inscription')}
      />
    </Screen>
  );
}
