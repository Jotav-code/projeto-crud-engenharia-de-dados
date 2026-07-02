"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type DatabaseMode = "relational" | "nosql";

type DatabaseModeContextValue = {
  mode: DatabaseMode;
  setMode: (mode: DatabaseMode) => void;
  isNoSql: boolean;
};

const DatabaseModeContext = createContext<DatabaseModeContextValue | null>(null);

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
  const [mode, setModeState] = useState<DatabaseMode>(() => {
    if (typeof window === "undefined") {
      return "relational";
    }

    const storedMode = window.localStorage.getItem("database-mode");

    if (storedMode === "nosql" || storedMode === "relational") {
      return storedMode;
    }

    return "relational";
  });

  const setMode = useCallback((nextMode: DatabaseMode) => {
    setModeState(nextMode);
    window.localStorage.setItem("database-mode", nextMode);
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
