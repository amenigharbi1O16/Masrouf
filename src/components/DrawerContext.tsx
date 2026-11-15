/**
 * FICHIER : src/components/DrawerContext.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-045
 * CONTEXTE : DrawerContext & DrawerProvider (Gestionnaire du Tiroir Latéral)
 *
 * RÔLE DU COMPOSANT :
 * Fournit un contexte React global (`DrawerCtx`) pour contrôler l'état d'affichage
 * du menu tiroir de navigation latérale depuis n'importe quel écran ou en-tête (`AppHeader`).
 * - Expose le hook `useDrawer()` avec les méthodes `open()`, `close()` et le booléen `visible`.
 * - Injecte dynamiquement le tiroir approprié selon le rôle de l'utilisateur connecté :
 *   - Si `me.role === 'admin'` -> affiche `<AdminDrawer />`.
 *   - Si `me.role === 'user'` -> affiche `<AppDrawer />`.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Permet l'ouverture fluide du menu coulissant gauche vert forêt avec assombrissement de l'arrière-plan.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
// Magasin d'état global pour identifier le rôle de l'utilisateur
import { useStore } from '@/state/store';
// Tiroir dédié aux administrateurs
import { AdminDrawer } from './AdminDrawer';
// Tiroir dédié aux utilisateurs réguliers
import { AppDrawer } from './AppDrawer';

/**
 * Interface du contexte de gestion du tiroir.
 */
interface Ctx {
  open: () => void;
  close: () => void;
  visible: boolean;
}

const DrawerCtx = createContext<Ctx>({
  open: () => { },
  close: () => { },
  visible: false,
});

/**
 * Hook personnalisé permettant d'interagir avec le tiroir latéral.
 */
export const useDrawer = () => useContext(DrawerCtx);

/**
 * Fournisseur de contexte englobant l'application pour monter le tiroir au-dessus des écrans.
 */
export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const { me } = useStore();

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(
    () => ({ open, close, visible }),
    [open, close, visible]
  );

  return (
    <DrawerCtx.Provider value={value}>
      {children}
      {/* Rendu conditionnel du tiroir adapté au rôle de l'utilisateur connecté */}
      {me ? (me.role === 'admin' ? <AdminDrawer /> : <AppDrawer />) : null}
    </DrawerCtx.Provider>
  );
}
