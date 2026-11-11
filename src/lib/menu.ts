import { useMemo } from "react"
import { CATEGORIES, COLLECTION_TITLES, NAV, type NavLink } from "@/data/catalog"
import { useShop } from "@/store/shop"
import type { StorefrontCollection } from "@/lib/storefront-types"

export interface MenuLink extends NavLink {
    /** A product type with nothing live yet: shown, but not a link. */
    soon?: boolean;
}

/**
 * The backend holds collections and product types as one flat list. The grouping is the site's own:
 * the slugs in CATEGORIES are product types (the pills), and everything else the backend returns is a
 * named collection. Names, order and what is live come from the backend, so nothing is hardcoded twice.
 */
const TYPE_SLUGS = new Set(CATEGORIES.map((c) => c.to.split("/").pop()));
const slugOf = (l: NavLink) => l.to.split("/").pop() ?? "";

export interface Menu {
    collections: NavLink[];
    categories: MenuLink[];
    titles: Record<string, string>;
}

export function buildMenu(live: StorefrontCollection[] | null): Menu {
    // Until the backend answers (or when it can't), the lists in code stand in.
    if (!live) return { collections: NAV.find((n) => n.label === "Collections")?.links ?? [], categories: CATEGORIES, titles: COLLECTION_TITLES };
    const bySlug = new Map(live.map((c) => [c.slug, c]));
    return {
        collections: live
            .filter((c) => !TYPE_SLUGS.has(c.slug))
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => ({ label: c.name, to: `/collections/${c.slug}` })),
        categories: CATEGORIES.map((c) => {
            const hit = bySlug.get(slugOf(c));
            return hit ? { label: hit.name, to: c.to } : { ...c, soon: true };
        }),
        titles: { ...COLLECTION_TITLES, ...Object.fromEntries(live.map((c) => [c.slug, c.name])) },
    };
}

export function useMenu(): Menu {
    const live = useShop((s) => s.collections);
    return useMemo(() => buildMenu(live), [live]);
}
