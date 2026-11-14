import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, Hint, Input, SectionTitle } from '@/components/ui';
import { useAuth } from '@/utils/auth';

export default function RegistrationScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    const res = await register(name, email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Could not create the account.');
    // success: the route guard moves a new user to onboarding
  };

  return (
    <Screen title="Create account" back onBack={() => router.replace('/login')}>
      <Eyebrow>A little clarity, every day.</Eyebrow>
      <SectionTitle>Start your Masrouf journey</SectionTitle>
      <Body>Your budgets and purchases stay on this device.</Body>
      {error ? <AlertBanner tone="danger" title="Check your details" detail={error} /> : null}
      <Input label="Full name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Ines Ben Ali" />
      <Input label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@email.com" />
      <Input label="Password" value={password} onChangeText={setPassword} secure placeholder="••••••••" />
      <Input label="Confirm password" value={confirm} onChangeText={setConfirm} secure placeholder="••••••••" />
      <Hint>Use at least 8 characters with a number.</Hint>
      <Button label="Create account" onPress={submit} loading={busy} />
      <Button label="Already registered? Log in" variant="secondary" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
