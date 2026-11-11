import { API_BASE_URL, BRAND } from "./brand";
import type { Quote, QuoteRequest, StorefrontProduct } from "@/lib/storefront-types";

/**
 * Currency formatting. Falls back to a plain code-prefixed amount if the runtime rejects the
 * currency, so a misconfigured currency never blanks out a price.
 */
export function formatMoney(amount: number | null | undefined, currency: string): string {
    if (amount === null || amount === undefined || Number.isNaN(amount)) return "";
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

/** The public (tenant-only) storefront calls the manual-order form needs. */
async function storefront<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/api/v1/storefront${path}`, {
        ...init,
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-Tenant-Id": BRAND.tenantId },
    });
    const raw = await response.text();
    let body: { success?: boolean; data?: T; error?: { message?: string } } | null = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
    if (!response.ok) throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
    return (body && "data" in body ? body.data : body) as T;
}

export function fetchProduct(slug: string, currency?: string): Promise<StorefrontProduct> {
    return storefront<StorefrontProduct>(`/products/${encodeURIComponent(slug)}${currency ? `?currency=${encodeURIComponent(currency)}` : ""}`);
}

/** Asks the server what the basket actually costs. Creates nothing. */
export function fetchQuote(payload: QuoteRequest): Promise<Quote> {
    return storefront<Quote>("/quote", { method: "POST", body: JSON.stringify(payload) });
}
