/**
 * lib/api.ts — the ONLY module in the app that touches the network (A.2.3).
 *
 * Owns: base URL (from env), Authorization attachment (A.3.1), translation of
 * error responses into Problem objects, ETag bookkeeping across polls (A.7),
 * and Idempotency-Key generation (A.6.3). Components call the domain
 * functions below and never call fetch directly.
 */

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  /** RFC 9457 §3.1 style extension: list of invalid fields (400/422). */
  "invalid-params"?: Array<{ name: string; reason: string }>;
}

export class ApiError extends Error {
  status: number;
  problem: Problem;
  /** True when the response had no machine-readable problem body. */
  opaque: boolean;

  constructor(status: number, problem: Problem, opaque = false) {
    super(problem.detail || problem.title || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.opaque = opaque;
  }
}

/* ------------------------------------------------------------------ */
/* Session plumbing (tokens live in localStorage; see stores/session)  */
/* ------------------------------------------------------------------ */

const SESSION_KEY = "ocean.session";

interface StoredSession {
  token?: string;
  refreshToken?: string;
}

function readSession(): StoredSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredSession;
  } catch {
    return {};
  }
}

export function readToken(): string | null {
  return readSession().token ?? null;
}

export function readRefreshToken(): string | null {
  return readSession().refreshToken ?? null;
}

export function writeSession(token: string, refreshToken?: string | null) {
  const prev = readSession();
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token,
      refreshToken: refreshToken ?? prev.refreshToken ?? undefined,
    } satisfies StoredSession),
  );
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  clearEtags();
}

type UnauthorizedHandler = (returnTo: string) => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Called once by the session store; the api layer never imports the store. */
export function registerUnauthorizedHandler(fn: UnauthorizedHandler) {
  onUnauthorized = fn;
}

function env(name: string): string | undefined {
  // Vite build: import.meta.env. Tests/other runtimes: process.env.
  try {
    const vite = (
      import.meta as unknown as { env?: Record<string, string | undefined> }
    ).env?.[name];
    if (vite !== undefined) return vite;
  } catch {
    /* import.meta.env unavailable outside Vite */
  }
  try {
    const node = (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;
    return node?.[name];
  } catch {
    return undefined;
  }
}

function currentReturnTo(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function handleUnauthorized(path: string, problem: Problem): never {
  // A.3.2 (401 row): identity unknown — forget the local session, send the
  // user to sign-in, remembering where they were.
  clearSession();
  onUnauthorized?.(currentReturnTo());
  throw new ApiError(401, problem);
}

/* ------------------------------------------------------------------ */
/* Sign-in against the existing authorisation server (no new endpoint  */
/* on our own service: this talks to the Keycloak token endpoint from  */
/* openapi.yaml via the Resource Owner Password Credentials grant).    */
/* ------------------------------------------------------------------ */

export class AuthError extends Error {
  /** 'invalid_grant' (wrong credentials / dead refresh) or 'unreachable'. */
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

const DOMAIN_SCOPES = [
  "packages:read",
  "packages:write",
  "orders:read",
  "orders:write",
  "orders:fulfil",
  "deliveries:write",
  "payments:read",
  "payments:write",
].join(" ");

function tokenUrl(): string {
  const v = env("VITE_OIDC_TOKEN_URL");
  if (!v)
    throw new AuthError(
      "unreachable",
      "Login server address (VITE_OIDC_TOKEN_URL) is not configured.",
    );
  return v;
}

function clientId(): string {
  // Public client with Direct Access Grants enabled (realm default: test-cli).
  return env("VITE_OIDC_CLIENT_ID") ?? "test-cli";
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

async function tokenRequest(
  params: Record<string, string>,
): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(tokenUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId(), ...params }),
    });
  } catch (err) {
    throw new AuthError(
      "unreachable",
      err instanceof Error
        ? `Cannot reach the login server: ${err.message}`
        : "Cannot reach the login server.",
    );
  }
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    error_description?: string;
  } & Partial<TokenResponse>;
  if (!res.ok || !body.access_token) {
    // Keycloak answers wrong credentials / dead refresh with invalid_grant.
    throw new AuthError(
      body.error ?? `http-${res.status}`,
      body.error_description ?? "Sign-in failed.",
    );
  }
  return body as TokenResponse;
}

/** Username + password sign-in (password grant). Never logs the password. */
export async function passwordGrant(
  username: string,
  password: string,
): Promise<TokenResponse> {
  return tokenRequest({
    grant_type: "password",
    username,
    password,
    scope: `openid ${DOMAIN_SCOPES}`,
  });
}

/** Best-effort IdP sign-out: revoking server-side is the IdP's job. */
export async function idpLogout(): Promise<void> {
  const issuer = env("VITE_OIDC_ISSUER")?.replace(/\/$/, "");
  const refreshToken = readRefreshToken();
  if (!issuer || !refreshToken) return;
  try {
    await fetch(`${issuer}/protocol/openid-connect/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId(),
        refresh_token: refreshToken,
      }),
    });
  } catch {
    // Local session is cleared regardless; server revocation was best-effort.
  }
}

/** Single in-flight refresh shared by concurrent 401s (A.3.3). */
let refreshPromise: Promise<string | null> | null = null;

function silentRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    const rt = readRefreshToken();
    if (!rt) return Promise.resolve(null);
    refreshPromise = tokenRequest({
      grant_type: "refresh_token",
      refresh_token: rt,
    })
      .then((t) => {
        writeSession(t.access_token, t.refresh_token);
        return t.access_token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/* ------------------------------------------------------------------ */
/* ETag bookkeeping — module-level Map outlives every re-render (A.7.2) */
/* ------------------------------------------------------------------ */

const etagCache = new Map<string, string>();

export function etagKey(method: string, url: string): string {
  return `${method.toUpperCase()} ${url}`;
}

export function getCachedEtag(key: string): string | undefined {
  return etagCache.get(key);
}

export function setCachedEtag(key: string, etag: string | null) {
  if (etag) etagCache.set(key, etag);
  else etagCache.delete(key);
}

export function clearEtags() {
  etagCache.clear();
}

/* ------------------------------------------------------------------ */
/* Core request                                                        */
/* ------------------------------------------------------------------ */

function baseUrl(): string {
  // A.2.4 — never hardcode; deployment changes this without a rebuild of logic.
  const v = env("VITE_API_BASE_URL");
  if (!v) throw new Error("VITE_API_BASE_URL is not configured");
  return v.replace(/\/$/, "");
}

function fallbackProblem(status: number, url: string, text: string): Problem {
  return {
    type: "about:blank",
    title: status === 0 ? "Network unreachable" : "Unexpected response",
    status,
    detail: text,
    instance: url,
  };
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Send stored ETag as If-None-Match (conditional read, A.7). */
  conditional?: boolean;
  /** Send stored ETag as If-Match (conditional write, A.8). */
  withPrecondition?: boolean;
  /** Explicit etag override (e.g. the detail view's own etag). */
  etag?: string | null;
  idempotencyKey?: string;
  /** Don't auto-redirect on 401 (used by the sign-in view itself). */
  rawAuth?: boolean;
}

export interface Ok<T> {
  data: T;
  etag: string | null;
  notModified: false;
  fetchedAt: Date;
}

export interface NotModified {
  data: null;
  etag: string | null;
  notModified: true;
  fetchedAt: Date;
}

export type ReadResult<T> = Ok<T> | NotModified;

async function attempt<T>(
  url: string,
  key: string,
  path: string,
  opts: RequestOptions,
  token: string | null,
  stored: string | null | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.conditional && stored) headers["If-None-Match"] = stored;
  if (opts.withPrecondition && stored) headers["If-Match"] = stored;

  const method = (opts.method ?? "GET").toUpperCase();
  try {
    return await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      0,
      fallbackProblem(
        0,
        path,
        err instanceof Error ? err.message : "Network request failed",
      ),
      true,
    );
  }
}

async function requestRaw<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<ReadResult<T>> {
  const url = `${baseUrl()}${path}`;
  const key = etagKey(opts.method ?? "GET", url);
  const stored = opts.etag !== undefined ? opts.etag : getCachedEtag(key);

  let res = await attempt<T>(url, key, path, opts, readToken(), stored);

  // 401 — first try one silent refresh (session expiring while open, A.3.3);
  // only when that fails do we clear the session and go to sign-in (A.3.2).
  if (res.status === 401 && !opts.rawAuth) {
    const renewed = await silentRefresh();
    if (renewed) {
      res = await attempt<T>(url, key, path, opts, renewed, stored);
    }
    if (res.status === 401) {
      handleUnauthorized(path, await readProblem(res, path));
    }
  }

  const etag = res.headers.get("ETag");

  // 304 — successful read with empty body (A.7.3): NOT a failure.
  if (res.status === 304) {
    return {
      data: null,
      etag: stored ?? etag,
      notModified: true,
      fetchedAt: new Date(),
    };
  }

  if (!res.ok) {
    const problem = await readProblem(res, path);
    throw new ApiError(res.status, problem);
  }

  if (etag) setCachedEtag(key, etag);
  const data = (await readJson(res)) as T;
  return { data, etag, notModified: false as const, fetchedAt: new Date() };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readProblem(res: Response, path: string): Promise<Problem> {
  const body = await readJson(res);
  if (
    body &&
    typeof body === "object" &&
    ("title" in body || "detail" in body)
  ) {
    const b = body as Record<string, unknown>;
    return {
      type: typeof b.type === "string" ? b.type : "about:blank",
      title:
        typeof b.title === "string"
          ? b.title
          : `Request failed (${res.status})`,
      status: typeof b.status === "number" ? b.status : res.status,
      detail:
        typeof b.detail === "string"
          ? b.detail
          : "The service refused the request.",
      instance: typeof b.instance === "string" ? b.instance : path,
      ...(Array.isArray(b["invalid-params"])
        ? { "invalid-params": b["invalid-params"] as Problem["invalid-params"] }
        : {}),
    };
  }
  return fallbackProblem(
    res.status,
    path,
    typeof body === "string" && body
      ? body
      : `The service answered ${res.status}.`,
  );
}

/** Convenience for non-conditional calls (forms, actions). */
async function call<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<{ data: T; etag: string | null }> {
  const r = await requestRaw<T>(path, opts);
  return { data: r.data as T, etag: r.etag };
}

/* ------------------------------------------------------------------ */
/* Domain types (mirror openapi.yaml schemas)                          */
/* ------------------------------------------------------------------ */

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
}

export type OrderStatus =
  | "placed"
  | "picked_up"
  | "weighed"
  | "awaiting_payment"
  | "washing"
  | "ready"
  | "delivering"
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  customerId: string;
  courierId: string | null;
  packageId: string;
  pickupAddress: string;
  status: OrderStatus;
  weightGrams: number | null;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Domain functions — the only API components may use                  */
/* ------------------------------------------------------------------ */

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/* -- packages ------------------------------------------------------- */

export function listPackagesConditional() {
  return requestRaw<Package[]>("/packages", { conditional: true });
}

export function getPackageConditional(id: string, etag?: string | null) {
  return requestRaw<Package>(`/packages/${encodeURIComponent(id)}`, {
    conditional: true,
    etag,
  });
}

export function createPackage(input: {
  packageName: string;
  packageDesc: string;
  packagePrice: number;
}) {
  return call<Package>("/packages", { method: "POST", body: input });
}

export function updatePackage(
  id: string,
  input: { packageName?: string; packageDesc?: string; packagePrice?: number },
  etag?: string | null,
) {
  return call<Package>(`/packages/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
    withPrecondition: true,
    etag: etag ?? undefined,
  });
}

export function deletePackage(id: string, etag?: string | null) {
  return call<Package>(`/packages/${encodeURIComponent(id)}`, {
    method: "DELETE",
    withPrecondition: true,
    etag: etag ?? undefined,
  });
}

/* -- orders ---------------------------------------------------------- */

export interface OrderQuery {
  status?: OrderStatus;
  limit?: number;
  cursor?: string;
}

export function listOrdersConditional(q: OrderQuery = {}) {
  const p = new URLSearchParams();
  if (q.status) p.set("status", q.status);
  p.set("limit", String(q.limit ?? 20));
  if (q.cursor) p.set("cursor", q.cursor);
  return requestRaw<Order[]>(`/orders?${p.toString()}`, { conditional: true });
}

export function getOrderConditional(id: string, etag?: string | null) {
  return requestRaw<Order>(`/orders/${encodeURIComponent(id)}`, {
    conditional: true,
    etag,
  });
}

export function createOrder(
  input: { customerId: string; packageId: string; pickupAddress: string },
  idempotencyKey = newIdempotencyKey(),
) {
  return call<Order>("/orders", {
    method: "POST",
    body: input,
    idempotencyKey,
  });
}

function transition(
  id: string,
  segment: string,
  body?: unknown,
  etag?: string | null,
) {
  return call<Order>(`/orders/${encodeURIComponent(id)}/${segment}`, {
    method: "POST",
    body,
    withPrecondition: true,
    etag: etag ?? undefined,
  });
}

export const pickupOrder = (id: string, etag?: string | null) =>
  transition(id, "pickup", {}, etag);
export const weighOrder = (
  id: string,
  weightGrams: number,
  etag?: string | null,
) => transition(id, "weigh", { weightGrams }, etag);
export const washOrder = (id: string, etag?: string | null) =>
  transition(id, "wash", {}, etag);
export const readyOrder = (id: string, etag?: string | null) =>
  transition(id, "ready", {}, etag);
export const deliverOrder = (id: string, etag?: string | null) =>
  transition(id, "delivery", {}, etag);
export const completeOrder = (id: string, etag?: string | null) =>
  transition(id, "complete", {}, etag);
export const cancelOrder = (id: string, etag?: string | null) =>
  transition(id, "cancel", {}, etag);

/* -- payments -------------------------------------------------------- */

export function createPayment(
  input: { orderId: string; amount: number },
  idempotencyKey = newIdempotencyKey(),
) {
  return call<Payment>("/payments", {
    method: "POST",
    body: input,
    idempotencyKey,
  });
}

export function getPaymentConditional(id: string, etag?: string | null) {
  return requestRaw<Payment>(`/payments/${encodeURIComponent(id)}`, {
    conditional: true,
    etag,
  });
}


export const proceedPayment = (id: string, etag?: string | null) =>
  call<Payment>(`/payments/${encodeURIComponent(id)}/proceed`, { method: "POST", withPrecondition: true, etag: etag ?? undefined });
export const cancelPayment = (id: string, etag?: string | null) =>
  call<Payment>(`/payments/${encodeURIComponent(id)}/cancel`, { method: "POST", withPrecondition: true, etag: etag ?? undefined });


/* ------------------------------------------------------------------ */
/* Console-attack surface (A.9): expose the bearer token like the      */
/* KANTIN reference does, so the grader can replay a forbidden op.     */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    __ocean?: { token: () => string | null; apiBase: () => string };
  }
}

if (typeof window !== "undefined") {
  window.__ocean = {
    token: () => readToken(),
    apiBase: () => baseUrl(),
  };
}
