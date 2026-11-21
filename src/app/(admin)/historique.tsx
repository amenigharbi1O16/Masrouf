/**
 * FICHIER : src/app/(admin)/historique.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-009-HISTORIQUE
 * ÉCRAN : HISTORIQUE CHRONOLOGIQUE FAMILIAL (Family History)
 *
 * MISSION DU FICHIER :
 * Présenter le journal d'activité unifié et transparent de tout le foyer :
 * 1. Cumule et ordonne chronologiquement :
 *    - Les allocations d'argent de poche accordées aux enfants.
 *    - Les demandes d'argent traitées (approuvées ou refusées).
 *    - Les dépenses et achats enregistrés par les membres du foyer.
 * 2. Propose des filtres instantanés par catégorie d'opération (Tout, Allocations, Demandes, Dépenses).
 * 3. Affiche les détails (bénéficiaire, montant, motif, date et heure) avec icônes distinctes.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Eyebrow, SectionTitle } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useStore } from '@/state/store';
import { formatTND } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';

type FilterType = 'all' | 'allocations' | 'requests' | 'expenses';

interface TimelineItem {
  id: string;
  type: 'allocation' | 'request' | 'expense' | 'purchase';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  status?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

export default function FamilyHistoryScreen() {
  const router = useRouter();
  const { db, me } = useStore();
  const { t, isRTL } = useTranslation();

  const [filter, setFilter] = useState<FilterType>('all');

  const childrenList = db.users.filter(
    (u) => u.role === 'child' && (u.parentId === me?.id || u.familyId === me?.familyId)
  );
  const familyUserIds = [me?.id, ...childrenList.map((c) => c.id)];

  // Construction du journal d'activité chronologique
  const timeline: TimelineItem[] = useMemo(() => {
    const list: TimelineItem[] = [];

    // 1. Allocations données par le parent
    for (const a of db.allocations) {
      if (a.parentId === me?.id) {
        list.push({
          id: `alloc-${a.id}`,
          type: 'allocation',
          title: `Allocation à ${a.childName}`,
          subtitle: a.note || 'Argent de poche',
          amount: a.amount,
          date: a.date,
          icon: 'cash-outline',
          color: colors.forest,
          bg: '#EAF7F0',
        });
      }
    }

    // 2. Demandes d'argent
    for (const r of db.moneyRequests) {
      if (r.parentId === me?.id) {
        list.push({
          id: `req-${r.id}`,
          type: 'request',
          title: `Demande de ${r.childName}`,
          subtitle: `${r.reason || 'Demande d’argent'} (${r.status === 'approved'
            ? 'Approuvée'
            : r.status === 'rejected'
              ? 'Rejetée'
              : 'En attente'
            })`,
          amount: r.amount,
          date: r.date,
          status: r.status,
          icon:
            r.status === 'approved'
              ? 'checkmark-circle-outline'
              : r.status === 'rejected'
                ? 'close-circle-outline'
                : 'mail-unread-outline',
          color:
            r.status === 'approved'
              ? colors.forest
              : r.status === 'rejected'
                ? '#E11D48'
                : '#E65100',
          bg:
            r.status === 'approved'
              ? '#EAF7F0'
              : r.status === 'rejected'
                ? '#FFE4E6'
                : '#FFF3E0',
        });
      }
    }

    // 3. Dépenses de la famille
    for (const exp of db.expenses) {
      if (familyUserIds.includes(exp.userId)) {
        const u = db.users.find((user) => user.id === exp.userId);
        const cat = db.categories.find((c) => c.id === exp.categoryId);
        list.push({
          id: `exp-${exp.id}`,
          type: 'expense',
          title: `${cat?.name || 'Dépense'} · ${u?.name || 'Membre'}`,
          subtitle: exp.note || exp.date,
          amount: exp.amount,
          date: exp.date,
          icon: 'receipt-outline',
          color: colors.forest,
          bg: colors.mint,
        });
      }
    }

    // 4. Achats de la famille
    for (const pur of db.purchases) {
      if (familyUserIds.includes(pur.userId)) {
        const u = db.users.find((user) => user.id === pur.userId);
        const prod = db.products.find((p) => p.id === pur.productId);
        list.push({
          id: `pur-${pur.id}`,
          type: 'purchase',
          title: `${prod?.name || 'Achat'} · ${u?.name || 'Membre'}`,
          subtitle: `${pur.quantity} unité(s) · ${pur.date}`,
          amount: pur.price,
          date: pur.date,
          icon: 'cart-outline',
          color: colors.forest,
          bg: colors.mint,
        });
      }
    }

    // Tri antéchronologique (du plus récent au plus ancien)
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [db.allocations, db.moneyRequests, db.expenses, db.purchases, db.users, db.products, db.categories, me?.id, familyUserIds]);

  // Filtrage selon le filtre sélectionné
  const filteredTimeline = useMemo(() => {
    if (filter === 'allocations') return timeline.filter((i) => i.type === 'allocation');
    if (filter === 'requests') return timeline.filter((i) => i.type === 'request');
    if (filter === 'expenses')
      return timeline.filter((i) => i.type === 'expense' || i.type === 'purchase');
    return timeline;
  }, [timeline, filter]);

  return (
    <Screen
      title={t('historique_familial')}
      back
      onBack={() => router.replace('/(tabs)')}
    >
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        ACTIVITÉS & FLUX · GRAND LIVRE DU FOYER
      </Eyebrow>

      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 6 }}>
        {t('historique_familial')} ({timeline.length})
      </SectionTitle>

      <Body style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 14 }}>
        Historique consolidé de toutes les opérations du foyer : allocations,
        demandes et dépenses.
      </Body>

      {/* FILTRES PAR TYPE */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              filter === 'all' && styles.filterChipTextActive,
            ]}
          >
            Tout ({timeline.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filter === 'allocations' && styles.filterChipActive,
          ]}
          onPress={() => setFilter('allocations')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              filter === 'allocations' && styles.filterChipTextActive,
            ]}
          >
            Allocations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filter === 'requests' && styles.filterChipActive,
          ]}
          onPress={() => setFilter('requests')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              filter === 'requests' && styles.filterChipTextActive,
            ]}
          >
            Demandes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filter === 'expenses' && styles.filterChipActive,
          ]}
          onPress={() => setFilter('expenses')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              filter === 'expenses' && styles.filterChipTextActive,
            ]}
          >
            Dépenses
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTE CHRONOLOGIQUE */}
      {filteredTimeline.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={44} color={colors.gray} />
          <Text style={styles.emptyTitle}>Aucune activité trouvée</Text>
          <Text style={styles.emptySub}>
            Les prochaines opérations enregistrées dans le foyer apparaîtront ici.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
        >
          {filteredTimeline.map((item) => (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={[styles.itemIconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>

              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text
                  style={[styles.itemTitle, { textAlign: isRTL ? 'right' : 'left' }]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.itemSub, { textAlign: isRTL ? 'right' : 'left' }]}
                >
                  {item.subtitle}
                </Text>
                <Text
                  style={[styles.itemDate, { textAlign: isRTL ? 'right' : 'left' }]}
                >
                  {item.date}
                </Text>
              </View>

              <View style={styles.amountCol}>
                <Text
                  style={[
                    styles.itemAmount,
                    item.type === 'request' && item.status === 'rejected'
                      ? { color: colors.gray, textDecorationLine: 'line-through' }
                      : { color: colors.forest },
                  ]}
                >
                  {formatTND(item.amount)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.forest,
  },
  itemSub: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  itemDate: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
});

