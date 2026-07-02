"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useDatabaseMode } from "@/components/DatabaseModeContext";
import { apiForMode } from "@/services/api";
import type { Curso, Estudante, Usuario } from "@/types/entities";

type FormState = {
  matricula: string;
  nome: string;
  id_usuario: string;
  id_curso: string;
};

const emptyForm: FormState = {
  matricula: "",
  nome: "",
  id_usuario: "",
  id_curso: "",
};

export function EstudantesClient() {
  const { mode } = useDatabaseMode();
  const api = useMemo(() => apiForMode(mode), [mode]);
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Estudante | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const usuariosById = useMemo(
    () => new Map(usuarios.map((usuario) => [Number(usuario.id_usuario), usuario])),
    [usuarios],
  );

  const cursosById = useMemo(
    () => new Map(cursos.map((curso) => [Number(curso.id_curso), curso])),
    [cursos],
  );

  const fetchData = useCallback(async () => {
    const [estudantesData, usuariosData, cursosData] = await Promise.all([
      api.get<Estudante[]>("/estudantes"),
      api.get<Usuario[]>("/usuarios"),
      api.get<Curso[]>("/cursos"),
    ]);

    return { estudantesData, usuariosData, cursosData };
  }, [api]);

  async function loadData() {
    try {
      setError("");
      setIsLoading(true);
      const { estudantesData, usuariosData, cursosData } = await fetchData();

      setEstudantes(estudantesData);
      setUsuarios(usuariosData);
      setCursos(cursosData);
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
        const { estudantesData, usuariosData, cursosData } = await fetchData();

        if (isActive) {
          setEstudantes(estudantesData);
          setUsuarios(usuariosData);
          setCursos(cursosData);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar estudantes.",
          );
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
      matricula: String(estudante.matricula),
      nome: estudante.nome,
      id_usuario: String(estudante.id_usuario),
      id_curso: String(estudante.id_curso),
    });
    setError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (editing) {
        await api.put<Estudante>(`/estudantes/${editing.matricula}`, {
          nome: form.nome.trim(),
          id_usuario: form.id_usuario,
          id_curso: form.id_curso,
        });
      } else {
        await api.post<Estudante>("/estudantes", {
          matricula: form.matricula,
          nome: form.nome.trim(),
          id_usuario: form.id_usuario,
          id_curso: form.id_curso,
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
        `Excluir "${estudante.nome}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.delete(`/estudantes/${estudante.matricula}`);
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
            Cadastro com matrícula, usuário e curso associados.
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
                <th className="px-4 py-3 text-left font-semibold">Nome</th>
                <th className="px-4 py-3 text-left font-semibold">Usuário</th>
                <th className="px-4 py-3 text-left font-semibold">Curso</th>
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
                estudantes.map((estudante) => (
                  <tr key={estudante.matricula} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-950">
                      {estudante.matricula}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{estudante.nome}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {usuariosById.get(Number(estudante.id_usuario))?.email ??
                        `ID ${estudante.id_usuario}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {cursosById.get(Number(estudante.id_curso))?.nome_curso ??
                        `ID ${estudante.id_curso}`}
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
                ))
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
                  A matrícula é enviada apenas no cadastro, conforme a API.
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
                  type="number"
                  required
                  disabled={Boolean(editing)}
                  value={form.matricula}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      matricula: event.target.value,
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition disabled:bg-slate-100"
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Nome</span>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nome: event.target.value }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Usuário</span>
                <select
                  required
                  value={form.id_usuario}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      id_usuario: event.target.value,
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                >
                  <option value="">Selecione um usuário</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id_usuario} value={usuario.id_usuario}>
                      {usuario.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Curso</span>
                <select
                  required
                  value={form.id_curso}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      id_curso: event.target.value,
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                >
                  <option value="">Selecione um curso</option>
                  {cursos.map((curso) => (
                    <option key={curso.id_curso} value={curso.id_curso}>
                      {curso.nome_curso}
                    </option>
                  ))}
                </select>
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
