import { useMemo } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product } from "@/data/catalog"
import { detectCountry } from "@/lib/geo"
import { DEFAULT_RATE, currencyForCountry, formatMoney, priceFor, type Currency } from "@/lib/money"

interface MarketState {
    /** What the visitor picked in the selector. null until they pick, so the detected currency applies. */
    chosen: Currency | null;
    /** Cedis per dollar, used to convert products that have no dollar price of their own. */
    rate: number;
    setCurrency: (c: Currency | null) => void;
    setRate: (r: number) => void;
}

export const useMarket = create<MarketState>()(persist((set) => ({
    chosen: null,
    rate: DEFAULT_RATE,
    setCurrency: (chosen) => set({ chosen }),
    setRate: (rate) => set({ rate }),
}), { name: "ometsey-market" }));

type PricedProduct = Pick<Product, "price" | "prices" | "currency">;
const asCurrency = (c: string): Currency => (c === "USD" ? "USD" : "GHS");

/** Everything a component needs to show prices: the active currency and formatters for it. */
export function useMoney() {
    const chosen = useMarket((s) => s.chosen);
    const rate = useMarket((s) => s.rate);
    const country = useMemo(() => detectCountry(), []);
    const detected = currencyForCountry(country);
    const currency = chosen ?? detected;

    return useMemo(() => ({
        currency, detected, country, rate,
        /** A product's price as a number. A product from the backend is already priced in its own currency. */
        priceOf: (p: PricedProduct) => (p.currency ? p.price : priceFor(p, currency, rate)),
        /** A product's price, formatted in whatever currency it is actually priced in. */
        fmtProduct: (p: PricedProduct) => (p.currency ? formatMoney(p.price, asCurrency(p.currency)) : formatMoney(priceFor(p, currency, rate), currency)),
        /** An amount formatted in the active currency, or in `as` when the amounts came from products priced in another. */
        fmt: (amount: number, as?: string) => formatMoney(amount, as ? asCurrency(as) : currency),
    }), [currency, detected, country, rate, chosen]);
}
