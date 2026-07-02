"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useDatabaseMode } from "@/components/DatabaseModeContext";
import { apiForMode } from "@/services/api";
import { vinculoStatuses, type Estudante, type Vinculo } from "@/types/entities";

type FormState = {
  matricula_estudante: string;
  status_vinculo: string;
  data_ingresso: string;
};

const emptyForm: FormState = {
  matricula_estudante: "",
  status_vinculo: "",
  data_ingresso: "",
};

function normalizeDate(value: string) {
  return value.slice(0, 10);
}

export function VinculosClient() {
  const { mode } = useDatabaseMode();
  const api = useMemo(() => apiForMode(mode), [mode]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Vinculo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const estudantesByMatricula = useMemo(
    () =>
      new Map(
        estudantes.map((estudante) => [
          Number(estudante.matricula),
          estudante,
        ]),
      ),
    [estudantes],
  );

  const fetchData = useCallback(async () => {
    const [vinculosData, estudantesData] = await Promise.all([
      api.get<Vinculo[]>("/vinculos"),
      api.get<Estudante[]>("/estudantes"),
    ]);

    return { vinculosData, estudantesData };
  }, [api]);

  async function loadData() {
    try {
      setError("");
      setIsLoading(true);
      const { vinculosData, estudantesData } = await fetchData();
      setVinculos(vinculosData);
      setEstudantes(estudantesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar vínculos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialData() {
      try {
        const { vinculosData, estudantesData } = await fetchData();

        if (isActive) {
          setVinculos(vinculosData);
          setEstudantes(estudantesData);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "Erro ao carregar vínculos.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, [fetchData]);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(vinculo: Vinculo) {
    setEditing(vinculo);
    setForm({
      matricula_estudante: String(vinculo.matricula_estudante),
      status_vinculo: vinculo.status_vinculo,
      data_ingresso: normalizeDate(vinculo.data_ingresso),
    });
    setError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = {
      matricula_estudante: form.matricula_estudante,
      status_vinculo: form.status_vinculo,
      data_ingresso: form.data_ingresso,
    };

    try {
      if (editing) {
        await api.put<Vinculo>(`/vinculos/${editing.id_vinculo}`, payload);
      } else {
        await api.post<Vinculo>("/vinculos", payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar vínculo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(vinculo: Vinculo) {
    if (
      !window.confirm(
        `Excluir vínculo ${vinculo.id_vinculo}? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.delete(`/vinculos/${vinculo.id_vinculo}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir vínculo.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-950">Vínculos</h3>
          <p className="text-sm text-slate-500">
            Cadastre vínculos selecionando a matrícula de um estudante existente.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="theme-button-primary rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
        >
          Adicionar Novo
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="theme-bg-primary text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Estudante</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Data de ingresso</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Carregando vínculos...
                  </td>
                </tr>
              ) : vinculos.length > 0 ? (
                vinculos.map((vinculo) => {
                  const estudante = estudantesByMatricula.get(
                    Number(vinculo.matricula_estudante),
                  );
                  const estudanteLabel = estudante
                    ? `${vinculo.matricula_estudante} - ${estudante.nome}`
                    : `Matrícula ${vinculo.matricula_estudante}`;

                  return (
                    <tr key={vinculo.id_vinculo} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {vinculo.id_vinculo}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{estudanteLabel}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {vinculo.status_vinculo}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {normalizeDate(vinculo.data_ingresso)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(vinculo)}
                            className="theme-button-outline rounded-md border px-3 py-1.5 text-xs font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(vinculo)}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Nenhum vínculo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-slate-950">
                  {editing ? "Editar vínculo" : "Adicionar vínculo"}
                </h4>
                <p className="text-sm text-slate-500">
                  Escolha um estudante cadastrado para evitar erro de matrícula.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar modal"
              >
                X
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Estudante</span>
                <select
                  required
                  value={form.matricula_estudante}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      matricula_estudante: event.target.value,
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                >
                  <option value="">Selecione uma matrícula</option>
                  {estudantes.map((estudante) => (
                    <option key={estudante.matricula} value={estudante.matricula}>
                      {estudante.matricula} - {estudante.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Status do vínculo</span>
                <select
                  required
                  value={form.status_vinculo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status_vinculo: event.target.value,
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                >
                  <option value="">Selecione um status</option>
                  {vinculoStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Data de ingresso</span>
                <input
                  type="date"
                  required
                  value={form.data_ingresso}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      data_ingresso: event.target.value,
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="theme-button-primary rounded-md px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
