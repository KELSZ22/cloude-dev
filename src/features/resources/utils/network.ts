import { REQUEST_TIMEOUT_MS, providerLabel, resourceUserAgent } from "../config";
import { ResourceApiError, type ResourceErrorCode } from "../types/resource.types";

export interface ProviderDeps {
  fetch?: typeof fetch;
  contactEmail?: string;
  timeoutMs?: number;
  minIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface HttpClient {
  getJson(url: string, signal?: AbortSignal): Promise<unknown>;
  getText(url: string, signal?: AbortSignal): Promise<string>;
  getJsonOrNull(url: string, signal?: AbortSignal): Promise<unknown | null>;
  fetchResponse(url: string, init: RequestInit & { signal?: AbortSignal }): Promise<Response>;
}

const RETRYABLE_STATUS = new Set([429, 503]);

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createHttpClient(provider: string, deps: ProviderDeps = {}): HttpClient {
  const fetcher = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const email = deps.contactEmail;

  async function fetchResponse(url: string, init: RequestInit = {}): Promise<Response> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw failure(provider, "network", true);
    }
    const caller = init.signal;
    const controller = new AbortController();
    let reason: "timeout" | "cancelled" | null = null;
    const timer = setTimeout(() => {
      reason = "timeout";
      controller.abort();
    }, timeoutMs);
    const onAbort = () => {
      reason = "cancelled";
      controller.abort();
    };
    caller?.addEventListener("abort", onAbort);
    if (caller?.aborted) onAbort();
    try {
      return await fetcher(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...requestHeaders(email),
          ...init.headers,
        },
      });
    } catch (error) {
      if (reason === "cancelled" || caller?.aborted) throw failure(provider, "cancelled", false);
      if (reason === "timeout") throw failure(provider, "timeout", true);
      if (error instanceof ResourceApiError) throw error;
      throw failure(provider, "network", true);
    } finally {
      clearTimeout(timer);
      caller?.removeEventListener("abort", onAbort);
    }
  }

  async function read(
    url: string,
    signal: AbortSignal | undefined,
    accept: string,
    attempt = 0,
  ): Promise<Response> {
    const response = await fetchResponse(url, { signal, headers: { Accept: accept } });
    if (RETRYABLE_STATUS.has(response.status) && attempt < 1) {
      const wait = retryDelay(response.headers.get("retry-after"));
      if (wait !== null) {
        await response.body?.cancel().catch(() => undefined);
        await (deps.sleep ?? delay)(wait);
        return read(url, signal, accept, attempt + 1);
      }
    }
    return response;
  }

  async function getText(url: string, signal?: AbortSignal): Promise<string> {
    const response = await read(url, signal, "*/*");
    if (!response.ok) throw httpFailure(provider, response.status);
    const body = await response.text();
    if (body.length > 5_000_000) throw failure(provider, "invalid", false, response.status);
    return body;
  }

  async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
    const response = await read(url, signal, "application/json");
    if (!response.ok) throw httpFailure(provider, response.status);
    const body = await response.text();
    if (body.length > 5_000_000) throw failure(provider, "invalid", false, response.status);
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw failure(provider, "invalid", false);
    }
  }

  async function getJsonOrNull(url: string, signal?: AbortSignal): Promise<unknown | null> {
    const response = await read(url, signal, "application/json");
    if (response.status === 404) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
    if (!response.ok) throw httpFailure(provider, response.status);
    const body = await response.text();
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw failure(provider, "invalid", false, response.status);
    }
  }

  return { getJson, getText, getJsonOrNull, fetchResponse };
}

function requestHeaders(email?: string): Record<string, string> {
  const agent = resourceUserAgent(email);
  const headers: Record<string, string> = { "Api-User-Agent": agent };
  if (typeof document === "undefined") headers["User-Agent"] = agent;
  return headers;
}

function retryDelay(header: string | null): number | null {
  if (!header) return 1_000;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    const ms = Math.max(0, seconds * 1000);
    return ms <= 5_000 ? ms : null;
  }
  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  const ms = date - Date.now();
  if (ms < 0) return 0;
  return ms <= 5_000 ? ms : null;
}

function httpFailure(provider: string, status: number): ResourceApiError {
  const retryable = status === 429 || status >= 500;
  return failure(provider, "http", retryable, status);
}

function failure(
  provider: string,
  code: ResourceErrorCode,
  retryable: boolean,
  status?: number,
): ResourceApiError {
  const label = providerLabel(provider);
  const userMessage =
    code === "timeout" ? `${label} took too long to respond.`
    : code === "network" ? `Could not reach ${label}. Check your connection.`
    : code === "cancelled" ? "Search cancelled."
    : code === "config" ? `${label} needs a contact email before it can be used.`
    : code === "invalid" ? `${label} returned a response that could not be read.`
    : `${label} could not complete the request.`;
  return new ResourceApiError({ provider, code, retryable, status, userMessage });
}

export function configError(provider: string, userMessage: string): ResourceApiError {
  return new ResourceApiError({
    provider,
    code: "config",
    retryable: false,
    userMessage,
  });
}

export function invalidError(provider: string): ResourceApiError {
  return failure(provider, "invalid", false);
}
