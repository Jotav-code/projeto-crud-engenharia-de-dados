"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  DatabaseModeProvider,
  useDatabaseModeState,
} from "@/components/DatabaseModeContext";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Cursos", href: "/cursos" },
  { label: "Usuários", href: "/usuarios" },
  { label: "Estudantes", href: "/estudantes" },
  { label: "Vínculos", href: "/vinculos" },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/cursos": "Cursos",
  "/usuarios": "Usuários",
  "/estudantes": "Estudantes",
  "/vinculos": "Vínculos",
};

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Painel Administrativo";
  const databaseMode = useDatabaseModeState();
  const { mode, setMode, isNoSql } = databaseMode;
  const apiLabel = isNoSql ? "MongoDB / NoSQL" : "PostgreSQL / Relacional";

  return (
    <DatabaseModeProvider value={databaseMode}>
      <div data-db-mode={mode} className="min-h-screen lg:flex">
        <aside className="theme-border-primary theme-bg-primary fixed inset-x-0 top-0 z-30 border-b text-white lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex h-20 items-center justify-between px-5 lg:h-24 lg:px-6">
            <div>
              <p className="theme-text-muted text-xs font-semibold uppercase tracking-[0.24em]">
                UFS
              </p>
              <h1 className="text-lg font-bold">Admin Acadêmico</h1>
            </div>
            <span className="theme-badge rounded px-2 py-1 text-xs font-bold">
              CRUD
            </span>
          </div>

          <div className="px-3 pb-3 lg:px-4">
            <div className="mb-3 grid grid-cols-2 rounded-md bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setMode("relational")}
                className={`rounded px-3 py-2 text-xs font-semibold transition ${
                  mode === "relational"
                    ? "bg-white text-blue-950"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Relacional
              </button>
              <button
                type="button"
                onClick={() => setMode("nosql")}
                className={`rounded px-3 py-2 text-xs font-semibold transition ${
                  mode === "nosql"
                    ? "bg-white text-emerald-950"
                    : "text-white hover:bg-white/10"
                }`}
              >
                NoSQL
              </button>
            </div>

            <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
              {navigation.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block whitespace-nowrap rounded-md px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "theme-nav-active bg-white shadow-sm"
                        : "theme-nav-inactive hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col pt-44 lg:pl-72 lg:pt-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="theme-text-accent text-xs font-semibold uppercase tracking-[0.18em]">
                  Universidade Federal de Sergipe
                </p>
                <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
              </div>
              <p className="text-sm text-slate-500">Banco atual: {apiLabel}</p>
            </div>
          </header>

          <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </DatabaseModeProvider>
  );
}
