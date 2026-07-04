"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useDatabaseMode } from "@/components/DatabaseModeContext";
import { apiForMode } from "@/services/api";
import {
  vinculoStatuses,
  type Curso,
  type Estudante,
  type Usuario,
  type Vinculo,
} from "@/types/entities";

type FormState = {
  mat_estudante: string;
  curso: string;
  data_entrada: string;
  status: string;
  data_saida: string;
};

const emptyForm: FormState = {
  mat_estudante: "",
  curso: "",
  data_entrada: "",
  status: "",
  data_saida: "",
};

function normalizeDate(value: string | null) {
  return value ? value.slice(0, 10) : "-";
}

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

export function VinculosClient() {
  const { mode } = useDatabaseMode();
  const api = useMemo(() => apiForMode(mode), [mode]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
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
          estudante.mat_estudante,
          estudante,
        ]),
      ),
    [estudantes],
  );

  const usuariosByCpf = useMemo(
    () => new Map(usuarios.map((usuario) => [String(usuario.cpf), usuario])),
    [usuarios],
  );

  const cursosById = useMemo(
    () => new Map(cursos.map((curso) => [Number(curso.idcurso), curso])),
    [cursos],
  );

  const fetchData = useCallback(async () => {
    const [vinculosData, estudantesData, usuariosData, cursosData] =
      await Promise.all([
        api.get<Vinculo[]>("/vinculos"),
        api.get<Estudante[]>("/estudantes"),
        api.get<Usuario[]>("/usuarios"),
        api.get<Curso[]>("/cursos"),
      ]);

    return { vinculosData, estudantesData, usuariosData, cursosData };
  }, [api]);

  async function loadData() {
    try {
      setError("");
      setIsLoading(true);
      const { vinculosData, estudantesData, usuariosData, cursosData } =
        await fetchData();
      setVinculos(vinculosData);
      setEstudantes(estudantesData);
      setUsuarios(usuariosData);
      setCursos(cursosData);
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
        const { vinculosData, estudantesData, usuariosData, cursosData } =
          await fetchData();

        if (isActive) {
          setVinculos(vinculosData);
          setEstudantes(estudantesData);
          setUsuarios(usuariosData);
          setCursos(cursosData);
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

  function estudanteLabel(matricula: string | null) {
    if (!matricula) {
      return "-";
    }

    const estudante = estudantesByMatricula.get(matricula);
    const usuario = estudante?.cpf ? usuariosByCpf.get(String(estudante.cpf)) : null;
    return usuario
      ? `${matricula} - ${usuario.nome}`
      : estudante?.nome
      ? `${matricula} - ${estudante.nome}`
      : estudante
      ? `${matricula} - CPF ${estudante.cpf ? formatCpf(estudante.cpf) : "não vinculado"}`
      : `Matrícula ${matricula}`;
  }

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(vinculo: Vinculo) {
    setEditing(vinculo);
    setForm({
      mat_estudante: vinculo.mat_estudante ?? "",
      curso: vinculo.curso === null || vinculo.curso === undefined ? "" : String(vinculo.curso),
      data_entrada: vinculo.data_entrada ? vinculo.data_entrada.slice(0, 10) : "",
      status: vinculo.status ?? "",
      data_saida: vinculo.data_saida ? vinculo.data_saida.slice(0, 10) : "",
    });
    setError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = {
      mat_estudante: form.mat_estudante,
      curso: form.curso,
      data_entrada: form.data_entrada || null,
      status: form.status,
      data_saida: form.data_saida || null,
    };

    try {
      if (editing) {
        await api.put<Vinculo>(`/vinculos/${editing.idvinculo}`, payload);
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
        `Excluir vínculo ${vinculo.idvinculo}? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.delete(`/vinculos/${vinculo.idvinculo}`);
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
            Cadastre vínculos selecionando uma matrícula e um curso existentes.
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
                <th className="px-4 py-3 text-left font-semibold">Curso</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Entrada</th>
                <th className="px-4 py-3 text-left font-semibold">Saída</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    Carregando vínculos...
                  </td>
                </tr>
              ) : vinculos.length > 0 ? (
                vinculos.map((vinculo) => (
                  <tr key={vinculo.idvinculo} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-950">
                      {vinculo.idvinculo}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {estudanteLabel(vinculo.mat_estudante)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {vinculo.curso
                        ? cursosById.get(Number(vinculo.curso))?.nome ??
                          `Curso ${vinculo.curso}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{vinculo.status ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {normalizeDate(vinculo.data_entrada)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {normalizeDate(vinculo.data_saida)}
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
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
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
                  Status segue o enum do schema universidade.
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
                  value={form.mat_estudante}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mat_estudante: event.target.value,
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                >
                  <option value="">Selecione uma matrícula</option>
                  {estudantes.map((estudante) => (
                    <option key={estudante.mat_estudante} value={estudante.mat_estudante}>
                      {estudanteLabel(estudante.mat_estudante)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Curso</span>
                <select
                  required
                  value={form.curso}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, curso: event.target.value }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                >
                  <option value="">Selecione um curso</option>
                  {cursos.map((curso) => (
                    <option key={curso.idcurso} value={curso.idcurso}>
                      {curso.idcurso} - {curso.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Status</span>
                <select
                  required
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
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
                <span>Data de entrada</span>
                <input
                  type="date"
                  value={form.data_entrada}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      data_entrada: event.target.value,
                    }))
                  }
                  className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition"
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Data de saída</span>
                <input
                  type="date"
                  value={form.data_saida}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      data_saida: event.target.value,
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
