import type { ApiError } from "@/types/entities";
import type { DatabaseMode } from "@/components/DatabaseModeContext";

export const RELATIONAL_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PROXY_URL ?? "/api/backend";
export const NOSQL_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_NOSQL_PROXY_URL ?? "/api/backend-nosql";

function getApiBaseUrl(mode: DatabaseMode = "relational") {
  return mode === "nosql" ? NOSQL_API_BASE_URL : RELATIONAL_API_BASE_URL;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  databaseMode?: DatabaseMode;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  const { body, databaseMode, ...fetchOptions } = options;

  try {
    response = await fetch(`${getApiBaseUrl(databaseMode)}${path}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "Falha de rede ao acessar a API. Verifique se o proxy do Next está ativo.",
    );
  }

  if (!response.ok) {
    let message = "Não foi possível completar a operação.";
    const contentType = response.headers.get("content-type") ?? "";

    try {
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as ApiError;
        message = payload.erro ?? message;
      } else {
        const text = await response.text();
        message = text.trim() || response.statusText || message;
      }
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

export function apiForMode(mode: DatabaseMode) {
  return {
    get: <T>(path: string) =>
      apiRequest<T>(path, { method: "GET", databaseMode: mode }),
    post: <T>(path: string, body: unknown) =>
      apiRequest<T>(path, { method: "POST", body, databaseMode: mode }),
    put: <T>(path: string, body: unknown) =>
      apiRequest<T>(path, { method: "PUT", body, databaseMode: mode }),
    delete: <T>(path: string) =>
      apiRequest<T>(path, { method: "DELETE", databaseMode: mode }),
  };
}
