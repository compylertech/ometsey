// global imports
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// local imports
import { formatMoney } from "../shared";
import { useAdminData } from "../data";
import { ADMIN, SOURCE_LABEL, STAGES, csvOf, placedTime, sourceLabel, sourceOf, stageOf } from "../model";
import type { OrderStage } from "../model";
import { usePaged, useSort } from "../hooks";
import { Card, Drawer, Empty, FilterField, PageHead, Pagination, STAGE_LABEL, SortTh, OrderBadge, Tabs, Td, btn, fmtDate, fmtDateTime, inputBare, linkBtn, btnSolid } from "../ui";
import type { AdminOrder } from "../types";
import { DataNotices } from "./notices";
import { NewOrder } from "./NewOrder";
import { useOrderActions } from "./OrderActions";

const TABS: ("ALL" | OrderStage)[] = ["ALL", ...STAGES];
const orderNo = (o: AdminOrder) => Number(o.orderNumber.replace(/\D/g, "")) || 0;

const shipLines = (o: AdminOrder) => [
    o.shipToName,
    o.shipToPhone,
    [o.shipToAddress, o.shipToAddress2].filter(Boolean).join(", "),
    [o.shipToCity, o.shipToRegion, o.shipToPostalCode, o.shipToCountry].filter(Boolean).join(", "),
].filter(Boolean) as string[];

/** Where each ready-made email lands in the composer, pre-filled from the order. */
function composeLink(o: AdminOrder, group?: string) {
    const q = new URLSearchParams();
    if (o.customerEmail) q.set("to", o.customerEmail);
    const first = (o.customerName ?? "").trim().split(/\s+/)[0];
    if (first) q.set("name", first);
    const colourway = o.items.find((i) => i.colourway)?.colourway;
    if (colourway) q.set("colourway", colourway);
    if (group) q.set("group", group);
    return `${ADMIN}/emails?${q.toString()}`;
}

/** The server's payment status, worded for an admin. Only meaningful to call out while the order is unpaid. */
const PAYMENT_LABEL: Record<string, string> = { PENDING: "Payment pending", FAILED: "Payment failed" };
const unpaidNote = (o: AdminOrder) => (!o.paid && o.paymentStatus ? PAYMENT_LABEL[o.paymentStatus] ?? null : null);

function OrderDetail({ order }: { order: AdminOrder }) {
    const actions = useOrderActions(order);
    const stage = stageOf(order);
    const ship = shipLines(order);
    const money = (n: number) => formatMoney(n, order.currency);
    return (
        <div className="space-y-6 text-[13px]">
            <div>
                <div className="flex items-center justify-between gap-3"><OrderBadge order={order} />{actions.buttons}</div>
                <p className="m-0 mt-2 text-black/50">{fmtDateTime(order.placedAt)}{sourceOf(order) !== "storefront" ? ` · ${sourceLabel(order)}` : ""}</p>
            </div>
            {order.clientId && <div><Link to={`${ADMIN}/customers?customer=${encodeURIComponent(order.clientId)}`} className="a-link">View customer</Link></div>}
            {actions.top}
            {unpaidNote(order) && (
                <div className={`border px-3 py-2 ${order.paymentStatus === "FAILED" ? "border-[var(--a-st-can)] text-[var(--a-st-can)]" : "border-[var(--a-border)] text-black/60"}`}>
                    {unpaidNote(order)}{order.paymentStatus === "FAILED" ? ": the payment attempt did not go through. The customer may need a nudge to retry." : ": checkout was started but not completed."}
                </div>
            )}
            <section>
                <p className="m-0 mb-1 text-[11px] uppercase tracking-[0.08em] text-black/50">Customer</p>
                <p className="m-0">{order.customerName || "—"}</p>
                <p className="m-0 text-black/60">{[order.customerEmail, order.customerPhone].filter(Boolean).join(" · ")}</p>
            </section>
            <section>
                <p className="m-0 mb-1 text-[11px] uppercase tracking-[0.08em] text-black/50">Ship to</p>
                {ship.length ? ship.map((l, i) => <p key={i} className={`m-0 ${i ? "text-black/60" : ""}`}>{l}</p>) : <p className="m-0 text-black/60">—</p>}
            </section>
            <section>
                <p className="m-0 mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">Items</p>
                {order.items.map((i, n) => (
                    <div key={`${i.sku}-${n}`} className="flex justify-between gap-4 border-b border-[var(--a-border-soft)] py-2">
                        <span>
                            {i.name ?? i.sku}{i.quantity > 1 ? ` × ${i.quantity}` : ""}
                            {(i.colourway || i.size) && <span className="block text-[12px] text-black/50">{[i.colourway, i.size ? `UK ${i.size}` : null].filter(Boolean).join(" · ")}</span>}
                        </span>
                        <span>{money(i.totalPrice)}</span>
                    </div>
                ))}
                <div className="mt-3 space-y-1">
                    <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
                    {(order.discountTotal ?? 0) > 0 && <div className="flex justify-between"><span>Discount</span><span>−{money(order.discountTotal ?? 0)}</span></div>}
                    <div className="flex justify-between"><span>Shipping</span><span>{order.shippingWaived ? "Complimentary" : money(order.shippingTotal)}</span></div>
                    <div className="flex justify-between border-t border-[var(--a-border-soft)] pt-2 font-medium"><span>Total</span><span>{money(order.grandTotal)}</span></div>
                    {order.paid && order.settlementAmount !== null && order.settlementCurrency && (
                        <div className="flex justify-between text-black/60"><span>Charged{order.providerTransactionId ? ` · txn ${order.providerTransactionId}` : ""}</span><span>{formatMoney(order.settlementAmount, order.settlementCurrency)}</span></div>
                    )}
                </div>
            </section>
            {order.notes && <section><p className="m-0 mb-1 text-[11px] uppercase tracking-[0.08em] text-black/50">Notes</p><p className="m-0">{order.notes}</p></section>}
            {order.paidAt && <p className="m-0 text-black/60">Paid {fmtDateTime(order.paidAt)}</p>}
            {order.trackingNumber && (
                <p className="m-0 text-black/60">
                    Shipped{order.shippedAt ? ` ${fmtDateTime(order.shippedAt)}` : ""} · tracking{" "}
                    {order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="underline">{order.trackingNumber}</a> : order.trackingNumber}
                </p>
            )}

            {actions.bottom && <div className="border-t border-[var(--a-border-soft)] pt-5">{actions.bottom}</div>}

            <div className="space-y-3 border-t border-[var(--a-border-soft)] pt-5">
                {order.customerEmail ? (
                    <div className="flex flex-wrap gap-2">
                        {stage === "AWAITING_FULFILMENT" && <Link to={composeLink(order, "PIECE_READY")} className={btn}>Piece is ready</Link>}
                        {(stage === "AWAITING_FULFILMENT" || stage === "SHIPPED" || stage === "COMPLETED") && <Link to={composeLink(order, "ON_THE_WAY")} className={btn}>Order on the way</Link>}
                        <Link to={composeLink(order)} className={btn}>Email customer</Link>
                    </div>
                ) : <p className="m-0 text-black/50">This order has no customer email.</p>}
                <p className="m-0 text-[11px] text-black/40">Actions above change the order straight away. Emails to the customer are only sent from here.</p>
            </div>
        </div>
    );
}

export function Orders() {
    const { orders, loading } = useAdminData();
    const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
    const [q, setQ] = useState("");
    const [country, setCountry] = useState("");
    const [payment, setPayment] = useState("");
    const [source, setSource] = useState("");
    const [creating, setCreating] = useState(false);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [min, setMin] = useState("");
    const [max, setMax] = useState("");
    const [params, setParams] = useSearchParams();
    const [openId, setOpenId] = useState<string | null>(params.get("order"));
    // An address like /orders?order=ORD-… opens that order, which is how the customer page links here.
    useEffect(() => { const n = params.get("order"); if (n) setOpenId(n); }, [params]);
    const closeOrder = () => { setOpenId(null); if (params.has("order")) setParams((p) => { p.delete("order"); return p; }, { replace: true }); };

    const countries = useMemo(() => [...new Set(orders.map((o) => o.shipToCountry).filter(Boolean) as string[])].sort(), [orders]);

    const sources = useMemo(() => [...new Set(orders.map(sourceOf))].sort(), [orders]);

    const filtered = useMemo(() => orders.filter((o) => {
        const day = (o.placedAt ?? "").slice(0, 10);
        return (tab === "ALL" || stageOf(o) === tab)
            && (!country || o.shipToCountry === country)
            && (!payment || (payment === "paid" ? o.paid : !o.paid))
            && (!source || sourceOf(o) === source)
            && (!from || day >= from) && (!to || day <= to)
            && (!min || o.grandTotal >= Number(min)) && (!max || o.grandTotal <= Number(max))
            && (!q.trim() || `${o.orderNumber} ${o.customerName ?? ""} ${o.customerEmail ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
    }), [orders, tab, q, country, payment, source, from, to, min, max]);

    const { sorted, sort, toggle } = useSort(filtered, {
        number: orderNo, date: placedTime, customer: (o) => o.customerName ?? "", country: (o) => o.shipToCountry ?? "", source: sourceLabel,
        status: (o) => STAGE_LABEL[stageOf(o)], total: (o) => o.grandTotal,
    });
    const paged = usePaged(sorted, JSON.stringify([tab, q, country, payment, source, from, to, min, max, sort]));
    const count = (t: (typeof TABS)[number]) => (t === "ALL" ? orders.length : orders.filter((o) => stageOf(o) === t).length);
    const dirty = !!(q || country || payment || source || from || to || min || max);
    const clear = () => { setQ(""); setCountry(""); setPayment(""); setSource(""); setFrom(""); setTo(""); setMin(""); setMax(""); };
    const open = orders.find((o) => o.orderNumber === openId);

    function download() {
        const url = URL.createObjectURL(new Blob([csvOf(sorted)], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `ometsey-orders-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <>
            <PageHead title="Orders" subtitle={`${orders.length} orders`}>
                <button className={btn} disabled={!sorted.length} onClick={download}>Export CSV</button>
                <button className={btnSolid} onClick={() => setCreating(true)}>New order</button>
            </PageHead>
            <DataNotices of={["orders"]} />
            <div className="mb-5"><Tabs value={tab} onChange={setTab} items={TABS.map((t) => ({ id: t, label: t === "ALL" ? "All" : STAGE_LABEL[t], count: count(t) }))} /></div>

            <div className="mb-5 flex flex-wrap items-end gap-3">
                <FilterField label="Search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, name or email" className={`${inputBare} w-[200px]`} /></FilterField>
                <FilterField label="Ship to"><select value={country} onChange={(e) => setCountry(e.target.value)} className={`${inputBare} w-[130px]`}><option value="">All</option>{countries.map((x) => <option key={x}>{x}</option>)}</select></FilterField>
                <FilterField label="Payment"><select value={payment} onChange={(e) => setPayment(e.target.value)} className={`${inputBare} w-[110px]`}><option value="">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></FilterField>
                {sources.length > 1 && <FilterField label="Source"><select value={source} onChange={(e) => setSource(e.target.value)} className={`${inputBare} w-[120px]`}><option value="">All</option>{sources.map((x) => <option key={x} value={x}>{SOURCE_LABEL[x] ?? x}</option>)}</select></FilterField>}
                <FilterField label="Placed between">
                    <span className="flex items-center gap-1.5">
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputBare} w-[140px]`} aria-label="From date" />
                        <span className="text-black/30">–</span>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputBare} w-[140px]`} aria-label="To date" />
                    </span>
                </FilterField>
                <FilterField label="Total">
                    <span className="flex items-center gap-1.5">
                        <input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min" className={`${inputBare} w-[84px]`} />
                        <span className="text-black/30">–</span>
                        <input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max" className={`${inputBare} w-[84px]`} />
                    </span>
                </FilterField>
                {dirty && <button onClick={clear} className={`${linkBtn} pb-2`}>Clear filters</button>}
            </div>

            <Card flush>
                {sorted.length ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse">
                                <thead><tr>
                                    <SortTh label="Order" k="number" sort={sort} toggle={toggle} /><SortTh label="Date" k="date" sort={sort} toggle={toggle} />
                                    <SortTh label="Customer" k="customer" sort={sort} toggle={toggle} /><SortTh label="Ship to" k="country" sort={sort} toggle={toggle} />{sources.length > 1 && <SortTh label="Source" k="source" sort={sort} toggle={toggle} />}
                                    <SortTh label="Status" k="status" sort={sort} toggle={toggle} /><SortTh label="Total" k="total" sort={sort} toggle={toggle} right />
                                </tr></thead>
                                <tbody>{paged.rows.map((o) => (
                                    <tr key={o.orderNumber} onClick={() => setOpenId(o.orderNumber)} className="cursor-pointer border-t border-[var(--a-border-soft)]">
                                        <Td className="font-medium">{o.orderNumber}</Td>
                                        <Td>{fmtDate(o.placedAt)}</Td><Td>{o.customerName || "—"}</Td><Td>{o.shipToCountry || "—"}</Td>{sources.length > 1 && <Td>{sourceLabel(o)}</Td>}
                                        <Td><OrderBadge order={o} />{o.paymentStatus !== "FAILED" && unpaidNote(o) && <span className="mt-1 block text-[11px] text-black/50">{unpaidNote(o)}</span>}</Td><Td right>{formatMoney(o.grandTotal, o.currency)}</Td>
                                    </tr>))}</tbody>
                            </table>
                        </div>
                        <Pagination p={paged} always />
                    </>
                ) : <Empty>{loading ? "Loading…" : orders.length ? <>No orders match. {dirty && <button onClick={clear} className={linkBtn}>Clear filters</button>}</> : "No orders yet. They appear here as customers check out."}</Empty>}
            </Card>
            <Drawer open={creating} onClose={() => setCreating(false)} title="New order">
                <NewOrder onClose={() => setCreating(false)} onCreated={(n) => { setCreating(false); setOpenId(n); }} />
            </Drawer>
            <Drawer open={openId !== null} onClose={closeOrder} title={open?.orderNumber ?? openId ?? "Order"}>
                {open ? <OrderDetail key={open.orderNumber} order={open} /> : <p className="m-0 py-10 text-center text-[13px] text-black/50">{loading ? "Loading…" : "That order isn’t in the loaded list."}</p>}
            </Drawer>
        </>
    );
}
