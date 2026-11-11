import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { money } from "@/data/catalog"
import { orderTotal } from "../email"
import { useAdmin } from "../store"
import { usePaged, useSort } from "../hooks"
import { Card, Empty, PageHead, Pagination, SortTh, Td, Th, fmtDate, inputCls } from "../ui"

/** Customers are derived from orders, one row per email address. */
export function Customers() {
    const orders = useAdmin((s) => s.orders);
    const [q, setQ] = useState("");

    const rows = useMemo(() => {
        const m = new Map<string, { name: string; email: string; phone: string; orders: number; spent: number; last: string }>();
        for (const o of orders) {
            const key = o.customer.email.toLowerCase();
            const c = m.get(key) ?? { name: o.customer.name, email: o.customer.email, phone: o.customer.phone, orders: 0, spent: 0, last: o.placedAt };
            c.orders += 1;
            if (o.paidAt && o.status !== "CANCELLED") c.spent += orderTotal(o);
            if (o.placedAt > c.last) c.last = o.placedAt;
            m.set(key, c);
        }
        return [...m.values()].sort((a, b) => b.spent - a.spent);
    }, [orders]);

    const shown = useMemo(() => rows.filter((c) => !q.trim() || `${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
    const { sorted, sort, toggle } = useSort(shown, { name: (c) => c.name, orders: (c) => c.orders, spent: (c) => c.spent, last: (c) => c.last });
    const paged = usePaged(sorted, JSON.stringify([q, sort]));

    return (
        <>
            <PageHead title="Customers"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers" className={`${inputCls} w-[220px]`} /></PageHead>
            <Card flush>
                {sorted.length ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                                <thead><tr><SortTh label="Customer" k="name" sort={sort} toggle={toggle} /><Th>Phone</Th><SortTh label="Orders" k="orders" sort={sort} toggle={toggle} right /><SortTh label="Spent" k="spent" sort={sort} toggle={toggle} right /><SortTh label="Last order" k="last" sort={sort} toggle={toggle} /><Th /></tr></thead>
                                <tbody>{paged.rows.map((c) => (
                                    <tr key={c.email} className="border-t border-[var(--a-border-soft)]">
                                        <Td>{c.name}<span className="block text-[12px] text-black/50">{c.email}</span></Td>
                                        <Td>{c.phone || "—"}</Td><Td right>{c.orders}</Td><Td right>{money(c.spent)}</Td><Td>{fmtDate(c.last)}</Td>
                                        <Td right><Link to={`/admin/emails?tab=compose&to=${encodeURIComponent(c.email)}&name=${encodeURIComponent(c.name)}`} className="text-[12.5px] font-medium text-[var(--a-accent)] hover:underline">Email</Link></Td>
                                    </tr>))}</tbody>
                            </table>
                        </div>
                        <Pagination p={paged} />
                    </>
                ) : <Empty>{orders.length ? "No customers match." : "Customers appear here once there are orders."}</Empty>}
            </Card>
        </>
    );
}
