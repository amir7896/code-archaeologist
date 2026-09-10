import { ApiError, errorFromResponse } from './errors';
import { normalizeBaseUrl, toQuery } from './query';
import { type TokenPair } from './types';
import { SDK_API_PREFIX, SDK_USER_AGENT, SDK_VERSION } from './version';

export type RequestOptions = {
  method?: string;
  json?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  timeoutMs?: number;
};

export type HttpHooks = {
  onTokens?: (tokens: TokenPair) => void | Promise<void>;
};

export type FetchLike = typeof fetch;

const DEFAULT_TIMEOUT_MS = 30_000;

export class HttpClient {
  readonly baseUrl: string;
  readonly apiPrefix = SDK_API_PREFIX;
  private accessToken?: string;
  private refreshToken?: string;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(
    baseUrl: string,
    private readonly fetchImpl: FetchLike,
    private readonly hooks: HttpHooks = {},
    tokens?: Partial<TokenPair>,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.accessToken = tokens?.accessToken;
    this.refreshToken = tokens?.refreshToken;
  }

  setTokens(tokens: Partial<TokenPair>): void {
    if (tokens.accessToken !== undefined) {
      this.accessToken = tokens.accessToken;
    }
    if (tokens.refreshToken !== undefined) {
      this.refreshToken = tokens.refreshToken;
    }
  }

  getTokens(): Partial<TokenPair> {
    return { accessToken: this.accessToken, refreshToken: this.refreshToken };
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);
    if (response.status === 401 && options.auth !== false && this.refreshToken) {
      const refreshed = await this.refresh();
      if (refreshed) {
        return this.read<T>(await this.send(path, options));
      }
    }
    return this.read<T>(response);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const headers = new Headers({
      Accept: 'application/json',
      'X-CA-SDK-Version': SDK_VERSION,
    });
    if (typeof (globalThis as { document?: unknown }).document === 'undefined') {
      headers.set('User-Agent', SDK_USER_AGENT);
    }
    if (options.json !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    if (options.auth !== false && this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}${toQuery(options.query ?? {})}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.json === undefined ? undefined : JSON.stringify(options.json),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timed out', 'REQUEST_TIMEOUT');
      }
      throw new ApiError(0, error instanceof Error ? error.message : 'Unable to reach the API', 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async read<T>(response: Response): Promise<T> {
    const body = await readJson(response);
    if (!response.ok) {
      throw errorFromResponse(response.status, body);
    }
    return body as T;
  }

  private refresh(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshOnce().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async refreshOnce(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }
    try {
      const tokens = await this.request<TokenPair>('/auth/refresh', {
        method: 'POST',
        json: { refreshToken: this.refreshToken },
        auth: false,
      });
      this.setTokens(tokens);
      await this.hooks.onTokens?.(tokens);
      return true;
    } catch {
      return false;
    }
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}
