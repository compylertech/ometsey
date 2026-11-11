import { STORE, money } from "@/data/catalog"
import type { Order } from "./types"

export const MERGE_TAGS = ["first_name", "name", "order_number", "total", "tracking_number", "discount_code", "discount_link", "store_phone"] as const;

export const orderSubtotal = (o: Pick<Order, "items">) => o.items.reduce((n, i) => n + i.price * i.qty, 0);
export const orderTotal = (o: Pick<Order, "items" | "discount" | "shipping">) => Math.max(0, orderSubtotal(o) - o.discount) + o.shipping;

/** Values for the {{merge}} tags. Tags with no value render as empty rather than as raw braces. */
export function mergeVars(order?: Order, extra: Record<string, string> = {}): Record<string, string> {
    const name = order?.customer.name ?? extra.name ?? "";
    return {
        name,
        first_name: name.split(" ")[0] ?? "",
        order_number: order?.number ?? "",
        total: order ? money(orderTotal(order)) : "",
        tracking_number: order?.trackingNumber ?? "",
        discount_code: "",
        discount_link: "",
        store_phone: STORE.phone,
        ...extra,
    };
}

export function fill(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text to a simple branded HTML email: blank lines become paragraphs, URLs become links. */
export function toHtml(body: string): string {
    const paras = body.split(/\n{2,}/).map((p) =>
        `<p style="margin:0 0 16px;line-height:1.6">${esc(p).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#76410f">$1</a>').replace(/\n/g, "<br>")}</p>`);
    return `<div style="font-family:Montserrat,Arial,sans-serif;font-size:14px;color:#111;background:#fffef8;padding:32px">
<div style="max-width:560px;margin:0 auto"><div style="font-size:20px;letter-spacing:.3em;color:#76410f;margin-bottom:28px">OMETSEY</div>${paras.join("")}
<div style="border-top:1px solid #e1e1e1;margin-top:28px;padding-top:14px;font-size:11px;color:#777">${esc(STORE.address)} · ${esc(STORE.phone)}</div></div></div>`;
}

/** What opens in the visitor's mail client. Mail links carry plain text only, not HTML. */
export function mailtoLink(to: string, subject: string, body: string) {
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
