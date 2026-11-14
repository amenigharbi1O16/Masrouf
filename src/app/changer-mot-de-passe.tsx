import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useStore } from '@/state/store';
import { passwordChecks } from '@/utils/security';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { me, actions } = useStore();
  const mandatory = !!me?.mustChangePassword;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const c = passwordChecks(next, confirm);

  const submit = async () => {
    setBusy(true);
    const res = await actions.changePassword(current, next);
    setBusy(false);
    if (!res.ok) { setError(res.error ?? 'Could not change the password.'); return; }
    if (mandatory) return; // guard redirects once mustChangePassword is false
    router.back();
  };

  return (
    <Screen title={mandatory ? 'Secure your account' : 'Change password'} back={!mandatory} plain={mandatory}>
      <Eyebrow>{mandatory ? 'PASSWORD UPDATE REQUIRED' : 'ACCOUNT SECURITY'}</Eyebrow>
      {mandatory ? <AlertBanner tone="info" title="Replace your temporary password" detail="Choose a new password before continuing." /> : null}
      {error ? <AlertBanner tone="danger" title="Password not changed" detail={error} /> : null}
      <Input label={mandatory ? 'Temporary password' : 'Current password'} value={current} onChangeText={setCurrent} secure />
      <Input label="New password" value={next} onChangeText={setNext} secure />
      <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secure />
      <View>
        {([['At least 8 characters', c.length], ['Includes a number', c.number], ['Passwords match', c.match && confirm.length > 0]] as const).map(([t, ok]) => (
          <Text key={t} style={{ fontSize: 13, lineHeight: 19, fontWeight: '500', color: ok ? colors.green : colors.muted }}>{ok ? '✓' : '○'} {t}</Text>
        ))}
      </View>
      <Button label="Save new password" onPress={submit} loading={busy} disabled={!current || !c.length || !c.number || !c.match} />
      {mandatory ? <Button label="Log out" variant="secondary" onPress={actions.logout} /> : null}
    </Screen>
  );
}
