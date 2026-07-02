"use client";

import { useEffect, useMemo, useState } from "react";
import { useDatabaseMode } from "@/components/DatabaseModeContext";
import { apiForMode } from "@/services/api";
import type { Curso, Estudante, Usuario, Vinculo } from "@/types/entities";

type DashboardData = {
  cursos: Curso[];
  usuarios: Usuario[];
  estudantes: Estudante[];
  vinculos: Vinculo[];
};

const emptyData: DashboardData = {
  cursos: [],
  usuarios: [],
  estudantes: [],
  vinculos: [],
};

export function DashboardClient() {
  const { mode } = useDatabaseMode();
  const api = useMemo(() => apiForMode(mode), [mode]);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError("");
        const [cursos, usuarios, estudantes, vinculos] = await Promise.all([
          api.get<Curso[]>("/cursos"),
          api.get<Usuario[]>("/usuarios"),
          api.get<Estudante[]>("/estudantes"),
          api.get<Vinculo[]>("/vinculos"),
        ]);

        setData({ cursos, usuarios, estudantes, vinculos });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [api]);

  const studentsByCourse = useMemo(() => {
    return data.cursos
      .map((curso) => ({
        label: curso.nome_curso,
        total: data.estudantes.filter(
          (estudante) => Number(estudante.id_curso) === Number(curso.id_curso),
        ).length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [data.cursos, data.estudantes]);

  const maxCourseTotal = Math.max(...studentsByCourse.map((item) => item.total), 1);

  const stats = [
    { label: "Total de Estudantes", value: data.estudantes.length },
    { label: "Total de Cursos", value: data.cursos.length },
    { label: "Usuários Cadastrados", value: data.usuarios.length },
    { label: "Vínculos Registrados", value: data.vinculos.length },
  ];

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <strong className="theme-text-strong mt-3 block text-3xl font-bold">
              {isLoading ? "..." : stat.value}
            </strong>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-950">
                Estudantes por curso
              </h3>
              <p className="text-sm text-slate-500">
                Distribuição calculada a partir dos registros atuais.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-slate-500">Carregando dados...</p>
            ) : studentsByCourse.length > 0 ? (
              studentsByCourse.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="theme-text-strong font-semibold">{item.total}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="theme-bg-accent h-full rounded-full"
                      style={{
                        width: `${Math.max((item.total / maxCourseTotal) * 100, 6)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Nenhum curso com estudante cadastrado.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-950">Status de vínculos</h3>
          <div className="mt-5 space-y-3">
            {isLoading ? (
              <p className="text-sm text-slate-500">Carregando vínculos...</p>
            ) : data.vinculos.length > 0 ? (
              Object.entries(
                data.vinculos.reduce<Record<string, number>>((acc, vinculo) => {
                  acc[vinculo.status_vinculo] =
                    (acc[vinculo.status_vinculo] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([status, total]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-700">{status}</span>
                  <strong className="theme-text-strong text-sm">{total}</strong>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nenhum vínculo cadastrado.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
