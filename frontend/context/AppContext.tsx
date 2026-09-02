import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

interface AppContextType {
  isUnlocked: boolean;
  setUnlocked: (val: boolean) => void;
}

const AppCtx = createContext<AppContextType>({
  isUnlocked: false,
  setUnlocked: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setUnlocked] = useState(false);
  const stateRef = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (stateRef.current === 'active' && nextState.match(/inactive|background/)) {
        setUnlocked(false);
      }
      stateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  return (
    <AppCtx.Provider value={{ isUnlocked, setUnlocked }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
