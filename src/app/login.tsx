import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/utils/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) { setError('Enter your email address and password.'); return; }
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Could not log in.');
    // success: the root route guard sends the user to the right screen
  };

  return (
    <Screen title="MASROUF" plain>
      <Eyebrow>YOUR MONEY. YOUR BALANCE.</Eyebrow>
      <View style={{ backgroundColor: colors.forest, borderRadius: 24, height: 176, padding: 24, justifyContent: 'space-between' }}>
        <Ionicons name="leaf" size={42} color={colors.mint} />
        <Text style={{ color: colors.white, fontSize: 27, lineHeight: 39, fontWeight: '600' }}>Spend with intention.</Text>
      </View>
      <SectionTitle>Welcome back</SectionTitle>
      <Body>A clearer view of your everyday money.</Body>
      {error ? <AlertBanner tone="danger" title="Unable to log in" detail={error} /> : null}
      <Input label="Email address" value={email} onChangeText={(t) => { setEmail(t); setError(''); }} keyboardType="email-address" placeholder="you@email.com" />
      <Input label="Password" value={password} onChangeText={(t) => { setPassword(t); setError(''); }} secure placeholder="••••••••" />
      <Button label="Log in" onPress={submit} loading={busy} />
      <Button label="Create an account" variant="secondary" onPress={() => router.push('/inscription')} />
    </Screen>
  );
}
