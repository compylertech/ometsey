import { useMemo } from "react"
import { create } from "zustand"
import { BASE_PRODUCTS, type Product } from "@/data/catalog"
import { fetchCollections, fetchProductGrid } from "@/lib/api"
import type { GridItem, StorefrontCollection } from "@/lib/storefront-types"

/**
 * The storefront's catalog, read from the backend: live products as cards, priced in one currency.
 * If the backend can't be reached the site falls back to the products in code, so it never goes
 * blank; an empty answer is trusted, because it means nothing is switched on yet.
 */
type Status = "idle" | "loading" | "ready" | "offline";

interface ShopState {
    status: Status;
    /** The currency the loaded prices are in. */
    currency: string | null;
    products: Product[];
    /** Collections with live products. null until loaded, or when the backend can't be reached. */
    collections: StorefrontCollection[] | null;
    loadCollections: () => Promise<void>;
    load: (currency: string) => Promise<void>;
}

/** The backend's card, in the shape the pages already use. `price` is in `currency`, so no conversion is needed. */
export function toProduct(item: GridItem): Product {
    const slugs = item.categories.map((c) => c.slug);
    const tags = item.tags.map((t) => t.toLowerCase());
    return {
        handle: item.slug,
        title: item.name,
        price: item.price ?? 0,
        currency: item.currency,
        category: slugs[0] ?? "",
        collections: slugs,
        // "New" is the tag behind the New In page, whose handle the menu already uses.
        tags: tags.includes("new") ? [...tags, "new-in"] : tags,
        images: item.primaryImage ? [item.primaryImage] : [],
        sizes: item.sizes,
        description: "",
    };
}

let inFlight = 0;

export const useShop = create<ShopState>()((set) => ({
    status: "idle",
    currency: null,
    products: [],
    collections: null,
    loadCollections: async () => {
        try { set({ collections: await fetchCollections() }); } catch { /* the menu keeps its built-in list */ }
    },
    load: async (currency) => {
        const run = ++inFlight;
        set((s) => ({ status: s.status === "ready" ? "ready" : "loading" }));
        try {
            const items: GridItem[] = [];
            for (let page = 0; ; page++) {
                const grid = await fetchProductGrid(currency, page);
                items.push(...grid.items);
                if (items.length >= grid.total || !grid.items.length) break;
            }
            // A newer request (the visitor switched currency again) wins.
            if (run === inFlight) set({ status: "ready", currency, products: items.map(toProduct) });
        } catch {
            if (run === inFlight) set((s) => (s.status === "ready" ? s : { status: "offline", products: BASE_PRODUCTS }));
        }
    },
}));

/** The live catalog. Stays on the last good list while a new currency loads. */
export function useProducts(): Product[] {
    return useShop((s) => s.products);
}

export const useShopStatus = () => useShop((s) => s.status);

/** Products ready for a facet that needs the unique sizes, without re-deriving them every render. */
export function useSizes(): string[] {
    const products = useProducts();
    return useMemo(() => [...new Set(products.flatMap((p) => p.sizes ?? []))], [products]);
}
