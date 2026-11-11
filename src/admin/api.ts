// local imports
import type {
    AdminDiscountLink,
    AdminOrder,
    AdminOrdersView,
    AdminProductSummary,
    AdminSession,
    CreateDiscountLinkRequest,
    CreateOrderRequest,
    CreateOrderResult,
    CreateProductRequest,
    CreateProductVariant,
    ExchangeRate,
    AdminCustomer,
    AdminCustomerDetail,
    UpdateVariantRequest,
    SetExchangeRateRequest,
    MarkPaidRequest,
    ProductAttributes,
    ProductDetail,
    ProductPriceChange,
    ProductVariant,
    UpdateProductContent,
    UploadedImage,
    ShipOrderRequest,
} from "./types";

import { API_BASE_URL, BRAND } from "./brand";

export { API_BASE_URL };
export const TENANT_ID = BRAND.tenantId;

const SESSION_KEY = "ometsey-admin-session";

/** The token lives in sessionStorage so it is gone when the tab closes. */
export function loadSession(): AdminSession | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as AdminSession) : null;
    } catch {
        return null;
    }
}

export function saveSession(session: AdminSession) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
        /* a blocked sessionStorage only costs the admin a re-login */
    }
}

export function clearSession() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch {
        /* ignore */
    }
}

function unwrap<T>(body: unknown): T {
    if (body && typeof body === "object" && "data" in body && "success" in body) {
        return (body as { data: T }).data;
    }
    return body as T;
}

function errorMessage(body: unknown, status: number): string {
    if (body && typeof body === "object") {
        const error = (body as { error?: { message?: string } }).error;
        if (error?.message) return error.message;
        const details = (body as { error?: { details?: Record<string, string> } }).error?.details;
        if (details) return Object.values(details).join(", ");
        const message = (body as { message?: string }).message;
        if (message) return message;
    }
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "This account is not an administrator.";
    return `Request failed (${status})`;
}

/** Thrown when the server rejects the token, so the UI can drop back to the login screen. */
export class UnauthorizedError extends Error {}

/** A non-401 error response, keeping the status so callers can tell "bad request" from "server hiccup". */
export class HttpError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

async function request<T>(path: string, init: RequestInit, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            Accept: "application/json",
            // A file upload sets its own multipart boundary; forcing JSON here would break it.
            ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            "X-Tenant-Id": TENANT_ID,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init.headers,
        },
    });

    const raw = await response.text();
    let body: unknown = null;
    if (raw) {
        try {
            body = JSON.parse(raw);
        } catch {
            body = null;
        }
    }

    if (!response.ok) {
        if (response.status === 401) throw new UnauthorizedError(errorMessage(body, 401));
        throw new HttpError(errorMessage(body, response.status), response.status);
    }

    return unwrap<T>(body);
}

interface LoginResponse {
    accessToken: string;
    user?: { email?: string; firstName?: string; lastName?: string };
}

export async function login(email: string, password: string): Promise<AdminSession> {
    const result = await request<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    return {
        token: result.accessToken,
        email: result.user?.email ?? email,
        name: [result.user?.firstName, result.user?.lastName].filter(Boolean).join(" ") || email,
    };
}

export function fetchOrders(token: string, limit = 100): Promise<AdminOrdersView> {
    return request<AdminOrdersView>(`/api/v1/admin/storefront/orders?limit=${limit}`, { method: "GET" }, token);
}

/**
 * The dashboard, customer and product figures are computed from this list, so it asks for as
 * many orders as the server will give. If the server rejects that `limit` (a 400), fall back to
 * the 100 the portal always used; the Overview then says the figures cover recent orders only.
 * Other failures are not a limit problem, so they propagate to the retry in `withRetry`.
 */
export async function fetchAllOrders(token: string): Promise<AdminOrdersView> {
    try {
        return await fetchOrders(token, 500);
    } catch (err) {
        if (err instanceof HttpError && err.status === 400) return fetchOrders(token, 100);
        throw err;
    }
}

const RETRY_DELAYS_MS = [4000, 8000];

/**
 * The backend's first requests for a tenant can fail with a 500 (or a dropped connection) while
 * its database pool warms up. Retry those reads a couple of times; a 401 or any other 4xx is a
 * real answer and is never retried.
 */
export async function withRetry<T>(run: () => Promise<T>, onRetry: (attempt: number) => void, live: () => boolean): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await run();
        } catch (err) {
            const definite = err instanceof UnauthorizedError || (err instanceof HttpError && err.status < 500);
            if (definite || attempt >= RETRY_DELAYS_MS.length || !live()) throw err;
            onRetry(attempt + 1);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
            if (!live()) throw err;
        }
    }
}

const DISCOUNT_BASE = "/api/v1/admin/storefront";

/** Hidden products (drafts, archived) are asked for too, or one could never be shown again. */
export function fetchAdminProducts(token: string): Promise<AdminProductSummary[]> {
    return request<AdminProductSummary[]>(`${DISCOUNT_BASE}/products?includeHidden=true`, { method: "GET" }, token);
}

// Product changes are never retried: like the order actions, a repeat after a timeout could act twice.

const productPath = (id: string, action: string) => `${DISCOUNT_BASE}/products/${encodeURIComponent(id)}/${action}`;

export function setProductVisible(token: string, id: string, visible: boolean): Promise<AdminProductSummary> {
    return request<AdminProductSummary>(productPath(id, "visibility"), { method: "PATCH", body: JSON.stringify({ visible }) }, token);
}

export function archiveProduct(token: string, id: string): Promise<AdminProductSummary> {
    return request<AdminProductSummary>(productPath(id, "archive"), { method: "POST" }, token);
}

export function updateProductPrices(token: string, id: string, prices: ProductPriceChange[]): Promise<AdminProductSummary> {
    return request<AdminProductSummary>(productPath(id, "prices"), { method: "PUT", body: JSON.stringify({ prices }) }, token);
}

export function updateVariant(token: string, id: string, patch: UpdateVariantRequest): Promise<unknown> {
    return request<unknown>(`${CATALOG_BASE}/variants/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) }, token);
}

/** `search` matches name, email, phone and billing account number; newest buyer first. */
export function fetchCustomers(token: string, search = "", limit = 500): Promise<AdminCustomer[]> {
    const query = new URLSearchParams({ limit: String(limit), ...(search.trim() ? { search: search.trim() } : {}) });
    return request<AdminCustomer[]>(`${DISCOUNT_BASE}/customers?${query}`, { method: "GET" }, token);
}

export function fetchCustomer(token: string, clientId: string): Promise<AdminCustomerDetail> {
    return request<AdminCustomerDetail>(`${DISCOUNT_BASE}/customers/${encodeURIComponent(clientId)}`, { method: "GET" }, token);
}

export function fetchExchangeRates(token: string, includeHistory = false): Promise<ExchangeRate[]> {
    return request<ExchangeRate[]>(`${DISCOUNT_BASE}/exchange-rates${includeHistory ? "?includeHistory=true" : ""}`, { method: "GET" }, token);
}

export function setExchangeRate(token: string, payload: SetExchangeRateRequest): Promise<ExchangeRate> {
    return request<ExchangeRate>(`${DISCOUNT_BASE}/exchange-rates`, { method: "PUT", body: JSON.stringify(payload) }, token);
}

export function createProduct(token: string, payload: CreateProductRequest): Promise<AdminProductSummary> {
    return request<AdminProductSummary>(`${DISCOUNT_BASE}/products`, { method: "POST", body: JSON.stringify(payload) }, token);
}

export function addProductVariants(token: string, productId: string, variants: CreateProductVariant[]): Promise<AdminProductSummary> {
    return request<AdminProductSummary>(productPath(productId, "variants"), { method: "POST", body: JSON.stringify({ variants }) }, token);
}

export function fetchDiscountLinks(token: string): Promise<AdminDiscountLink[]> {
    return request<AdminDiscountLink[]>(`${DISCOUNT_BASE}/discount-links`, { method: "GET" }, token);
}

export function createDiscountLink(
    token: string,
    payload: CreateDiscountLinkRequest
): Promise<AdminDiscountLink> {
    return request<AdminDiscountLink>(
        `${DISCOUNT_BASE}/discount-links`,
        { method: "POST", body: JSON.stringify(payload) },
        token
    );
}

export function setDiscountLinkActive(
    token: string,
    id: string,
    active: boolean
): Promise<AdminDiscountLink> {
    return request<AdminDiscountLink>(
        `${DISCOUNT_BASE}/discount-links/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify({ active }) },
        token
    );
}

// ---------- order actions ----------
// These change real orders (and, for a paid cancel, real money), so unlike the reads above they
// are never retried: a repeat after a timeout could act twice.

const ORDER_BASE = "/api/v1/admin/storefront/orders";
const orderPath = (orderNumber: string, action: string) => `${ORDER_BASE}/${encodeURIComponent(orderNumber)}/${action}`;

export function shipOrder(token: string, orderNumber: string, payload: ShipOrderRequest): Promise<AdminOrder> {
    return request<AdminOrder>(orderPath(orderNumber, "ship"), { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export function cancelOrder(token: string, orderNumber: string, reason?: string): Promise<AdminOrder> {
    return request<AdminOrder>(orderPath(orderNumber, "cancel"), { method: "POST", body: JSON.stringify(reason ? { reason } : {}) }, token);
}

export function markOrderPaid(token: string, orderNumber: string, payload: MarkPaidRequest): Promise<AdminOrder> {
    return request<AdminOrder>(orderPath(orderNumber, "mark-paid"), { method: "POST", body: JSON.stringify(payload) }, token);
}

export function deliverOrder(token: string, orderNumber: string): Promise<AdminOrder> {
    return request<AdminOrder>(orderPath(orderNumber, "deliver"), { method: "POST" }, token);
}

export function createManualOrder(token: string, payload: CreateOrderRequest): Promise<CreateOrderResult> {
    return request<CreateOrderResult>(ORDER_BASE, { method: "POST", body: JSON.stringify(payload) }, token);
}

// ---------- product content and images ----------

const CATALOG_BASE = "/api/v1/catalog";

export function fetchProductDetail(token: string, id: string): Promise<ProductDetail> {
    return request<ProductDetail>(`${CATALOG_BASE}/products/${encodeURIComponent(id)}`, { method: "GET" }, token);
}

/** The variants come back as a plain array; a paged envelope is tolerated in case that changes. */
export async function fetchProductVariants(token: string, id: string): Promise<ProductVariant[]> {
    const result = await request<ProductVariant[] | { content: ProductVariant[] }>(`${CATALOG_BASE}/variants/by-product/${encodeURIComponent(id)}`, { method: "GET" }, token);
    return Array.isArray(result) ? result : result.content;
}

/** Text and storefront content only. Status, price and slug have their own endpoints, or none. */
export function updateProductContent(token: string, id: string, patch: UpdateProductContent): Promise<ProductDetail> {
    return request<ProductDetail>(`${CATALOG_BASE}/products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) }, token);
}

export type { ProductAttributes };

export function uploadImage(token: string, file: File): Promise<UploadedImage> {
    const form = new FormData();
    form.append("file", file);
    form.append("publicAccess", "true");
    return request<UploadedImage>("/api/v1/media/upload", { method: "POST", body: form }, token);
}
