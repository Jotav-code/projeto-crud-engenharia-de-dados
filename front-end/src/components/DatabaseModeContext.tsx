"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export type DatabaseMode = "relational" | "nosql";

type DatabaseModeContextValue = {
  mode: DatabaseMode;
  setMode: (mode: DatabaseMode) => void;
  isNoSql: boolean;
};

const DatabaseModeContext = createContext<DatabaseModeContextValue | null>(null);
const databaseModeChangedEvent = "database-mode-changed";

export function DatabaseModeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DatabaseModeContextValue;
}) {
  return (
    <DatabaseModeContext.Provider value={value}>
      {children}
    </DatabaseModeContext.Provider>
  );
}

export function useDatabaseMode() {
  const context = useContext(DatabaseModeContext);

  if (!context) {
    throw new Error("useDatabaseMode deve ser usado dentro de DatabaseModeProvider.");
  }

  return context;
}

export function useDatabaseModeState() {
  const storedMode = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(databaseModeChangedEvent, onStoreChange);

      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(databaseModeChangedEvent, onStoreChange);
      };
    },
    (): DatabaseMode => {
      const currentMode = window.localStorage.getItem("database-mode");

      return currentMode === "nosql" || currentMode === "relational"
        ? currentMode
        : "relational";
    },
    (): DatabaseMode => "relational",
  );
  const mode = storedMode;

  const setMode = useCallback((nextMode: DatabaseMode) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("database-mode", nextMode);
    window.dispatchEvent(new Event(databaseModeChangedEvent));
  }, []);

  return useMemo(
    () => ({
      mode,
      setMode,
      isNoSql: mode === "nosql",
    }),
    [mode, setMode],
  );
}
