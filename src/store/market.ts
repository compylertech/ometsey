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

/** Everything a component needs to show prices: the active currency and formatters for it. */
export function useMoney() {
    const chosen = useMarket((s) => s.chosen);
    const rate = useMarket((s) => s.rate);
    const country = useMemo(() => detectCountry(), []);
    const detected = currencyForCountry(country);
    const currency = chosen ?? detected;

    return useMemo(() => ({
        currency, detected, country, rate,
        /** A product's price as a number in the active currency. */
        priceOf: (p: Pick<Product, "price" | "prices">) => priceFor(p, currency, rate),
        /** A product's price, formatted. */
        fmtProduct: (p: Pick<Product, "price" | "prices">) => formatMoney(priceFor(p, currency, rate), currency),
        /** An amount already in the active currency, formatted. */
        fmt: (amount: number) => formatMoney(amount, currency),
    }), [currency, detected, country, rate, chosen]);
}
