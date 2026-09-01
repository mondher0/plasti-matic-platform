const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

const TOKEN_STORAGE_KEY = 'plastimatic_shop_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fires when a request made *with* a token comes back 401/403 — i.e. an
 * already-logged-in session just got rejected by the server, which only
 * happens because the account was blocked or deleted (see JwtStrategy on
 * the API — it re-checks status on every request). AuthProvider registers
 * this on mount to force a logout + show the server's message. A 401/403 on
 * a request made *without* a token (e.g. a failed login attempt) does not
 * trigger this — there's no session to tear down, and the login page
 * already surfaces that error itself.
 */
type UnauthorizedHandler = (message: string) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Thin fetch wrapper: attaches the bearer token when logged in, always
 * sends/receives cookies (`credentials: 'include'`) since the guest cart
 * relies on an httpOnly session cookie set by the API.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? response.statusText);
    if (token && (response.status === 401 || response.status === 403)) {
      unauthorizedHandler?.(message);
    }
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => apiRequest<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

/**
 * Multipart upload — deliberately bypasses `apiRequest`: a file body must not
 * get `Content-Type: application/json` (and must not be `JSON.stringify`-ed),
 * the browser needs to set its own multipart boundary header. Still mirrors
 * `apiRequest`'s credentials/unauthorized-handling so a blocked/deleted
 * account is torn down consistently even on this path.
 */
export async function uploadFile<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? response.statusText);
    if (token && (response.status === 401 || response.status === 403)) {
      unauthorizedHandler?.(message);
    }
    throw new ApiError(message, response.status);
  }
  return data as T;
}
