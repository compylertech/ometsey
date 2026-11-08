import { useMemo } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { BASE_PRODUCTS, type Product } from "@/data/catalog"

/**
 * Admin changes to the catalog, kept as an overlay on the products in code: added, edited and removed
 * products. Code stays the source of truth for everything the admin hasn't touched, so products added to
 * catalog.ts later still appear. Like the rest of the admin data, this lives in this browser only.
 */
interface Overlay {
    added: Product[];
    edited: Record<string, Partial<Product>>;
    removed: string[];
}

interface CatalogState extends Overlay {
    addProduct: (p: Product) => void;
    updateProduct: (handle: string, patch: Partial<Product>) => void;
    removeProduct: (handle: string) => void;
    restoreProduct: (handle: string) => void;
    reset: () => void;
}

const BASE_HANDLES = new Set(BASE_PRODUCTS.map((p) => p.handle));
export const isBaseProduct = (handle: string) => BASE_HANDLES.has(handle);

export const useCatalog = create<CatalogState>()(persist((set) => ({
    added: [],
    edited: {},
    removed: [],
    addProduct: (p) => set((s) => ({ added: [...s.added, p] })),
    updateProduct: (handle, patch) => set((s) => (BASE_HANDLES.has(handle)
        ? { edited: { ...s.edited, [handle]: { ...s.edited[handle], ...patch } } }
        : { added: s.added.map((p) => (p.handle === handle ? { ...p, ...patch } : p)) })),
    removeProduct: (handle) => set((s) => (BASE_HANDLES.has(handle)
        ? { removed: s.removed.includes(handle) ? s.removed : [...s.removed, handle] }
        : { added: s.added.filter((p) => p.handle !== handle) })),
    restoreProduct: (handle) => set((s) => ({ removed: s.removed.filter((h) => h !== handle) })),
    reset: () => set({ added: [], edited: {}, removed: [] }),
}), { name: "ometsey-catalog" }));

interface Options {
    /** Include products hidden from the storefront (the admin needs them). */
    includeHidden?: boolean;
    /** Include products removed from the catalog, so the admin can restore them. */
    includeRemoved?: boolean;
}

export function resolveProducts(o: Overlay, { includeHidden, includeRemoved }: Options = {}): Product[] {
    const base = BASE_PRODUCTS
        .filter((p) => includeRemoved || !o.removed.includes(p.handle))
        .map((p) => ({ ...p, ...o.edited[p.handle] }));
    const all = [...base, ...o.added];
    return includeHidden ? all : all.filter((p) => !p.hidden);
}

/** The live catalog. The storefront calls it bare; the admin passes the options it needs. */
export function useProducts({ includeHidden = false, includeRemoved = false }: Options = {}): Product[] {
    const added = useCatalog((s) => s.added);
    const edited = useCatalog((s) => s.edited);
    const removed = useCatalog((s) => s.removed);
    return useMemo(() => resolveProducts({ added, edited, removed }, { includeHidden, includeRemoved }), [added, edited, removed, includeHidden, includeRemoved]);
}
