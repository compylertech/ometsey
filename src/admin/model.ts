// local imports
import type { AdminOrder, AdminOrdersView } from "./types";

/**
 * What the portal calls an order. The server tracks order and payment status separately;
 * the portal reads them as one lifecycle, the same four stages the build plan describes,
 * plus Refunded because the server has it.
 */
export type OrderStage = "AWAITING_PAYMENT" | "AWAITING_FULFILMENT" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export const STAGES: OrderStage[] = ["AWAITING_PAYMENT", "AWAITING_FULFILMENT", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED"];

export function stageOf(order: AdminOrder): OrderStage {
    switch (order.orderStatus) {
        case "FULFILLING": return "SHIPPED";
        case "COMPLETED": return "COMPLETED";
        case "CANCELLED": return "CANCELLED";
        case "REFUNDED": return "REFUNDED";
        default: return order.paid ? "AWAITING_FULFILMENT" : "AWAITING_PAYMENT";
    }
}

/** Newest first, whichever of the server's three buckets an order came from. */
export function flattenOrders(view: AdminOrdersView | null): AdminOrder[] {
    if (!view) return [];
    const seen = new Set<string>();
    const all: AdminOrder[] = [];
    for (const o of [...view.awaitingFulfilment, ...(view.shipped ?? []), ...view.awaitingPayment, ...view.closed]) {
        if (seen.has(o.orderNumber)) continue;
        seen.add(o.orderNumber);
        all.push(o);
    }
    return all.sort((a, b) => (b.placedAt ?? "").localeCompare(a.placedAt ?? ""));
}

/** A paid order that still counts towards revenue. */
export const earns = (o: AdminOrder) => o.paid && o.orderStatus !== "CANCELLED" && o.orderStatus !== "REFUNDED";

/** The server says "storefront" for website orders; an older server says nothing, which means the same. */
export const sourceOf = (o: AdminOrder) => o.source ?? "storefront";

export const SOURCE_LABEL: Record<string, string> = {
    storefront: "Website", whatsapp: "WhatsApp", in_store: "In store", phone: "Phone", other: "Other",
};
export const sourceLabel = (o: AdminOrder) => SOURCE_LABEL[sourceOf(o)] ?? sourceOf(o);

export const placedTime = (o: { placedAt: string | null }) => (o.placedAt ? new Date(o.placedAt).getTime() : 0);

export function csvOf(rows: AdminOrder[]): string {
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["order", "placed", "stage", "customer", "email", "currency", "subtotal", "discount", "shipping", "total", "payment", "source", "country", "tracking", "items"];
    const lines = rows.map((o) => [
        o.orderNumber, o.placedAt, stageOf(o), o.customerName, o.customerEmail, o.currency,
        o.subtotal, o.discountTotal ?? 0, o.shippingTotal, o.grandTotal, o.paymentStatus, sourceOf(o), o.shipToCountry, o.trackingNumber,
        o.items.map((i) => `${i.name ?? i.sku} x${i.quantity}`).join("; "),
    ].map(cell).join(","));
    return [head.join(","), ...lines].join("\n");
}

export const ADMIN = "/admin";
