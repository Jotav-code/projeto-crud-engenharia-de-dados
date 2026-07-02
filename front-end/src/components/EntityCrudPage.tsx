"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useDatabaseMode } from "@/components/DatabaseModeContext";
import { apiForMode } from "@/services/api";

type FieldConfig<T> = {
  name: keyof T & string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "password";
  required?: boolean;
  readOnlyOnEdit?: boolean;
};

type EntityCrudPageProps<T extends Record<string, unknown>> = {
  title: string;
  endpoint: string;
  idField: keyof T & string;
  columns: FieldConfig<T>[];
  formFields: FieldConfig<T>[];
  emptyForm: Record<string, string>;
  getDeleteLabel: (item: T) => string;
};

export function EntityCrudPage<T extends Record<string, unknown>>({
  title,
  endpoint,
  idField,
  columns,
  formFields,
  emptyForm,
  getDeleteLabel,
}: EntityCrudPageProps<T>) {
  const { mode, isNoSql } = useDatabaseMode();
  const api = useMemo(() => apiForMode(mode), [mode]);
  const [items, setItems] = useState<T[]>([]);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const modalTitle = useMemo(
    () => (editingItem ? `Editar ${title}` : `Adicionar ${title}`),
    [editingItem, title],
  );

  const fetchItems = useCallback(async () => {
    return api.get<T[]>(endpoint);
  }, [api, endpoint]);

  async function loadItems() {
    try {
      setError("");
      setIsLoading(true);
      setItems(await fetchItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar registros.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialItems() {
      try {
        const initialItems = await fetchItems();

        if (isActive) {
          setItems(initialItems);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar registros.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadInitialItems();

    return () => {
      isActive = false;
    };
  }, [fetchItems]);

  function openCreateModal() {
    setEditingItem(null);
    setForm(emptyForm);
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(item: T) {
    const nextForm = { ...emptyForm };
    formFields.forEach((field) => {
      const value = item[field.name];
      nextForm[field.name] =
        field.type === "password"
          ? ""
          : field.type === "date" && typeof value === "string"
          ? value.slice(0, 10)
          : String(value ?? "");
    });

    setEditingItem(item);
    setForm(nextForm);
    setError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          value.trim(),
        ]),
      );

      if (editingItem) {
        await api.put<T>(`${endpoint}/${editingItem[idField]}`, payload);
      } else {
        await api.post<T>(endpoint, payload);
      }

      setIsModalOpen(false);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar registro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: T) {
    const label = getDeleteLabel(item);

    if (!window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setError("");
      await api.delete(`${endpoint}/${item[idField]}`);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir registro.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">
            Gerencie os registros consumindo a API REST {isNoSql ? "NoSQL" : "relacional"}.
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
                {columns.map((column) => (
                  <th key={column.name} className="px-4 py-3 text-left font-semibold">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length + 1}>
                    Carregando registros...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr key={String(item[idField])} className="hover:bg-slate-50">
                    {columns.map((column) => (
                      <td key={column.name} className="max-w-xs break-all px-4 py-3 text-slate-700">
                        {String(item[column.name] ?? "-")}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="theme-button-outline rounded-md border px-3 py-1.5 text-xs font-semibold"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
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
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length + 1}>
                    Nenhum registro encontrado.
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
            className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-slate-950">{modalTitle}</h4>
                <p className="text-sm text-slate-500">Preencha os campos obrigatórios.</p>
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
              {formFields.map((field) => (
                <label key={field.name} className="space-y-1 text-sm font-medium text-slate-700">
                  <span>{field.label}</span>
                  <input
                    type={field.type ?? "text"}
                    required={field.required}
                    value={form[field.name] ?? ""}
                    disabled={Boolean(editingItem && field.readOnlyOnEdit)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    className="theme-input w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition disabled:bg-slate-100"
                  />
                </label>
              ))}
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
