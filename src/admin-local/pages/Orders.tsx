import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { SIZES, money } from "@/data/catalog"
import { useProducts } from "@/store/catalog"
import { usePaged, useSort } from "../hooks"
import { orderSubtotal, orderTotal } from "../email"
import { useAdmin } from "../store"
import type { NewOrder, Order, OrderItem, OrderSource, OrderStatus } from "../types"
import { Card, Drawer, Empty, FilterField, OrderBadge, PageHead, Pagination, SortTh, Tabs, Td, btn, btnSolid, fmtDate, fmtDateTime, inputCls, linkBtn, ORDER_LABEL } from "../ui"

const TABS: ("ALL" | OrderStatus)[] = ["ALL", "AWAITING_PAYMENT", "AWAITING_FULFILMENT", "COMPLETED", "CANCELLED"];
const SOURCES: OrderSource[] = ["website", "whatsapp", "in-store", "bespoke"];

function OrderDetail({ order }: { order: Order | undefined }) {
    const { markPaid, markShipped, cancelOrder } = useAdmin();
    const [tracking, setTracking] = useState("");
    if (!order) return null;
    return (
        <div className="space-y-6 text-[13px]">
            <div className="flex items-center justify-between"><OrderBadge status={order.status} /><span className="text-black/50">{fmtDateTime(order.placedAt)} · {order.source}</span></div>
            <section>
                <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-black/50">Customer</p>
                <p>{order.customer.name}</p>
                <p className="text-black/60">{[order.customer.email, order.customer.phone].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 text-black/60">{order.shipTo}</p>
            </section>
            <section>
                <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">Items</p>
                {order.items.map((i, n) => (
                    <div key={n} className="flex justify-between border-b border-[var(--a-border-soft)] py-2"><span>{i.title} · {i.size} × {i.qty}</span><span>{money(i.price * i.qty)}</span></div>
                ))}
                <div className="mt-3 space-y-1">
                    <div className="flex justify-between"><span>Subtotal</span><span>{money(orderSubtotal(order))}</span></div>
                    {order.discount > 0 && <div className="flex justify-between"><span>Discount {order.discountCode && `(${order.discountCode})`}</span><span>−{money(order.discount)}</span></div>}
                    <div className="flex justify-between"><span>Shipping</span><span>{money(order.shipping)}</span></div>
                    <div className="flex justify-between border-t border-[var(--a-border-soft)] pt-2 font-medium"><span>Total</span><span>{money(orderTotal(order))}</span></div>
                </div>
            </section>
            {order.notes && <section><p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-black/50">Notes</p><p>{order.notes}</p></section>}
            {order.trackingNumber && <p>Tracking: {order.trackingNumber}</p>}

            <div className="space-y-3 border-t border-[var(--a-border-soft)] pt-5">
                {order.status === "AWAITING_PAYMENT" && <button className={btnSolid} onClick={() => markPaid(order.id)}>Mark as paid</button>}
                {order.status === "AWAITING_FULFILMENT" && (
                    <div className="flex gap-2">
                        <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className={inputCls} />
                        <button className={btnSolid} disabled={!tracking.trim()} onClick={() => markShipped(order.id, tracking.trim())}>Mark shipped</button>
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <Link to={`/admin/emails?tab=compose&order=${order.id}`} className={btn}>Email customer</Link>
                    {(order.status === "AWAITING_PAYMENT" || order.status === "AWAITING_FULFILMENT") && (
                        <button className={linkBtn} onClick={() => { if (confirm(`Cancel order ${order.number}?`)) cancelOrder(order.id); }}>Cancel order</button>
                    )}
                </div>
                <p className="text-[11px] text-black/40">Status changes queue the matching emails in Emails &gt; Pipeline.</p>
            </div>
        </div>
    );
}

function NewOrderForm({ onDone }: { onDone: () => void }) {
    const addOrder = useAdmin((s) => s.addOrder);
    const discounts = useAdmin((s) => s.discounts);
    const products = useProducts({ includeHidden: true });
    const blank = (): OrderItem => ({ handle: products[0].handle, title: products[0].title, size: SIZES[1], qty: 1, price: products[0].price });
    const [items, setItems] = useState<OrderItem[]>([blank()]);
    const [f, setF] = useState({ name: "", email: "", phone: "", shipTo: "", source: "whatsapp" as OrderSource, shipping: "0", code: "", notes: "", paid: false });
    const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

    const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
    const link = discounts.find((d) => d.active && d.code.toLowerCase() === f.code.trim().toLowerCase());
    const discount = !link ? 0 : link.type === "PERCENTAGE" ? Math.round(subtotal * link.value) / 100 : Math.min(link.value, subtotal);
    const total = Math.max(0, subtotal - discount) + (Number(f.shipping) || 0);

    const setItem = (i: number, patch: Partial<OrderItem>) => setItems((xs) => xs.map((x, n) => (n === i ? { ...x, ...patch } : x)));
    const pickProduct = (i: number, handle: string) => {
        const p = products.find((x) => x.handle === handle)!;
        setItem(i, { handle, title: p.title, price: p.price });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const input: NewOrder = {
            source: f.source, customer: { name: f.name, email: f.email, phone: f.phone }, shipTo: f.shipTo, items,
            shipping: Number(f.shipping) || 0, discount, discountCode: link?.code, notes: f.notes || undefined, paid: f.paid,
        };
        addOrder(input);
        onDone();
    };

    return (
        <form onSubmit={submit} className="space-y-4 text-[13px]">
            <div className="grid gap-3 sm:grid-cols-2">
                <input required placeholder="Customer name" value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
                <input required type="email" placeholder="Email" value={f.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
                <input placeholder="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
                <select value={f.source} onChange={(e) => set("source", e.target.value)} className={inputCls}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <input placeholder="Ship to (address)" value={f.shipTo} onChange={(e) => set("shipTo", e.target.value)} className={inputCls} />

            <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.08em] text-black/50">Items</p>
                {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_72px_64px_24px] items-center gap-2">
                        <select aria-label="Product" value={it.handle} onChange={(e) => pickProduct(i, e.target.value)} className={inputCls}>{products.map((p) => <option key={p.handle} value={p.handle}>{p.title}</option>)}</select>
                        <select aria-label="Size" value={it.size} onChange={(e) => setItem(i, { size: e.target.value })} className={`${inputCls} !px-2`}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select>
                        <input aria-label="Quantity" type="number" min={1} value={it.qty} onChange={(e) => setItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })} className={`${inputCls} !px-2 text-center`} />
                        {items.length > 1
                            ? <button type="button" aria-label="Remove item" onClick={() => setItems((xs) => xs.filter((_, n) => n !== i))} className="text-lg leading-none text-black/50 hover:text-black">×</button>
                            : <span />}
                    </div>
                ))}
                <button type="button" className={linkBtn} onClick={() => setItems((xs) => [...xs, blank()])}>Add another item</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <input type="number" min={0} placeholder="Shipping (₵)" value={f.shipping} onChange={(e) => set("shipping", e.target.value)} className={inputCls} />
                <input placeholder="Discount code (optional)" value={f.code} onChange={(e) => set("code", e.target.value)} className={inputCls} />
            </div>
            {f.code && <p className="text-[12px] text-black/60">{link ? `Applies ${link.type === "PERCENTAGE" ? `${link.value}%` : money(link.value)} off.` : "No active discount with that code."}</p>}
            <textarea placeholder="Notes (measurements, delivery details…)" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.paid} onChange={(e) => set("paid", e.target.checked)} /> Already paid</label>
            <div className="flex items-center justify-between border-t border-[var(--a-border-soft)] pt-4">
                <span className="font-medium">Total {money(total)}</span>
                <button className={btnSolid}>Create order</button>
            </div>
            <p className="text-[11px] text-black/40">Creating the order queues its confirmation email in Emails &gt; Pipeline.</p>
        </form>
    );
}

const orderNo = (o: Order) => Number(o.number.replace(/\D/g, "")) || 0;

export function Orders() {
    const orders = useAdmin((s) => s.orders);
    const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
    const [q, setQ] = useState("");
    const [source, setSource] = useState("");
    const [payment, setPayment] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [min, setMin] = useState("");
    const [max, setMax] = useState("");
    const [openId, setOpenId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const filtered = useMemo(() => orders.filter((o) => {
        const total = orderTotal(o);
        const day = o.placedAt.slice(0, 10);
        return (tab === "ALL" || o.status === tab)
            && (!source || o.source === source)
            && (!payment || (payment === "paid" ? !!o.paidAt : !o.paidAt))
            && (!from || day >= from) && (!to || day <= to)
            && (!min || total >= Number(min)) && (!max || total <= Number(max))
            && (!q.trim() || `${o.number} ${o.customer.name} ${o.customer.email}`.toLowerCase().includes(q.toLowerCase()));
    }), [orders, tab, q, source, payment, from, to, min, max]);

    const { sorted, sort, toggle } = useSort(filtered, {
        number: orderNo, date: (o) => o.placedAt, customer: (o) => o.customer.name, source: (o) => o.source,
        status: (o) => ORDER_LABEL[o.status], total: orderTotal,
    });
    const paged = usePaged(sorted, JSON.stringify([tab, q, source, payment, from, to, min, max, sort]));
    const count = (t: (typeof TABS)[number]) => (t === "ALL" ? orders.length : orders.filter((o) => o.status === t).length);
    const dirty = !!(q || source || payment || from || to || min || max);
    const clear = () => { setQ(""); setSource(""); setPayment(""); setFrom(""); setTo(""); setMin(""); setMax(""); };

    return (
        <>
            <PageHead title="Orders" subtitle={`${orders.length} orders`}><button className={btnSolid} onClick={() => setCreating(true)}>New order</button></PageHead>
            <div className="mb-5"><Tabs value={tab} onChange={setTab} items={TABS.map((t) => ({ id: t, label: t === "ALL" ? "All" : ORDER_LABEL[t], count: count(t) }))} /></div>

            <div className="mb-5 flex flex-wrap items-end gap-3">
                <FilterField label="Search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, name or email" className={`${inputCls} w-[200px]`} /></FilterField>
                <FilterField label="Source"><select value={source} onChange={(e) => setSource(e.target.value)} className={`${inputCls} w-[130px]`}><option value="">All</option>{SOURCES.map((x) => <option key={x}>{x}</option>)}</select></FilterField>
                <FilterField label="Payment"><select value={payment} onChange={(e) => setPayment(e.target.value)} className={`${inputCls} w-[110px]`}><option value="">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></FilterField>
                <FilterField label="Placed between">
                    <span className="flex items-center gap-1.5">
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-[140px]`} aria-label="From date" />
                        <span className="text-black/30">–</span>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-[140px]`} aria-label="To date" />
                    </span>
                </FilterField>
                <FilterField label="Total (₵)">
                    <span className="flex items-center gap-1.5">
                        <input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min" className={`${inputCls} w-[84px]`} />
                        <span className="text-black/30">–</span>
                        <input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max" className={`${inputCls} w-[84px]`} />
                    </span>
                </FilterField>
                {dirty && <button onClick={clear} className={`${linkBtn} pb-2`}>Clear filters</button>}
            </div>

            <Card flush>
                {sorted.length ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px]">
                                <thead><tr>
                                    <SortTh label="Order" k="number" sort={sort} toggle={toggle} /><SortTh label="Date" k="date" sort={sort} toggle={toggle} />
                                    <SortTh label="Customer" k="customer" sort={sort} toggle={toggle} /><SortTh label="Source" k="source" sort={sort} toggle={toggle} />
                                    <SortTh label="Status" k="status" sort={sort} toggle={toggle} /><SortTh label="Total" k="total" sort={sort} toggle={toggle} right />
                                </tr></thead>
                                <tbody>{paged.rows.map((o) => (
                                    <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer border-t border-[var(--a-border-soft)]">
                                        <Td>{o.number}{o.sample && <span className="ml-2 text-[10px] text-black/40">SAMPLE</span>}</Td>
                                        <Td>{fmtDate(o.placedAt)}</Td><Td>{o.customer.name}</Td><Td>{o.source}</Td>
                                        <Td><OrderBadge status={o.status} /></Td><Td right>{money(orderTotal(o))}</Td>
                                    </tr>))}</tbody>
                            </table>
                        </div>
                        <Pagination p={paged} />
                    </>
                ) : <Empty>{orders.length ? <>No orders match. {dirty && <button onClick={clear} className={linkBtn}>Clear filters</button>}</> : "No orders yet. Create one with “New order”, or load sample data from Settings."}</Empty>}
            </Card>
            <Drawer open={openId !== null} onClose={() => setOpenId(null)} title={orders.find((o) => o.id === openId)?.number ?? "Order"}>
                <OrderDetail order={orders.find((o) => o.id === openId)} />
            </Drawer>
            <Drawer open={creating} onClose={() => setCreating(false)} title="New order"><NewOrderForm onDone={() => setCreating(false)} /></Drawer>
        </>
    );
}
