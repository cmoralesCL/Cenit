
'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

// Function to get a cookie by name
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// Function to set a cookie
const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
};

export type Mode = 'individual' | 'group';

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
  groupId: string | null;
  setGroupId: (groupId: string | null) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>('individual');
  const [groupId, setGroupIdState] = useState<string | null>(null);

  useEffect(() => {
    const storedGroupId = getCookie('groupId');
    if (storedGroupId) {
      setGroupIdState(storedGroupId);
      setModeState('group');
    } else {
      setModeState('individual');
    }
  }, []);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
  };

  const setGroupId = (newGroupId: string | null) => {
    setGroupIdState(newGroupId);
    if (newGroupId) {
      setCookie('groupId', newGroupId, 7); // Persist for 7 days
    } else {
      setCookie('groupId', '', -1); // Delete cookie
    }
  };

  const value = useMemo(() => ({ mode, setMode, groupId, setGroupId }), [mode, groupId]);

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
