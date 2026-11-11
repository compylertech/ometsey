import type { Product } from "@/data/catalog"

export type Currency = "GHS" | "USD";

export const CURRENCIES: Record<Currency, { name: string; symbol: string; label: string }> = {
    GHS: { name: "Ghana Cedi", symbol: "₵", label: "Ghana Cedi (GHS ₵)" },
    USD: { name: "US Dollar", symbol: "$", label: "US Dollar (USD $)" },
};

/** Cedis per US dollar. A placeholder until the real rate is set in the admin's Settings. */
export const DEFAULT_RATE = 12;

/** Which currency a country sees. Ghana pays in cedis; everywhere else in dollars. */
export const currencyForCountry = (country?: string): Currency => (country === "GH" ? "GHS" : "USD");

/** "₵ 1,500.00" for cedis, "$125.00" for dollars. */
export function formatMoney(amount: number, currency: Currency): string {
    const n = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency === "GHS" ? `₵ ${n}` : `$${n}`;
}

/**
 * A product's price in a currency. Cedis are the base price. Dollars use the price set for them on the
 * product, otherwise the cedi price converted at the current rate and rounded to a whole dollar.
 */
export function priceFor(product: Pick<Product, "price" | "prices">, currency: Currency, rate: number): number {
    if (currency === "GHS") return product.price;
    return product.prices?.USD ?? Math.max(1, Math.round(product.price / rate));
}
