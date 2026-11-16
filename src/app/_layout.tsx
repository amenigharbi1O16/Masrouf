/**
 * FICHIER : src/app/_layout.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-001
 * COMPOSANT : RootLayout & Gate (Structure Racine et Gardien de Navigation)
 *
 * MISSION DU FICHIER :
 * Être le chef d'orchestre de l'application Masrouf :
 * 1. Initialise les 3 contextes racine indispensables :
 *    - `SafeAreaProvider` : calcule en temps réel les marges de l'encoche (Notch), Dynamic Island et barre d'accueil.
 *    - `StoreProvider` : ouvre la base SQLite `masrouf.db`, exécute les migrations et hydrate l'état réactif en mémoire.
 *    - `DrawerProvider` : gère l'état ouvert/fermé du menu tiroir latéral sans barre d'onglets inférieure.
 * 2. Implémente le gardien de navigation `Gate` qui contrôle l'accès aux routes selon l'état de session :
 *    - Non connecté -> forçage vers `/login`.
 *    - Compte suspendu (`active === false`) -> déconnexion forcée immédiate.
 *    - Réinitialisation requise (`mustChangePassword === true`) -> forçage vers `/changer-mot-de-passe`.
 *    - Rôle administrateur (`role === 'admin'`) -> redirection vers `/(admin)/dashboard`.
 *    - Utilisateur non encore initié (`onboarded === false`) -> redirection vers `/onboarding`.
 *    - Utilisateur régulier connecté -> redirection vers `/(tabs)`.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il est le garant de la sécurité absolue (RBAC) et de l'expérience utilisateur sans saccade.
 * Il élimine tout écran blanc au démarrage en maintenant l'écran de chargement tant que SQLite n'est pas prêt.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Pendant l'initialisation de la base SQLite : l'écran de chargement `LoadingScreen` avec logo et spinner.
 * - En permanence : barre de statut Android/iOS foncée (`dark`) sur fond sable clair (#F5F3ED),
 *   suppression des en-têtes natifs (`headerShown: false`) et transitions animées fluides (`fade_from_bottom`).
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Fournisseur de contexte pour le tiroir de navigation latéral
import { DrawerProvider } from '@/components/DrawerContext';
// Hôte de rendu du tiroir latéral (administrateur ou utilisateur)
import { DrawerHost } from '@/components/DrawerHost';
// Écran de chargement affiché pendant l'initialisation de SQLite
import { LoadingScreen } from '@/components/ui';
// Fournisseur du magasin d'état global SQLite
import { StoreProvider, useStore } from '@/state/store';
// Utilitaire déterminant la route d'accueil selon le profil utilisateur
import { homeRouteFor } from '@/utils/session';

/**
 * MISSION DU COMPOSANT :
 * Intercepter chaque tentative de navigation et appliquer les règles d'étanchéité et de sécurité.
 *
 * RÔLE DANS L'APPLICATION :
 * Empêche tout utilisateur normal d'accéder aux routes d'administration, force les nouveaux utilisateurs
 * à passer par l'onboarding, et oblige les utilisateurs réinitialisés à changer leur mot de passe.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Rendu transparent qui redirige instantanément l'utilisateur vers la bonne page sans aucun clignotement.
 */
function Gate({ children }: { children: React.ReactNode }) {
  // Récupération de l'état de préparation de SQLite et du profil connecté
  const { ready, me, actions } = useStore();
  const router = useRouter();
  // Premier segment de l'URL courante (ex: 'login', 'onboarding', '(tabs)', '(admin)')
  const first = (useSegments() as string[])[0];

  useEffect(() => {
    // Si la base SQLite n'est pas encore prête, attendre la fin de l'initialisation
    if (!ready) return;

    // Définition des routes publiques accessibles sans compte connecté
    const isPublic = first === 'login' || first === 'inscription';

    // CAS 1 : Aucun utilisateur connecté -> redirection vers la connexion
    if (!me) {
      if (!isPublic) {
        router.replace('/login');
      }
      return;
    }

    // CAS 2 : Compte utilisateur suspendu ou désactivé par l'administrateur
    if (!me.active) {
      actions.logout();
      return;
    }

    // CAS 3 : Mot de passe temporaire nécessitant un changement immédiat
    if (me.mustChangePassword) {
      if (first !== 'changer-mot-de-passe') {
        router.replace('/changer-mot-de-passe');
      }
      return;
    }

    // CAS 4 : Rôle Administrateur connecté
    if (me.role === 'admin') {
      if (first !== '(admin)' && first !== 'changer-mot-de-passe') {
        router.replace('/(admin)/dashboard');
      }
      return;
    }

    // CAS 5 : Utilisateur normal tentant d'accéder aux routes d'administration
    if (first === '(admin)') {
      router.replace('/(tabs)');
      return;
    }

    // CAS 6 : Utilisateur régulier qui n'a pas encore validé l'assistant d'accueil
    if (!me.onboarded) {
      if (first !== 'onboarding') {
        router.replace('/onboarding');
      }
      return;
    }

    // CAS 7 : Utilisateur normal connecté tentant d'accéder à login, inscription ou onboarding
    if (isPublic || first === 'onboarding') {
      router.replace(homeRouteFor(me) as never);
    }
  }, [
    ready,
    me?.id,
    me?.active,
    me?.mustChangePassword,
    me?.onboarded,
    me?.role,
    first,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pendant le chargement initial de SQLite, affiche l'écran de chargement avec spinner
  if (!ready) return <LoadingScreen />;

  // Rendu des routes enfants dès que le contrôle d'accès est validé
  return <>{children}</>;
}

/**
 * MISSION DU COMPOSANT :
 * Envelopper l'application mobile complète avec tous ses fournisseurs de contexte natifs.
 *
 * RÔLE DANS L'APPLICATION :
 * Point d'entrée racine monté par Expo Router au lancement de l'application.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'application mobile complète avec fond de thème unifié sable clair (#F5F3ED) et barre de statut sombre.
 */
export default function RootLayout() {
  return (
    // Gestionnaire des marges de sécurité système (Safe Area)
    <SafeAreaProvider>
      {/* Configuration de la barre de statut sombre (icônes foncées sur fond clair) */}
      <StatusBar style="dark" />

      {/* Fournisseur de persistance SQLite et gestion d'état */}
      <StoreProvider>
        {/* Fournisseur du menu tiroir latéral */}
        <DrawerProvider>
          {/* Gardien de navigation et contrôle d'accès */}
          <Gate>
            {/* Pile de navigation Expo Router sans barre supérieure native */}
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade_from_bottom',
                contentStyle: { backgroundColor: '#F5F3ED' },
              }}
            />
            {/* Rendu dynamique du tiroir latéral selon le profil connecté */}
            <DrawerHost />
          </Gate>
        </DrawerProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
