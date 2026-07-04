"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useDatabaseMode } from "@/components/DatabaseModeContext";
import { apiForMode } from "@/services/api";
import type { Estudante, Usuario } from "@/types/entities";

type FormState = {
  mat_estudante: string;
  cpf: string;
  mc: string;
  ano_ingresso: string;
};

const emptyForm: FormState = {
  mat_estudante: "",
  cpf: "",
  mc: "",
  ano_ingresso: "",
};

function cpfDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatCpf(value: unknown) {
  const digits = cpfDigits(String(value ?? ""));

  if (digits.length !== 11) {
    return String(value ?? "-");
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function EstudantesClient() {
  const { mode } = useDatabaseMode();
  const api = useMemo(() => apiForMode(mode), [mode]);
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Estudante | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const usuariosByCpf = useMemo(
    () => new Map(usuarios.map((usuario) => [String(usuario.cpf), usuario])),
    [usuarios],
  );

  const fetchData = useCallback(async () => {
    const [estudantesData, usuariosData] = await Promise.all([
      api.get<Estudante[]>("/estudantes"),
      api.get<Usuario[]>("/usuarios"),
    ]);

    return { estudantesData, usuariosData };
  }, [api]);

  async function loadData() {
    try {
      setError("");
      setIsLoading(true);
      const { estudantesData, usuariosData } = await fetchData();
      setEstudantes(estudantesData);
      setUsuarios(usuariosData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar estudantes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialData() {
      try {
        const { estudantesData, usuariosData } = await fetchData();

        if (isActive) {
          setEstudantes(estudantesData);
          setUsuarios(usuariosData);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "Erro ao carregar estudantes.");
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

  function openEditModal(estudante: Estudante) {
    setEditing(estudante);
    setForm({
      mat_estudante: estudante.mat_estudante,
      cpf: estudante.cpf ?? "",
      mc: estudante.mc === null || estudante.mc === undefined ? "" : String(estudante.mc),
      ano_ingresso:
        estudante.ano_ingresso === null || estudante.ano_ingresso === undefined
          ? ""
          : String(estudante.ano_ingresso),
    });
    setError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = {
      cpf: form.cpf ? cpfDigits(form.cpf) : null,
      mc: form.mc.trim() || null,
      ano_ingresso: form.ano_ingresso.trim() || null,
    };

    try {
      if (editing) {
        await api.put<Estudante>(`/estudantes/${editing.mat_estudante}`, payload);
      } else {
        await api.post<Estudante>("/estudantes", {
          mat_estudante: form.mat_estudante.trim(),
          ...payload,
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar estudante.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(estudante: Estudante) {
    if (
      !window.confirm(
        `Excluir matrícula "${estudante.mat_estudante}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.delete(`/estudantes/${estudante.mat_estudante}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir estudante.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-950">Estudantes</h3>
          <p className="text-sm text-slate-500">
            Cadastro por matrícula com CPF de usuário associado.
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
                <th className="px-4 py-3 text-left font-semibold">Matrícula</th>
                <th className="px-4 py-3 text-left font-semibold">Usuário</th>
                <th className="px-4 py-3 text-left font-semibold">MC</th>
                <th className="px-4 py-3 text-left font-semibold">Ano ingresso</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Carregando estudantes...
                  </td>
                </tr>
              ) : estudantes.length > 0 ? (
                estudantes.map((estudante) => {
                  const usuario = estudante.cpf
                    ? usuariosByCpf.get(String(estudante.cpf))
                    : null;

                  return (
                    <tr key={estudante.mat_estudante} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {estudante.mat_estudante}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {usuario
                          ? `${formatCpf(estudante.cpf)} - ${usuario.nome}`
                          : estudante.nome
                          ? `${estudante.cpf ? formatCpf(estudante.cpf) : "Sem CPF"} - ${estudante.nome}`
                          : estudante.cpf
                          ? formatCpf(estudante.cpf)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{estudante.mc ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {estudante.ano_ingresso ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(estudante)}
                            className="theme-button-outline rounded-md border px-3 py-1.5 text-xs font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(estudante)}
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
                    Nenhum estudante cadastrado.
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
                  {editing ? "Editar estudante" : "Adicionar estudante"}
                </h4>
                <p className="text-sm text-slate-500">
                  A matrícula é a chave primária e deve ter até 12 caracteres.
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
                <span>Matrícula</span>
                <input
                  type="text"
                  maxLength={12}
                  required
                  disabled={Boolean(editing)}
                  value={form.mat_estudante}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mat_estudante: event.target.value.slice(0, 12),
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition disabled:bg-slate-100"
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Usuário</span>
                <select
                  value={form.cpf}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cpf: event.target.value }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                >
                  <option value="">Sem CPF vinculado</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.cpf} value={usuario.cpf}>
                      {formatCpf(usuario.cpf)} - {usuario.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>MC</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.mc}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, mc: event.target.value }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Ano de ingresso</span>
                <input
                  type="number"
                  value={form.ano_ingresso}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ano_ingresso: event.target.value,
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
