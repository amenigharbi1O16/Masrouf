import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { EmptyState, Eyebrow, Input } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';

export default function AdminUsersScreen() {
  const router = useRouter();
  const { db } = useStore();
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const list = db.users.filter((u) => u.role === 'user' && (!s || `${u.name} ${u.email}`.toLowerCase().includes(s)));
  return (
    <Screen title="Users">
      <Eyebrow>ACCOUNT ADMINISTRATION</Eyebrow>
      <Input label="Search users" value={q} onChangeText={setQ} placeholder="Name or email" />
      {list.length === 0 ? <EmptyState icon="people-outline" title="No user found" /> : null}
      {list.map((u) => (
        <Pressable key={u.id} onPress={() => router.push({ pathname: '/(admin)/utilisateur', params: { id: u.id } } as never)} accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.card, padding: 14, minHeight: 72 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.forest }}>{u.name}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{u.email}</Text>
          </View>
          <View style={{ backgroundColor: u.active ? colors.mint : colors.coralSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: u.active ? colors.green : '#9B3B35' }}>{u.active ? 'Active' : 'Suspended'}</Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
