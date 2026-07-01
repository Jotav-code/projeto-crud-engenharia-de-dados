import type { ApiError } from "@/types/entities";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://projeto-crud-engenharia-de-dados.onrender.com";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = "Não foi possível completar a operação.";

    try {
      const payload = (await response.json()) as ApiError;
      message = payload.erro ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
