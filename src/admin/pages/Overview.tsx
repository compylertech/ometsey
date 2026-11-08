import { useId, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { money } from "@/data/catalog"
import { orderTotal } from "../email"
import { useAdmin } from "../store"
import type { OrderStatus } from "../types"
import { BRAND, Card, Empty, Icons, Notice, ORDER_COLOR, ORDER_LABEL, OrderBadge, PageHead, Stat, Td, Th, btn, fmtDate, linkBtn } from "../ui"

const RANGES = [7, 30, 90] as const;
const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const pct = (prev: number, cur: number) => (prev === 0 ? null : ((cur - prev) / prev) * 100);
const compact = (v: number) => (v >= 1000 ? `₵${+(v / 1000).toFixed(1)}k` : `₵${v}`);

/** Round a maximum up to a 1/2/5 step so the axis ticks land on tidy numbers. */
function niceCeil(max: number) {
    if (max <= 0) return 100;
    const exp = 10 ** Math.floor(Math.log10(max));
    const f = max / exp;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

interface Point { day: string; value: number; orders: number }

/** One series, one colour: a line over a soft fill, recessive grid, hover crosshair with a tooltip. */
function RevenueChart({ points }: { points: Point[] }) {
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
                        <text x={L - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill="#000" fillOpacity="0.45">{compact(t)}</text>
                    </g>
                ))}
                <path d={area} fill={`url(#${gid})`} />
                <path d={line} fill="none" stroke={BRAND} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {labelIdx.map((i) => (
                    <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10.5" fill="#000" fillOpacity="0.45">
                        {new Date(points[i].day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
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
                <div className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap border border-[var(--a-border)] bg-white px-3 py-2 text-[12px] "
                    style={{ left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%` }}>
                    <p className="text-black/50">{fmtDate(hp.day)}</p>
                    <p className="mt-0.5 text-[14px] font-semibold">{money(hp.value)}</p>
                    <p className="text-black/50">{hp.orders} paid {hp.orders === 1 ? "order" : "orders"}</p>
                </div>
            )}
        </div>
    );
}

function RangePicker({ value, onChange }: { value: number; onChange: (n: (typeof RANGES)[number]) => void }) {
    return (
        <div className="inline-flex border border-[var(--a-border)] bg-white p-0.5 ">
            {RANGES.map((r) => (
                <button key={r} onClick={() => onChange(r)} className={` px-3 py-1.5 text-[12.5px] font-medium transition ${r === value ? "bg-[var(--a-accent)] text-white" : "text-black/60 hover:text-black"}`}>{r} days</button>
            ))}
        </div>
    );
}

export function Overview() {
    const { orders, discounts, loadSample } = useAdmin();
    const [range, setRange] = useState<(typeof RANGES)[number]>(30);
    const [table, setTable] = useState(false);

    const d = useMemo(() => {
        const now = Date.now();
        const inWindow = (o: { placedAt: string }, from: number, to: number) => { const t = new Date(o.placedAt).getTime(); return t >= from && t < to; };
        const paidIn = (from: number, to: number) => orders.filter((o) => o.paidAt && o.status !== "CANCELLED" && inWindow(o, from, to));
        const cur = paidIn(now - range * DAY, now + DAY);
        const prev = paidIn(now - 2 * range * DAY, now - range * DAY);
        const sum = (xs: typeof cur) => xs.reduce((n, o) => n + orderTotal(o), 0);
        const revenue = sum(cur), prevRevenue = sum(prev);
        const placed = orders.filter((o) => inWindow(o, now - range * DAY, now + DAY)).length;
        const prevPlaced = orders.filter((o) => inWindow(o, now - 2 * range * DAY, now - range * DAY)).length;

        const byDay = new Map<string, Point>();
        for (let i = range - 1; i >= 0; i--) { const k = dayKey(new Date(now - i * DAY)); byDay.set(k, { day: k, value: 0, orders: 0 }); }
        for (const o of cur) { const p = byDay.get(dayKey(new Date(o.paidAt!))); if (p) { p.value += orderTotal(o); p.orders += 1; } }

        const units = new Map<string, { title: string; qty: number; revenue: number }>();
        for (const o of cur) for (const it of o.items) {
            const u = units.get(it.handle) ?? { title: it.title, qty: 0, revenue: 0 };
            u.qty += it.qty; u.revenue += it.price * it.qty;
            units.set(it.handle, u);
        }
        const statuses = (Object.keys(ORDER_LABEL) as OrderStatus[]).map((s) => ({ s, n: orders.filter((o) => o.status === s).length }));
        const owed = orders.filter((o) => o.status === "AWAITING_PAYMENT").reduce((n, o) => n + orderTotal(o), 0);
        return {
            revenue, placed, paid: cur.length, aov: cur.length ? revenue / cur.length : 0,
            dRevenue: pct(prevRevenue, revenue), dOrders: pct(prevPlaced, placed),
            dAov: pct(prev.length ? prevRevenue / prev.length : 0, cur.length ? revenue / cur.length : 0),
            points: [...byDay.values()], top: [...units.values()].sort((a, b) => b.qty - a.qty).slice(0, 5), statuses, owed,
        };
    }, [orders, range]);

    const hasSample = orders.some((o) => o.sample);
    const maxQty = Math.max(...d.top.map((t) => t.qty), 1);
    const total = orders.length || 1;
    const subtitle = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

    return (
        <>
            <PageHead title="Overview" subtitle={subtitle}><RangePicker value={range} onChange={setRange} /></PageHead>
            {hasSample && <div className="mb-6"><Notice tone="warn">You’re looking at sample data. Remove it any time from Settings.</Notice></div>}

            {!orders.length ? (
                <Card>
                    <Empty>No orders yet. Add one from Orders, or load sample data to see how the dashboard looks.</Empty>
                    <div className="flex justify-center gap-3 pb-4">
                        <Link to="/admin/orders" className={btn}>Go to orders</Link>
                        <button onClick={loadSample} className={btn}>Load sample data</button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat label="Revenue" value={money(d.revenue)} icon={Icons.revenue} delta={d.dRevenue} hint="vs previous period" />
                        <Stat label="Orders" value={String(d.placed)} icon={Icons.bag} delta={d.dOrders} hint={`${d.paid} paid`} />
                        <Stat label="Average order" value={money(d.aov)} icon={Icons.avg} delta={d.dAov} hint="paid orders" />
                        <Stat label="Active discounts" value={String(discounts.filter((x) => x.active).length)} icon={Icons.discounts} hint={`${discounts.length} links in total`} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.9fr_1fr]">
                        <Card title="Revenue" action={<button onClick={() => setTable((t) => !t)} className={linkBtn}>{table ? "View chart" : "View as table"}</button>}>
                            {table ? (
                                <div className="max-h-[250px] overflow-y-auto">
                                    <table className="w-full"><tbody>
                                        {d.points.filter((p) => p.value).reverse().map((p) => (
                                            <tr key={p.day} className="border-b border-[var(--a-border-soft)] last:border-0"><Td className="px-0">{fmtDate(p.day)}</Td><Td right>{p.orders} paid</Td><Td right className="pr-0">{money(p.value)}</Td></tr>
                                        ))}
                                    </tbody></table>
                                    {!d.points.some((p) => p.value) && <Empty>No paid orders in this period.</Empty>}
                                </div>
                            ) : <RevenueChart points={d.points} />}
                        </Card>

                        <div className="space-y-6">
                            <Card title="Orders by status">
                                <div className="flex h-2.5 gap-0.5 overflow-hidden ">
                                    {d.statuses.filter((x) => x.n).map((x) => <div key={x.s} style={{ width: `${(x.n / total) * 100}%`, background: ORDER_COLOR[x.s] }} title={`${ORDER_LABEL[x.s]}: ${x.n}`} />)}
                                </div>
                                <ul className="mt-4 space-y-2.5 text-[13px]">
                                    {d.statuses.map((x) => (
                                        <li key={x.s} className="flex items-center justify-between">
                                            <span className="flex items-center gap-2"><span className="h-2 w-2 " style={{ background: ORDER_COLOR[x.s] }} />{ORDER_LABEL[x.s]}</span>
                                            <span className="font-medium">{x.n}</span>
                                        </li>
                                    ))}
                                </ul>
                                {d.owed > 0 && <p className="mt-4 border-t border-[var(--a-border-soft)] pt-3 text-[12.5px] text-black/55">{money(d.owed)} is waiting on payment. <Link to="/admin/orders" className={linkBtn}>Review</Link></p>}
                            </Card>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card title="Top products" action={<span className="text-[12px] text-black/40">Last {range} days</span>}>
                            {d.top.length ? (
                                <ul className="space-y-4">
                                    {d.top.map((t) => (
                                        <li key={t.title}>
                                            <div className="flex items-baseline justify-between text-[13px]"><span>{t.title}</span><span className="text-black/50">{t.qty} sold · <span className="text-black">{money(t.revenue)}</span></span></div>
                                            <div className="mt-1.5 h-1.5 bg-black/5"><div className="h-full " style={{ width: `${(t.qty / maxQty) * 100}%`, background: BRAND }} /></div>
                                        </li>
                                    ))}
                                </ul>
                            ) : <Empty>No paid orders in this period.</Empty>}
                        </Card>
                        <Card title="Recent orders" flush action={<Link to="/admin/orders" className={linkBtn}>View all</Link>}>
                            <table className="w-full">
                                <thead><tr><Th>Order</Th><Th>Date</Th><Th>Status</Th><Th right>Total</Th></tr></thead>
                                <tbody>{orders.slice(0, 6).map((o) => (
                                    <tr key={o.id} className="border-t border-[var(--a-border-soft)]"><Td className="font-medium">{o.number}</Td><Td>{fmtDate(o.placedAt)}</Td><Td><OrderBadge status={o.status} /></Td><Td right>{money(orderTotal(o))}</Td></tr>
                                ))}</tbody>
                            </table>
                        </Card>
                    </div>
                </div>
            )}
        </>
    );
}
