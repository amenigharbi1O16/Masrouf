import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, EmptyState, Eyebrow } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';

export default function TemporaryPasswordScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, actions } = useStore();
  const user = db.users.find((u) => u.id === id);
  const [pw, setPw] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return <Screen title="Temporary password" back><EmptyState title="User not found" actionLabel="Back" onAction={() => router.back()} /></Screen>;

  const generate = async () => { setBusy(true); setPw(await actions.issueTemporaryPassword(user.id)); setBusy(false); };

  return (
    <Screen title="Temporary password" back>
      <Eyebrow>{user.name.toUpperCase()}</Eyebrow>
      {pw ? (
        <>
          <AlertBanner tone="warning" title="Shown only once" detail="Share it securely. The user must replace it at next login." />
          <View style={{ backgroundColor: colors.forest, borderRadius: radius.hero, padding: 24, alignItems: 'center' }}>
            <Text selectable style={{ color: colors.white, fontSize: 28, fontWeight: '700', letterSpacing: 2 }}>{pw}</Text>
          </View>
          <Button label="Share password" onPress={() => Share.share({ message: `Your temporary Masrouf password: ${pw}` })} />
          <Button label="Done" variant="secondary" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Body>This replaces the current password immediately and forces a password change at the next login.</Body>
          <Button label="Generate temporary password" onPress={generate} loading={busy} />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
