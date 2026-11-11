// local imports
import { formatMoney } from "../shared";
import type { AdminProductSummary } from "../types";

/** One figure per currency: money is never added across currencies. */
export function Revenue({ p }: { p: AdminProductSummary }) {
    const rows = (p.revenueByCurrency ?? []).filter((r) => r.amount > 0);
    if (rows.length) return <>{rows.map((r) => <span key={r.currency} className="block">{formatMoney(r.amount, r.currency)}</span>)}</>;
    return <>{p.revenue !== undefined ? formatMoney(p.revenue, p.currency) : "—"}</>;
}
