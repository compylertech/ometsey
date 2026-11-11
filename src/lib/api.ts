import { API_BASE_URL, TENANT_ID } from "@/config";
import type { CheckoutRequest, CheckoutResponse, GridResponse, OrderStatusResponse, Quote, QuoteRequest, StorefrontCollection, StorefrontProduct } from "@/lib/storefront-types";

/** The public storefront calls. They need only the tenant header; the backend wraps answers in { success, data }. */
async function request<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/api/v1/storefront${path}`, {
        signal,
        method: body === undefined ? "GET" : "POST",
        headers: { Accept: "application/json", "X-Tenant-Id": TENANT_ID, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    // A non-JSON body (a proxy error page, say) must not surface as a parse error.
    const raw = await response.text();
    let answer: { data?: T; error?: { message?: string } } | null = null;
    try { answer = raw ? JSON.parse(raw) : null; } catch { answer = null; }
    if (!response.ok) throw new Error(answer?.error?.message ?? `Request failed (${response.status})`);
    return (answer && "data" in answer ? answer.data : answer) as T;
}

/**
 * Every live product as a card, priced in one currency. Cached for a minute by the server, so the
 * currency is always sent: it is what keeps the cache key per currency.
 */
export function fetchProductGrid(currency: string, page = 0, signal?: AbortSignal): Promise<GridResponse> {
    return request<GridResponse>(`/products?${new URLSearchParams({ currency, page: String(page), size: "100" })}`, signal);
}

/** One product with its images and variants. A currency it can't be priced in is refused (400). */
export function fetchProductDetail(slug: string, currency: string, signal?: AbortSignal): Promise<StorefrontProduct> {
    return request<StorefrontProduct>(`/products/${encodeURIComponent(slug)}?currency=${encodeURIComponent(currency)}`, signal);
}

/** The collections that have at least one live product, in display order. */
export function fetchCollections(signal?: AbortSignal): Promise<StorefrontCollection[]> {
    return request<StorefrontCollection[]>("/collections", signal);
}

/** What the basket costs, shipping and discount included. Creates nothing, so the totals can never disagree with the charge. */
export function fetchQuote(payload: QuoteRequest, signal?: AbortSignal): Promise<Quote> {
    return request<Quote>("/quote", signal, payload);
}

/** Creates the order and returns the hosted payment page to send the buyer to. */
export function createCheckout(payload: CheckoutRequest): Promise<CheckoutResponse> {
    return request<CheckoutResponse>("/checkout", undefined, payload);
}

export function fetchOrderStatus(reference: string, signal?: AbortSignal): Promise<OrderStatusResponse> {
    return request<OrderStatusResponse>(`/orders/${encodeURIComponent(reference)}`, signal);
}
