// global imports
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

// local imports
import { fetchAdminProducts, fetchAllOrders, fetchDiscountLinks, UnauthorizedError, withRetry } from "./api";
import { flattenOrders } from "./model";
import type { AdminDiscountLink, AdminOrder, AdminOrdersView, AdminProductSummary } from "./types";

interface Slice<T> {
    data: T;
    error: string | null;
}

interface AdminData {
    token: string;
    /** Call when any request returns 401: drops back to the login screen. */
    unauthorized: () => void;
    orders: AdminOrder[];
    view: AdminOrdersView | null;
    /** True when the server holds more orders than it returned, so every total is partial. */
    truncated: boolean;
    /** Every product, hidden ones included. */
    products: AdminProductSummary[];
    /** Only what is on sale now: what a discount link or a manual order can use. */
    liveProducts: AdminProductSummary[];
    /** Swap in the server's updated copy of one product, or add a new one. */
    upsertProduct: (product: AdminProductSummary) => void;
    /** Re-read the product list alone, quietly: the server's copy is the one that is complete. */
    reloadProducts: () => Promise<void>;
    links: AdminDiscountLink[];
    setLinks: (update: (current: AdminDiscountLink[]) => AdminDiscountLink[]) => void;
    /** Swap in the server's updated copy of one order after an action, wherever it sits. */
    updateOrder: (order: AdminOrder) => void;
    errors: { orders: string | null; products: string | null; links: string | null };
    loading: boolean;
    /** Retry number while the first requests are being retried (the backend is still warming up), else 0. */
    retrying: number;
    loadedAt: number | null;
    refresh: () => void;
}

const Ctx = createContext<AdminData | null>(null);

export function useAdminData(): AdminData {
    const value = useContext(Ctx);
    if (!value) throw new Error("useAdminData must be used inside <AdminDataProvider>");
    return value;
}

const message = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

/**
 * The portal's one read path, the equivalent of the build plan's store.ts: every page reads
 * orders, products and discount links from here, so swapping or caching the API is a change to
 * this file and api.ts only. The three requests are independent, so one failing (say, products)
 * leaves the other pages working.
 */
export function AdminDataProvider({ token, onUnauthorized, children }: { token: string; onUnauthorized: () => void; children: ReactNode }) {
    const [view, setView] = useState<Slice<AdminOrdersView | null>>({ data: null, error: null });
    const [products, setProducts] = useState<Slice<AdminProductSummary[]>>({ data: [], error: null });
    const [links, setLinksState] = useState<Slice<AdminDiscountLink[]>>({ data: [], error: null });
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(0);
    const [loadedAt, setLoadedAt] = useState<number | null>(null);
    const [tick, setTick] = useState(0);
    const unauthorized = useRef(onUnauthorized);
    unauthorized.current = onUnauthorized;

    useEffect(() => {
        let live = true;
        setLoading(true);
        setRetrying(0);
        const isLive = () => live;
        const onRetry = (n: number) => { if (live) setRetrying((cur) => Math.max(cur, n)); };
        const read = <T,>(run: () => Promise<T>) => withRetry(run, onRetry, isLive);
        Promise.allSettled([read(() => fetchAllOrders(token)), read(() => fetchAdminProducts(token)), read(() => fetchDiscountLinks(token))]).then(([o, p, l]) => {
            if (!live) return;
            setRetrying(0);
            if ([o, p, l].some((r) => r.status === "rejected" && r.reason instanceof UnauthorizedError)) {
                unauthorized.current();
                return;
            }
            // A failed refresh keeps the last good data and shows the error beside it.
            setView((cur) => o.status === "fulfilled" ? { data: o.value, error: null } : { data: cur.data, error: message(o.reason) });
            setProducts((cur) => p.status === "fulfilled" ? { data: p.value, error: null } : { data: cur.data, error: message(p.reason) });
            setLinksState((cur) => l.status === "fulfilled" ? { data: l.value, error: null } : { data: cur.data, error: message(l.reason) });
            setLoadedAt(Date.now());
            setLoading(false);
        });
        return () => { live = false; };
    }, [token, tick]);

    const refresh = useCallback(() => setTick((n) => n + 1), []);
    const setLinks = useCallback((update: (c: AdminDiscountLink[]) => AdminDiscountLink[]) => setLinksState((s) => ({ ...s, data: update(s.data) })), []);
    const updateOrder = useCallback((order: AdminOrder) => {
        const swap = (list: AdminOrder[]) => list.map((o) => (o.orderNumber === order.orderNumber ? order : o));
        setView((cur) => cur.data
            ? { ...cur, data: { ...cur.data, awaitingFulfilment: swap(cur.data.awaitingFulfilment), shipped: swap(cur.data.shipped ?? []), awaitingPayment: swap(cur.data.awaitingPayment), closed: swap(cur.data.closed) } }
            : cur);
    }, []);
    const upsertProduct = useCallback((product: AdminProductSummary) => {
        setProducts((s) => ({
            ...s,
            data: s.data.some((p) => p.id === product.id) ? s.data.map((p) => (p.id === product.id ? product : p)) : [...s.data, product],
        }));
    }, []);
    const reloadProducts = useCallback(async () => {
        try {
            const next = await fetchAdminProducts(token);
            setProducts({ data: next, error: null });
        } catch (err) {
            if (err instanceof UnauthorizedError) unauthorized.current();
            // Any other failure keeps what is on screen.
        }
    }, [token]);
    const liveProducts = useMemo(() => products.data.filter((p) => p.visible !== false), [products.data]);
    const orders = useMemo(() => flattenOrders(view.data), [view.data]);

    const value = useMemo<AdminData>(() => {
        const v = view.data;
        const expected = v ? v.awaitingFulfilmentCount + (v.shippedCount ?? 0) + v.awaitingPaymentCount + v.closedCount : 0;
        return {
            token, unauthorized: onUnauthorized,
            orders, view: v, truncated: v ? expected > orders.length : false,
            products: products.data, liveProducts, upsertProduct, reloadProducts, links: links.data, setLinks, updateOrder,
            errors: { orders: view.error, products: products.error, links: links.error },
            loading, retrying, loadedAt, refresh,
        };
    }, [token, onUnauthorized, orders, view, products, liveProducts, upsertProduct, reloadProducts, links, setLinks, updateOrder, loading, retrying, loadedAt, refresh]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
