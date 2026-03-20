export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  query?: Record<string, string | string[] | number | boolean | undefined>;
  body?: unknown;
}

export class TempoClient {
  private baseUrl: string;
  private token: string;

  constructor(opts: { baseUrl: string; staticToken: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.token = opts.staticToken;
  }

  async request<T = unknown>(options: RequestOptions): Promise<T> {
    const url = new URL(`${this.baseUrl}${options.path}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, String(v));
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
    };

    if (options.body && options.method !== "GET" && options.method !== "DELETE") {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (response.status === 204) {
      return { success: true } as T;
    }

    const text = await response.text();
    if (!text) {
      return { success: true, status: response.status } as T;
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Tempo API returned non-JSON response (${response.status}): ${text.substring(0, 500)}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Tempo API error (${response.status}): ${JSON.stringify(data)}`
      );
    }

    return data as T;
  }
}
