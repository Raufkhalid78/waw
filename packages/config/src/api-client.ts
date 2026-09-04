export interface ApiClientConfig {
  baseUrl: string;
  tokenKey?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  params?: Record<string, string>;
  retries?: number;
}

export class ApiClient {
  private baseUrl: string;
  private tokenKey: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.tokenKey = config.tokenKey || "waw_auth_token";
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.tokenKey);
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return url.toString();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const { params, retries = this.maxRetries, headers: extraHeaders, ...rest } = options;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(extraHeaders as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.buildUrl(path, params), {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          ...rest,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const error = new Error(errorBody.error || `HTTP ${response.status}`);
          (error as any).status = response.status;
          (error as any).body = errorBody;

          if (response.status === 401 && typeof window !== "undefined") {
            localStorage.removeItem(this.tokenKey);
          }

          if (response.status >= 500 && attempt < retries) {
            lastError = error;
            await this.sleep(this.retryDelay * (attempt + 1));
            continue;
          }

          throw error;
        }

        return (await response.json()) as T;
      } catch (err) {
        if (err instanceof TypeError && attempt < retries) {
          lastError = err as Error;
          await this.sleep(this.retryDelay * (attempt + 1));
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }
}

let defaultClient: ApiClient | null = null;

export function getApiClient(config?: ApiClientConfig): ApiClient {
  if (!defaultClient && config) {
    defaultClient = new ApiClient(config);
  }
  return defaultClient!;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
