// ============================================================
// FICHIER : src/app/(admin)/_layout.tsx
// RÔLE    : Agencement sécurisé de l'espace Administrateur.
//           Protège l'accès : seul un utilisateur avec le rôle
//           'admin' est autorisé à naviguer dans ce dossier.
//
// CONCEPTS REACT NATIVE & SÉCURITÉ :
//   - Contrôle d'accès basé sur les rôles (RBAC).
//   - Redirection automatique si un utilisateur non-admin tente d'y accéder.
// ============================================================

import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuth } from '../../utils/auth';

export default function AdminLayout() {
  const { user } = useAuth();

  // CONTRÔLE D'ACCÈS BASÉ SUR LE RÔLE :
  // Si l'utilisateur n'est pas connecté OU n'est pas admin,
  // on le refoule immédiatement vers l'espace utilisateur normal.
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/(tabs)' as any);
    }
  }, [user]);

  // Si non-admin, on ne rend rien pendant que la redirection s'opère
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen
        name="utilisateurs"
        options={{
          title: '👑 Administration — Utilisateurs',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAF5FF' },
          headerTitleStyle: { color: '#7E22CE', fontWeight: 'bold' },
        }}
      />
    </Stack>
  );
}
