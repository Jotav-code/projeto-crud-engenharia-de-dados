"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-x-0 top-0 z-30 border-b border-blue-800 bg-blue-950 text-white lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-20 items-center justify-between px-5 lg:h-24 lg:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
              UFS
            </p>
            <h1 className="text-lg font-bold">Admin Acadêmico</h1>
          </div>
          <span className="rounded bg-white px-2 py-1 text-xs font-bold text-blue-950">
            CRUD
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible lg:px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block whitespace-nowrap rounded-md px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-blue-950 shadow-sm"
                    : "text-blue-100 hover:bg-blue-900 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pt-32 lg:pl-72 lg:pt-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
                Universidade Federal de Sergipe
              </p>
              <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
            </div>
            <p className="text-sm text-slate-500">
              API: projeto-crud-engenharia-de-dados.onrender.com
            </p>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
