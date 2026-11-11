// global imports
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// local imports
import { formatMoney } from "../shared";
import { fetchCustomer, fetchCustomers, UnauthorizedError, withRetry } from "../api";
import { useAdminData } from "../data";
import { ADMIN } from "../model";
import { usePaged, useSort } from "../hooks";
import { Card, Drawer, Empty, Notice, PageHead, Pagination, SortTh, StatePill, Td, Th, fmtDate, inputBare, linkBtn } from "../ui";
import type { AdminCustomer, AdminCustomerDetail } from "../types";

const emailLink = (c: AdminCustomer) =>
    `${ADMIN}/emails?to=${encodeURIComponent(c.email ?? "")}&name=${encodeURIComponent((c.name ?? "").split(/\s+/)[0] ?? "")}`;

/** One figure per currency: money is never added across currencies. */
const Spent = ({ c }: { c: AdminCustomer }) => c.totalSpent.length
    ? <>{c.totalSpent.map((m) => <span key={m.currency} className="block">{formatMoney(m.amount, m.currency)}</span>)}</>
    : <span className="text-black/40">—</span>;

function CustomerDetail({ clientId, onClose }: { clientId: string; onClose: () => void }) {
    const { token, unauthorized } = useAdminData();
    const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        withRetry(() => fetchCustomer(token, clientId), () => undefined, () => live)
            .then((d) => { if (live) setDetail(d); })
            .catch((err) => {
                if (!live) return;
                if (err instanceof UnauthorizedError) return unauthorized();
                setError(err instanceof Error ? err.message : "Couldn’t load this customer.");
            });
        return () => { live = false; };
    }, [token, clientId, unauthorized]);

    if (error) return <Notice tone="error">{error}</Notice>;
    if (!detail) return <p className="m-0 py-12 text-center text-[13px] text-black/45">Loading…</p>;
    const { customer: c, orders } = detail;

    return (
        <div className="space-y-6 text-[13px]">
            <div>
                <p className="m-0 text-[15px] font-semibold">{c.name || c.email || "Customer"}</p>
                <p className="m-0 mt-1 text-black/60">{[c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
                {c.email && <div className="mt-3"><Link to={emailLink(c)} className="a-link" onClick={onClose}>Email this customer</Link></div>}
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div><p className="m-0 text-[11px] text-black/50">Orders</p><p className="m-0 text-[18px] font-semibold">{c.orderCount}</p><p className="m-0 text-[11px] text-black/45">{c.paidOrderCount} paid</p></div>
                <div><p className="m-0 text-[11px] text-black/50">Total spent</p><p className="m-0 text-[18px] font-semibold"><Spent c={c} /></p></div>
                <div><p className="m-0 text-[11px] text-black/50">Customer since</p><p className="m-0 text-[14px] font-medium">{c.firstOrderAt ? fmtDate(c.firstOrderAt) : "—"}</p><p className="m-0 text-[11px] text-black/45">Last order {c.lastOrderAt ? fmtDate(c.lastOrderAt) : "—"}</p></div>
            </div>

            {!!c.billingAccounts.length && (
                <p className="m-0 text-black/60">Billing {c.billingAccounts.length === 1 ? "account" : "accounts"}: {c.billingAccounts.map((b) => b.accountNumber).join(", ")}</p>
            )}

            <section>
                <p className="m-0 mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">Orders</p>
                {orders.length ? (
                    <div className="border border-[var(--a-border-soft)]">
                        <table className="w-full border-collapse">
                            <thead><tr><Th>Order</Th><Th>Placed</Th><Th>Status</Th><Th right>Total</Th></tr></thead>
                            <tbody>{orders.map((o) => (
                                <tr key={o.orderNumber} className="border-t border-[var(--a-border-soft)]">
                                    <Td className="font-medium"><Link to={`${ADMIN}/orders?order=${encodeURIComponent(o.orderNumber)}`} className="a-link">{o.orderNumber}</Link></Td><Td>{o.placedAt ? fmtDate(o.placedAt) : "—"}</Td>
                                    <Td><StatePill label={o.status} color="var(--a-st-ref)" /></Td><Td right>{formatMoney(o.grandTotal, o.currency)}</Td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : <p className="m-0 text-black/45">No orders yet.</p>}
            </section>
        </div>
    );
}

/** Customers come from the backend's CRM clients who have ordered: matched on email (or phone), with their billing accounts and per-currency spend. */
export function Customers() {
    const { token, unauthorized } = useAdminData();
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState<AdminCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);
    const [params, setParams] = useSearchParams();
    const [openId, setOpenId] = useState<string | null>(params.get("customer"));
    // /customers?customer=<id> opens that customer, which is how an order links here.
    useEffect(() => { const c = params.get("customer"); if (c) setOpenId(c); }, [params]);
    const closeCustomer = () => { setOpenId(null); if (params.has("customer")) setParams((p) => { p.delete("customer"); return p; }, { replace: true }); };
    const openRow = rows.find((c) => c.clientId === openId);

    // The server searches name, email, phone and billing account number; typing waits a moment before asking.
    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(q), 300);
        return () => window.clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        let live = true;
        setLoading(true);
        withRetry(() => fetchCustomers(token, search), () => undefined, () => live)
            .then((list) => { if (live) { setRows(list); setError(null); } })
            .catch((err) => {
                if (!live) return;
                if (err instanceof UnauthorizedError) return unauthorized();
                setError(err instanceof Error ? err.message : "Couldn’t load the customers.");
            })
            .finally(() => { if (live) setLoading(false); });
        return () => { live = false; };
    }, [token, search, tick, unauthorized]);

    const { sorted, sort, toggle } = useSort(rows, {
        name: (c) => c.name || c.email || "", orders: (c) => c.orderCount, last: (c) => c.lastOrderAt ?? "",
    });
    const paged = usePaged(sorted, JSON.stringify([search, sort]));
    const subtitle = useMemo(() => `${rows.length} ${rows.length === 1 ? "customer" : "customers"}${search ? " found" : ""}`, [rows.length, search]);

    return (
        <>
            <PageHead title="Customers" subtitle={subtitle}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone or account" className={`${inputBare} w-[260px]`} /></PageHead>
            {error && <div className="mb-5"><Notice tone="error">{error} <button className={linkBtn} onClick={() => setTick((n) => n + 1)}>Try again</button></Notice></div>}
            <Card flush>
                {sorted.length ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] border-collapse">
                                <thead><tr><SortTh label="Customer" k="name" sort={sort} toggle={toggle} /><Th>Phone</Th><SortTh label="Orders" k="orders" sort={sort} toggle={toggle} right /><Th right>Spent</Th><SortTh label="Last order" k="last" sort={sort} toggle={toggle} /><Th>Billing</Th><Th /></tr></thead>
                                <tbody>{paged.rows.map((c) => (
                                    <tr key={c.clientId} className="border-t border-[var(--a-border-soft)]">
                                        <Td>{c.name || "—"}<span className="block text-[12px] text-black/50">{c.email ?? ""}</span></Td>
                                        <Td>{c.phone || "—"}</Td>
                                        <Td right>{c.orderCount}{c.orderCount !== c.paidOrderCount && <span className="block text-[11px] text-black/45">{c.paidOrderCount} paid</span>}</Td>
                                        <Td right><Spent c={c} /></Td>
                                        <Td>{c.lastOrderAt ? fmtDate(c.lastOrderAt) : "—"}</Td>
                                        <Td className="text-[12px] text-black/55">{c.billingAccounts.map((b) => b.accountNumber).join(", ") || "—"}</Td>
                                        <Td right>
                                            <span className="inline-flex items-center gap-x-4">
                                                <button className={linkBtn} onClick={() => setOpenId(c.clientId)}>View</button>
                                                {c.email && <Link to={emailLink(c)} className="a-link">Email</Link>}
                                            </span>
                                        </Td>
                                    </tr>))}</tbody>
                            </table>
                        </div>
                        <Pagination p={paged} />
                    </>
                ) : <Empty>{loading ? "Loading…" : search ? "No customers match." : "Customers appear here once there are orders."}</Empty>}
            </Card>

            <Drawer wide open={openId !== null} onClose={closeCustomer} title={openRow ? openRow.name || openRow.email || "Customer" : "Customer"}>
                {openId && <CustomerDetail key={openId} clientId={openId} onClose={closeCustomer} />}
            </Drawer>
        </>
    );
}
