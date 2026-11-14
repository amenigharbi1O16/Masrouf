import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useStore } from '@/state/store';
import { AdminDrawer } from './AdminDrawer';
import { AppDrawer } from './AppDrawer';

interface Ctx { open: () => void; close: () => void; visible: boolean }
const DrawerCtx = createContext<Ctx>({ open: () => {}, close: () => {}, visible: false });
export const useDrawer = () => useContext(DrawerCtx);

/** Wraps the whole app: the drawer overlays any screen. Admins get the admin drawer. */
export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const { me } = useStore();
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ open, close, visible }), [open, close, visible]);
  return (
    <DrawerCtx.Provider value={value}>
      {children}
      {me ? (me.role === 'admin' ? <AdminDrawer /> : <AppDrawer />) : null}
    </DrawerCtx.Provider>
  );
}
