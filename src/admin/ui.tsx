// global imports
import type { ReactNode } from "react";

// local imports
import type { SortState } from "./hooks";
import { stageOf } from "./model";
import type { OrderStage } from "./model";
import type { AdminOrder } from "./types";

/** Admin design tokens: thin borders, square corners, colour only where it means something. */
export const BRAND = "var(--a-accent)";
/** Full-width field. Use `inputBare` plus a width utility for a fixed-width one. */
export const inputCls = "a-input w-full";
export const inputBare = "a-input";
export const btn = "a-btn";
export const btnSolid = "a-btn-solid";
export const btnOk = "a-btn-ok";
export const btnDanger = "a-btn-danger";
export const linkBtn = "a-link";

export const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
export const fmtDateTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export const STAGE_LABEL: Record<OrderStage, string> = {
    AWAITING_PAYMENT: "Awaiting payment",
    AWAITING_FULFILMENT: "Awaiting fulfilment",
    SHIPPED: "Shipped",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
};
/** One colour per state, shared by pills, the status bar and its legend. */
export const STAGE_COLOR: Record<OrderStage, string> = {
    AWAITING_PAYMENT: "var(--a-st-pay)",
    AWAITING_FULFILMENT: "var(--a-st-ful)",
    SHIPPED: "var(--a-st-ship)",
    COMPLETED: "var(--a-st-done)",
    CANCELLED: "var(--a-st-can)",
    REFUNDED: "var(--a-st-ref)",
};

/** A soft tint of the state colour, so every theme gets matching fill, text and outline from one value. */
const tint = (c: string) => ({
    background: `color-mix(in srgb, ${c} 10%, white)`,
    color: `color-mix(in srgb, ${c} 62%, black)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c} 28%, white)`,
});
const pill = "inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 text-[11.5px] font-medium";
export const StatePill = ({ label, color }: { label: string; color: string }) => (
    <span className={pill} style={tint(color)}><span className="h-1.5 w-1.5" style={{ background: color }} />{label}</span>
);
export const StageBadge = ({ stage }: { stage: OrderStage }) => <StatePill label={STAGE_LABEL[stage]} color={STAGE_COLOR[stage]} />;

/** An order's pill: its stage, except an unpaid order whose payment failed says so rather than "Awaiting payment". */
export function OrderBadge({ order }: { order: AdminOrder }) {
    if (!order.paid && order.paymentStatus === "FAILED" && stageOf(order) === "AWAITING_PAYMENT") {
        return <StatePill label="Payment failed" color="var(--a-st-can)" />;
    }
    return <StageBadge stage={stageOf(order)} />;
}

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
    return (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="m-0 text-[22px] font-semibold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-1 text-[13px] text-black/50">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">{children}</div>
        </div>
    );
}

export function Card({ title, children, action, flush }: { title?: string; children: ReactNode; action?: ReactNode; flush?: boolean }) {
    return (
        <section className="overflow-hidden border border-[var(--a-border)] bg-white">
            {title && (
                <header className="flex items-center justify-between border-b border-[var(--a-border-soft)] px-5 py-3.5">
                    <h2 className="m-0 text-[13px] font-semibold">{title}</h2>
                    {action}
                </header>
            )}
            <div className={flush ? "" : "p-5"}>{children}</div>
        </section>
    );
}

export function Stat({ label, value, hint, icon, delta }: { label: string; value: string; hint?: string; icon?: ReactNode; delta?: number | null }) {
    return (
        <div className="border border-[var(--a-border)] bg-white p-5">
            <div className="flex items-center justify-between">
                <p className="m-0 text-[12.5px] text-black/55">{label}</p>
                {icon && <span className="grid h-8 w-8 place-items-center bg-[var(--a-accent)]/10 text-[var(--a-accent)]">{icon}</span>}
            </div>
            <p className="mb-0 mt-3 text-[26px] font-semibold leading-none tracking-tight">{value}</p>
            <div className="mt-3 flex items-center gap-2 text-[12px]">
                {delta != null && (
                    <span className="inline-flex items-center gap-0.5 font-medium" style={{ color: delta >= 0 ? "var(--a-up)" : "var(--a-down)" }}>
                        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
                    </span>
                )}
                {hint && <span className="text-black/45">{hint}</span>}
            </div>
        </div>
    );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "error" }) {
    const style = tone === "warn"
        ? { background: "var(--a-warn-bg)", borderColor: "var(--a-warn-border)", color: "var(--a-warn-ink)" }
        : tone === "error"
            ? { background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }
            : undefined;
    return (
        <p style={style} role={tone === "error" ? "alert" : undefined}
            className={`m-0 border px-4 py-3 text-[12.5px] leading-5 ${tone === "info" ? "border-[var(--a-border)] bg-[var(--a-subtle)] text-black/70" : ""}`}>
            {children}
        </p>
    );
}

export function Empty({ children }: { children: ReactNode }) {
    return <p className="m-0 py-12 text-center text-[13px] text-black/45">{children}</p>;
}

/** Underline tabs. `count` is optional and shown muted. */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; count?: number }[] }) {
    return (
        <div className="flex flex-wrap gap-x-6 border-b border-[var(--a-border)]">
            {items.map((t) => (
                <button key={t.id} onClick={() => onChange(t.id)} className={`a-tab ${t.id === value ? "is-active" : ""}`}>
                    {t.label}
                    {t.count != null && <span className={`ml-1.5 px-1.5 py-0.5 text-[11px] ${t.id === value ? "bg-[var(--a-accent)]/10" : "bg-black/5"}`}>{t.count}</span>}
                </button>
            ))}
        </div>
    );
}

export function Drawer({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35" onClick={onClose}>
            <aside onClick={(e) => e.stopPropagation()} className={`h-full w-full ${wide ? "max-w-3xl" : "max-w-lg"} overflow-y-auto bg-[var(--a-surface-alt)] p-7`}>
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="m-0 text-[17px] font-semibold">{title}</h2>
                    <button onClick={onClose} aria-label="Close" className="a-x">×</button>
                </div>
                {children}
            </aside>
        </div>
    );
}

export const Th = ({ children, right }: { children?: ReactNode; right?: boolean }) =>
    <th className={`bg-[var(--a-subtle)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-black/45 ${right ? "text-right" : "text-left"}`}>{children}</th>;
export const Td = ({ children, right, className = "" }: { children?: ReactNode; right?: boolean; className?: string }) =>
    <td className={`px-4 py-3 text-[13px] ${right ? "text-right" : ""} ${className}`}>{children}</td>;

/** 16px stroke icons, drawn inline so the admin carries no icon dependency. */
const ic = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const Icons = {
    overview: <svg {...ic}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>,
    orders: <svg {...ic}><path d="M6 3h12l2 4v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7l2-4z" /><path d="M4 7h16M9 11a3 3 0 006 0" /></svg>,
    products: <svg {...ic}><path d="M8 3l-5 3 2.5 4L8 9v12h8V9l2.5 1L21 6l-5-3a4 4 0 01-8 0z" /></svg>,
    customers: <svg {...ic}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c1.8.7 3.1 2.4 3.5 5.2" /></svg>,
    emails: <svg {...ic}><rect x="3" y="5" width="18" height="14" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>,
    discounts: <svg {...ic}><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>,
    settings: <svg {...ic}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></svg>,
    revenue: <svg {...ic}><path d="M12 2v20M17 6.5C16 5 14 4.5 12 4.5c-2.5 0-4.5 1.2-4.5 3s1.8 2.6 4.5 3 4.5 1.2 4.5 3-2 3-4.5 3c-2.2 0-4.2-.7-5.2-2.2" /></svg>,
    bag: <svg {...ic}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></svg>,
    avg: <svg {...ic}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>,
};

/** A column header that sorts when clicked. The arrow shows direction; a faint one marks sortable columns. */
export function SortTh({ label, k, sort, toggle, right }: { label: string; k: string; sort: SortState | null; toggle: (k: string) => void; right?: boolean }) {
    const active = sort?.key === k;
    return (
        <th aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"} className={`bg-[var(--a-subtle)] px-4 py-2.5 ${right ? "text-right" : "text-left"}`}>
            <button onClick={() => toggle(k)} className={`a-sort ${active ? "is-active" : ""}`}>
                {label}
                <span aria-hidden className={`text-[9px] ${active ? "" : "opacity-50"}`}>{active ? (sort!.dir === "asc" ? "▲" : "▼") : "↕"}</span>
            </button>
        </th>
    );
}

/** One labelled control in a filter row. */
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] text-black/50">{label}</span>
            {children}
        </label>
    );
}

/** "Showing 1–10 of 36", a page-size choice and numbered pages. Hidden when everything fits on one page of 10, unless `always`. */
export function Pagination({ p, always }: { p: { page: number; pages: number; size: number; total: number; setPage: (n: number) => void; setSize: (n: number) => void }; always?: boolean }) {
    if (p.total === 0 || (!always && p.total <= 10)) return null;
    const from = (p.page - 1) * p.size + 1, to = Math.min(p.total, p.page * p.size);
    const near = new Set([1, p.pages, p.page - 1, p.page, p.page + 1]);
    const nums = [...near].filter((n) => n >= 1 && n <= p.pages).sort((a, b) => a - b);
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--a-border-soft)] px-4 py-3 text-[12.5px] text-black/60">
            <div className="flex items-center gap-4">
                <span>Showing {from}–{to} of {p.total}</span>
                <label className="flex items-center gap-2">Rows
                    <select value={p.size} onChange={(e) => p.setSize(Number(e.target.value))} className="a-input px-2! py-1! text-[12.5px]!">
                        {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
            </div>
            <nav aria-label="Pagination" className="flex items-center gap-1">
                <button aria-label="Previous page" disabled={p.page === 1} onClick={() => p.setPage(p.page - 1)} className="a-pg">‹</button>
                {nums.map((n, i) => (
                    <span key={n} className="flex items-center gap-1">
                        {i > 0 && n - nums[i - 1] > 1 && <span className="px-1">…</span>}
                        <button aria-label={`Page ${n}`} aria-current={n === p.page ? "page" : undefined} onClick={() => p.setPage(n)} className={`a-pg ${n === p.page ? "is-current" : ""}`}>{n}</button>
                    </span>
                ))}
                <button aria-label="Next page" disabled={p.page === p.pages} onClick={() => p.setPage(p.page + 1)} className="a-pg">›</button>
            </nav>
        </div>
    );
}
