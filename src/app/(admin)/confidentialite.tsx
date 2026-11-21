/**
 * FICHIER : src/app/(admin)/confidentialite.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-010-CONFIDENTIALITE
 * ÉCRAN : CONFIDENTIALITÉ, PERMISSIONS & SÉCURITÉ DU FOYER (Privacy & Permissions)
 *
 * MISSION DU FICHIER :
 * Présenter les garanties de sécurité et de confidentialité du système familial :
 * 1. Architecture 100% locale sans transit cloud des données financières.
 * 2. Protection cryptographique des identifiants (salage et hachage SHA-256).
 * 3. Étanchéité stricte des profils : isolation des espaces enfants.
 * 4. Gestion des permissions locales (Appareil photo, stockage, notifications).
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Eyebrow, SectionTitle } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useTranslation } from '@/utils/i18n';

export default function PrivacyScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  const rules = [
    {
      icon: 'shield-checkmark-outline' as const,
      color: colors.forest,
      bg: '#EAF7F0',
      title: 'Stockage 100% Local (SQLite)',
      desc: 'Toutes les données de votre foyer, transactions, soldes et budgets sont enregistrées exclusivement sur la mémoire sécurisée de votre téléphone. Aucun serveur tiers n’y a accès.',
    },
    {
      icon: 'lock-closed-outline' as const,
      color: '#1565C0',
      bg: '#E3F2FD',
      title: 'Sécurité Cryptographique des Mots de Passe',
      desc: 'Les mots de passe des parents et des enfants sont salés individuellement et hachés de manière irréversible via l’algorithme SHA-256 avant toute écriture en base.',
    },
    {
      icon: 'people-outline' as const,
      color: '#7B1FA2',
      bg: '#F3E5F5',
      title: 'Étanchéité des Profils Enfants',
      desc: 'Chaque enfant possède un espace autonome et ne peut en aucun cas consulter les soldes de ses frères et sœurs ni accéder aux fonctions de gestion du parent.',
    },
    {
      icon: 'mic-outline' as const,
      color: '#E65100',
      bg: '#FFF3E0',
      title: 'Reconnaissance Vocale Respectueuse',
      desc: 'L’analyse sémantique vocale pour vos achats et dépenses s’exécute localement. Aucune empreinte audio n’est stockée ni transmise.',
    },
  ];

  return (
    <Screen
      title="Confidentialité"
      back
      onBack={() => router.replace('/(admin)/dashboard')}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
          SÉCURITÉ & DONNÉES PRIVÉES · FOYER
        </Eyebrow>

        <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 6 }}>
          Confidentialité & Permissions
        </SectionTitle>

        <Body style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 18 }}>
          Masrouf place la souveraineté de vos données familiales au cœur de son
          architecture. Vos finances restent strictement privées.
        </Body>

        <View style={{ gap: 14 }}>
          {rules.map((rule, idx) => (
            <View key={idx} style={styles.ruleCard}>
              <View
                style={[
                  styles.ruleHeader,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: rule.bg }]}>
                  <Ionicons name={rule.icon} size={22} color={rule.color} />
                </View>
                <Text
                  style={[
                    styles.ruleTitle,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {rule.title}
                </Text>
              </View>
              <Text
                style={[
                  styles.ruleDesc,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {rule.desc}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ruleCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ruleHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.forest,
    flex: 1,
  },
  ruleDesc: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 19,
  },
});
