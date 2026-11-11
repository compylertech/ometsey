// global imports
import { useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

// local imports
import { formatMoney } from "../shared";
import { useAdminData } from "../data";
import { ADMIN, STAGES, earns, placedTime, stageOf } from "../model";
import { BRAND, Card, Empty, Icons, PageHead, STAGE_COLOR, STAGE_LABEL, OrderBadge, Stat, Td, Th, fmtDate, linkBtn } from "../ui";
import { DataNotices } from "./notices";

const RANGES = [7, 30, 90] as const;
const DAY = 86_400_000;
const dayKey = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const pct = (prev: number, cur: number) => (prev === 0 ? null : ((cur - prev) / prev) * 100);

function compactMoney(v: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v);
    } catch {
        return String(v);
    }
}

/** Round a maximum up to a 1/2/5 step so the axis ticks land on tidy numbers. */
function niceCeil(max: number) {
    if (max <= 0) return 100;
    const exp = 10 ** Math.floor(Math.log10(max));
    const f = max / exp;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

interface Point { day: string; value: number; orders: number }

/** One series, one colour: a line over a soft fill, recessive grid, hover crosshair with a tooltip. */
function RevenueChart({ points, currency }: { points: Point[]; currency: string }) {
    const gid = useId();
    const box = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<number | null>(null);
    const W = 720, H = 250, L = 52, R = 14, T = 14, B = 28;
    const pw = W - L - R, ph = H - T - B;
    const n = points.length;
    const top = niceCeil(Math.max(...points.map((p) => p.value)));
    const x = (i: number) => L + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
    const y = (v: number) => T + ph * (1 - v / top);
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const area = `${line} L${x(n - 1).toFixed(1)},${T + ph} L${x(0).toFixed(1)},${T + ph} Z`;
    const ticks = [0, 1, 2, 3, 4].map((k) => (top / 4) * k);
    const labelIdx = [0, Math.floor((n - 1) / 2), n - 1];

    const move = (e: React.MouseEvent) => {
        const r = box.current!.getBoundingClientRect();
        const vx = ((e.clientX - r.left) / r.width) * W;
        setHover(Math.min(n - 1, Math.max(0, Math.round(((vx - L) / pw) * (n - 1)))));
    };
    const hp = hover === null ? null : points[hover];

    return (
        <div ref={box} className="relative" onMouseMove={move} onMouseLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Revenue per day">
                <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={BRAND} stopOpacity="0.22" /><stop offset="1" stopColor={BRAND} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#000" strokeOpacity={t === 0 ? 0.18 : 0.07} />
                        <text x={L - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill="#000" fillOpacity="0.45">{compactMoney(t, currency)}</text>
                    </g>
                ))}
                <path d={area} fill={`url(#${gid})`} />
                <path d={line} fill="none" stroke={BRAND} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {labelIdx.map((i) => (
                    <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10.5" fill="#000" fillOpacity="0.45">
                        {new Date(`${points[i].day}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </text>
                ))}
                {hover !== null && hp && (
                    <g>
                        <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ph} stroke="#000" strokeOpacity="0.2" strokeDasharray="3 3" />
                        <circle cx={x(hover)} cy={y(hp.value)} r="5" fill={BRAND} stroke="#fff" strokeWidth="2" />
                    </g>
                )}
            </svg>
            {hp && hover !== null && (
                <div className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap border border-[var(--a-border)] bg-white px-3 py-2 text-[12px]"
                    style={{ left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%` }}>
                    <p className="m-0 text-black/50">{fmtDate(`${hp.day}T12:00:00`)}</p>
                    <p className="m-0 mt-0.5 text-[14px] font-semibold">{formatMoney(hp.value, currency)}</p>
                    <p className="m-0 text-black/50">{hp.orders} paid {hp.orders === 1 ? "order" : "orders"}</p>
                </div>
            )}
        </div>
    );
}

function RangePicker({ value, onChange }: { value: number; onChange: (n: (typeof RANGES)[number]) => void }) {
    return (
        <div className="inline-flex border border-[var(--a-border)] bg-white p-0.5">
            {RANGES.map((r) => (
                <button key={r} onClick={() => onChange(r)} className={`a-seg ${r === value ? "is-active" : ""}`}>{r} days</button>
            ))}
        </div>
    );
}

export function Overview() {
    const { orders, view, links, loading } = useAdminData();
    const [picked, setPicked] = useState<(typeof RANGES)[number] | null>(null);
    const [table, setTable] = useState(false);

    // Orders carry their own currency and a number must never mix two, so the dashboard works in the
    // store's main currency and counts what it leaves out.
    const currency = useMemo(() => {
        if (view?.currency) return view.currency;
        const tally = new Map<string, number>();
        for (const o of orders) tally.set(o.currency, (tally.get(o.currency) ?? 0) + 1);
        return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
    }, [view, orders]);
    // Until the admin picks a window, show 30 days, or 90 if nothing has been paid in the last 30.
    const range = picked ?? (orders.some((o) => earns(o) && placedTime(o) >= Date.now() - 30 * DAY) ? 30 : 90);
    const foreign = orders.filter((o) => o.currency !== currency).length;

    /*
     * Definitions (they must reconcile with the Orders page):
     *  - window = orders whose placedAt falls in the last N days; previous window = the N days before.
     *  - revenue = sum of grandTotal over window orders that are paid and not cancelled or refunded.
     *  - orders = count placed in the window; paid = those counted for revenue; AOV = revenue / paid.
     *  - deltas = percent change against the previous window; null (no arrow) when that was zero.
     */
    const d = useMemo(() => {
        const now = Date.now();
        const mine = orders.filter((o) => o.currency === currency);
        const inWindow = (o: { placedAt: string | null }, from: number, to: number) => { const t = placedTime(o); return t >= from && t < to; };
        const paidIn = (from: number, to: number) => mine.filter((o) => earns(o) && inWindow(o, from, to));
        const cur = paidIn(now - range * DAY, now + DAY);
        const prev = paidIn(now - 2 * range * DAY, now - range * DAY);
        const sum = (xs: typeof cur) => xs.reduce((n, o) => n + o.grandTotal, 0);
        const revenue = sum(cur), prevRevenue = sum(prev);
        const placed = mine.filter((o) => inWindow(o, now - range * DAY, now + DAY)).length;
        const prevPlaced = mine.filter((o) => inWindow(o, now - 2 * range * DAY, now - range * DAY)).length;

        const byDay = new Map<string, Point>();
        for (let i = range - 1; i >= 0; i--) { const k = dayKey(now - i * DAY); byDay.set(k, { day: k, value: 0, orders: 0 }); }
        for (const o of cur) { const p = byDay.get(dayKey(placedTime(o))); if (p) { p.value += o.grandTotal; p.orders += 1; } }

        const units = new Map<string, { title: string; qty: number; revenue: number }>();
        for (const o of cur) for (const it of o.items) {
            const key = it.name ?? it.sku;
            const u = units.get(key) ?? { title: key, qty: 0, revenue: 0 };
            u.qty += it.quantity; u.revenue += it.totalPrice;
            units.set(key, u);
        }
        const statuses = STAGES.map((s) => ({ s, n: orders.filter((o) => stageOf(o) === s).length }));
        const owed = mine.filter((o) => stageOf(o) === "AWAITING_PAYMENT").reduce((n, o) => n + o.grandTotal, 0);
        return {
            revenue, placed, paid: cur.length, aov: cur.length ? revenue / cur.length : 0,
            dRevenue: pct(prevRevenue, revenue), dOrders: pct(prevPlaced, placed),
            dAov: pct(prev.length ? prevRevenue / prev.length : 0, cur.length ? revenue / cur.length : 0),
            points: [...byDay.values()], top: [...units.values()].sort((a, b) => b.qty - a.qty).slice(0, 5), statuses, owed,
        };
    }, [orders, range, currency]);

    const maxQty = Math.max(...d.top.map((t) => t.qty), 1);
    const total = orders.length || 1;
    const subtitle = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const activeLinks = links.filter((l) => l.active).length;

    return (
        <>
            <PageHead title="Overview" subtitle={subtitle}><RangePicker value={range} onChange={setPicked} /></PageHead>
            <DataNotices of={["orders"]} />
            {foreign > 0 && (
                <p className="m-0 mb-5 text-[12px] text-black/50">{foreign} {foreign === 1 ? "order is" : "orders are"} in another currency and left out of the {currency} figures.</p>
            )}

            {loading && !orders.length ? (
                <Card><Empty>Loading…</Empty></Card>
            ) : !orders.length ? (
                <Card>
                    <Empty>No orders yet. They appear here as customers check out.</Empty>
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat label="Revenue" value={formatMoney(d.revenue, currency)} icon={Icons.revenue} delta={d.dRevenue} hint="vs previous period" />
                        <Stat label="Orders" value={String(d.placed)} icon={Icons.bag} delta={d.dOrders} hint={`${d.paid} paid`} />
                        <Stat label="Average order" value={formatMoney(d.aov, currency)} icon={Icons.avg} delta={d.dAov} hint="paid orders" />
                        <Stat label="Active discounts" value={String(activeLinks)} icon={Icons.discounts} hint={`${links.length} links in total`} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.9fr_1fr]">
                        <Card title="Revenue" action={<button onClick={() => setTable((t) => !t)} className={linkBtn}>{table ? "View chart" : "View as table"}</button>}>
                            {table ? (
                                <div className="max-h-[250px] overflow-y-auto">
                                    <table className="w-full border-collapse"><tbody>
                                        {d.points.filter((p) => p.value).reverse().map((p) => (
                                            <tr key={p.day} className="border-b border-[var(--a-border-soft)] last:border-0"><Td className="px-0!">{fmtDate(`${p.day}T12:00:00`)}</Td><Td right>{p.orders} paid</Td><Td right className="pr-0!">{formatMoney(p.value, currency)}</Td></tr>
                                        ))}
                                    </tbody></table>
                                    {!d.points.some((p) => p.value) && <Empty>No paid orders in this period.</Empty>}
                                </div>
                            ) : <RevenueChart points={d.points} currency={currency} />}
                        </Card>

                        <Card title="Orders by status">
                            <div className="flex h-2.5 gap-0.5 overflow-hidden">
                                {d.statuses.filter((x) => x.n).map((x) => <div key={x.s} style={{ width: `${(x.n / total) * 100}%`, background: STAGE_COLOR[x.s] }} title={`${STAGE_LABEL[x.s]}: ${x.n}`} />)}
                            </div>
                            <ul className="m-0 mt-4 list-none space-y-2.5 p-0 text-[13px]">
                                {d.statuses.map((x) => (
                                    <li key={x.s} className="flex items-center justify-between">
                                        <span className="flex items-center gap-2"><span className="h-2 w-2" style={{ background: STAGE_COLOR[x.s] }} />{STAGE_LABEL[x.s]}</span>
                                        <span className="font-medium">{x.n}</span>
                                    </li>
                                ))}
                            </ul>
                            {view && view.awaitingFulfilmentCount > 0 && (
                                <p className="m-0 mt-4 border-t border-[var(--a-border-soft)] pt-3 text-[12.5px] text-black/55">
                                    {view.awaitingFulfilmentCount} paid {view.awaitingFulfilmentCount === 1 ? "order" : "orders"} to fulfil ({formatMoney(view.awaitingFulfilmentValue, view.currency ?? currency)}).
                                </p>
                            )}
                            {d.owed > 0 && (
                                <p className="m-0 mt-3 text-[12.5px] text-black/55">{formatMoney(d.owed, currency)} is waiting on payment. <Link to={`${ADMIN}/orders`} className={linkBtn}>Review</Link></p>
                            )}
                        </Card>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card title="Top products" action={<span className="text-[12px] text-black/40">Last {range} days</span>}>
                            {d.top.length ? (
                                <ul className="m-0 list-none space-y-4 p-0">
                                    {d.top.map((t) => (
                                        <li key={t.title}>
                                            <div className="flex items-baseline justify-between gap-3 text-[13px]"><span>{t.title}</span><span className="text-black/50">{t.qty} sold · <span className="text-black">{formatMoney(t.revenue, currency)}</span></span></div>
                                            <div className="mt-1.5 h-1.5 bg-black/5"><div className="h-full" style={{ width: `${(t.qty / maxQty) * 100}%`, background: BRAND }} /></div>
                                        </li>
                                    ))}
                                </ul>
                            ) : <Empty>No paid orders in this period.</Empty>}
                        </Card>
                        <Card title="Recent orders" flush action={<Link to={`${ADMIN}/orders`} className={linkBtn}>View all</Link>}>
                            <table className="w-full border-collapse">
                                <thead><tr><Th>Order</Th><Th>Date</Th><Th>Status</Th><Th right>Total</Th></tr></thead>
                                <tbody>{orders.slice(0, 6).map((o) => (
                                    <tr key={o.orderNumber} className="border-t border-[var(--a-border-soft)]"><Td className="font-medium">{o.orderNumber}</Td><Td>{fmtDate(o.placedAt)}</Td><Td><OrderBadge order={o} /></Td><Td right>{formatMoney(o.grandTotal, o.currency)}</Td></tr>
                                ))}</tbody>
                            </table>
                        </Card>
                    </div>
                </div>
            )}
        </>
    );
}
