import { BASE_PRODUCTS, SIZES } from "@/data/catalog"
import type { DiscountLink, Order, OrderSource, OrderStatus } from "./types"

/** Small seeded RNG so the sample data is the same every time it is loaded. */
function rng(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const SOURCES: OrderSource[] = ["website", "website", "website", "whatsapp", "in-store", "bespoke"];

/** Demo orders and discounts, clearly marked `sample` so they never mix with real records. */
export function sampleData(startNumber: number): { orders: Order[]; discounts: DiscountLink[] } {
    const r = rng(2026);
    const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
    const day = 86_400_000;
    const now = Date.now();
    const orders: Order[] = [];

    for (let i = 0; i < 36; i++) {
        const placed = new Date(now - Math.floor(r() * 60) * day - Math.floor(r() * day));
        const items = Array.from({ length: 1 + Math.floor(r() * 2) }, () => {
            const p = pick(BASE_PRODUCTS);
            return { handle: p.handle, title: p.title, size: pick(SIZES), qty: 1 + (r() < 0.2 ? 1 : 0), price: p.price };
        });
        const age = (now - placed.getTime()) / day;
        const status: OrderStatus = r() < 0.05 ? "CANCELLED"
            : age < 4 && r() < 0.6 ? "AWAITING_PAYMENT"
            : age < 12 ? "AWAITING_FULFILMENT" : "COMPLETED";
        const paid = status === "AWAITING_FULFILMENT" || status === "COMPLETED";
        const subtotal = items.reduce((n, it) => n + it.price * it.qty, 0);
        const discount = r() < 0.15 ? Math.round(subtotal * 0.1) : 0;
        orders.push({
            id: `sample-order-${i}`,
            number: `OM-${startNumber + i}`,
            placedAt: placed.toISOString(),
            status,
            source: pick(SOURCES),
            customer: { name: `Sample Customer ${1 + (i % 22)}`, email: `sample${1 + (i % 22)}@example.com`, phone: "+233 00 000 0000" },
            shipTo: "Sample address, Accra, Ghana",
            items,
            shipping: r() < 0.5 ? 0 : 80,
            discount,
            discountCode: discount ? "SAMPLE10" : undefined,
            paidAt: paid ? new Date(placed.getTime() + day / 4).toISOString() : undefined,
            trackingNumber: status === "COMPLETED" ? `SAMPLE${100000 + i}` : undefined,
            sample: true,
        });
    }
    orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt));

    const discounts: DiscountLink[] = [
        { id: "sample-discount-1", code: "SAMPLE10", type: "PERCENTAGE", value: 10, scope: "ALL", note: "Sample: newsletter offer", active: true, createdAt: new Date(now - 30 * day).toISOString(), sample: true },
        { id: "sample-discount-2", code: "SAMPLE100", type: "FIXED_AMOUNT", value: 100, scope: "ALL", note: "Sample: VIP thank-you", active: false, createdAt: new Date(now - 45 * day).toISOString(), sample: true },
    ];
    return { orders, discounts };
}
