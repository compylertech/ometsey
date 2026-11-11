import type { ReactNode } from "react"
import type { SortState } from "./hooks"
import type { EmailStatus, OrderStatus } from "./types"

/** Admin design tokens. Warm neutrals and the Ometsey brown, kept quiet so the data leads. */
export const BRAND = "var(--a-accent)";
export const inputCls = "w-full border border-black/15 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-[var(--a-accent)]";
export const btn = "border border-black/15 bg-white px-3.5 py-2 text-[12.5px] font-medium transition hover:border-black/40 disabled:cursor-not-allowed disabled:opacity-40";
export const btnSolid = "bg-[var(--a-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white transition hover:bg-[var(--a-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40";
export const linkBtn = "text-[12.5px] font-medium text-[var(--a-accent)] hover:underline";

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const ORDER_LABEL: Record<OrderStatus, string> = {
    AWAITING_PAYMENT: "Awaiting payment",
    AWAITING_FULFILMENT: "Awaiting fulfilment",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};
/** One colour per state, shared by pills, the status bar and its legend. The theme decides what they look like. */
export const ORDER_COLOR: Record<OrderStatus, string> = {
    AWAITING_PAYMENT: "var(--a-st-pay)",
    AWAITING_FULFILMENT: "var(--a-st-ful)",
    COMPLETED: "var(--a-st-done)",
    CANCELLED: "var(--a-st-can)",
};
const EMAIL_COLOR: Record<EmailStatus, string> = { QUEUED: "var(--a-st-pay)", DRAFTED: "var(--a-st-ful)", SENT: "var(--a-st-done)" };
export const EMAIL_LABEL: Record<EmailStatus, string> = { QUEUED: "Queued", DRAFTED: "Drafted", SENT: "Sent" };

/** A soft tint of the state colour, so every theme gets matching fill, text and outline from one value. */
const tint = (c: string) => ({
    background: `color-mix(in srgb, ${c} 10%, white)`,
    color: `color-mix(in srgb, ${c} 62%, black)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c} 28%, white)`,
});
const pill = "inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 text-[11.5px] font-medium";
const Dot = ({ color }: { color: string }) => <span className="h-1.5 w-1.5 " style={{ background: color }} />;
export const OrderBadge = ({ status }: { status: OrderStatus }) => <span className={pill} style={tint(ORDER_COLOR[status])}><Dot color={ORDER_COLOR[status]} />{ORDER_LABEL[status]}</span>;
export const EmailBadge = ({ status }: { status: EmailStatus }) => <span className={pill} style={tint(EMAIL_COLOR[status])}><Dot color={EMAIL_COLOR[status]} />{EMAIL_LABEL[status]}</span>;

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
    return (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-1 text-[13px] text-black/50">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">{children}</div>
        </div>
    );
}

export function Card({ title, children, action, flush }: { title?: string; children: ReactNode; action?: ReactNode; flush?: boolean }) {
    return (
        <section className="overflow-hidden border border-[var(--a-border)] bg-white ">
            {title && (
                <header className="flex items-center justify-between border-b border-[var(--a-border-soft)] px-5 py-3.5">
                    <h2 className="text-[13px] font-semibold">{title}</h2>
                    {action}
                </header>
            )}
            <div className={flush ? "" : "p-5"}>{children}</div>
        </section>
    );
}

export function Stat({ label, value, hint, icon, delta }: { label: string; value: string; hint?: string; icon?: ReactNode; delta?: number | null }) {
    return (
        <div className=" border border-[var(--a-border)] bg-white p-5 ">
            <div className="flex items-center justify-between">
                <p className="text-[12.5px] text-black/55">{label}</p>
                {icon && <span className="grid h-8 w-8 place-items-center bg-[var(--a-accent)]/10 text-[var(--a-accent)]">{icon}</span>}
            </div>
            <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight">{value}</p>
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

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
    const style = tone === "warn" ? { background: "var(--a-warn-bg)", borderColor: "var(--a-warn-border)", color: "var(--a-warn-ink)" } : undefined;
    return <p style={style} className={` border px-4 py-3 text-[12.5px] leading-5 ${tone === "warn" ? "" : "border-[var(--a-border)] bg-[var(--a-subtle)] text-black/70"}`}>{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
    return <p className="py-12 text-center text-[13px] text-black/45">{children}</p>;
}

/** Underline tabs. `count` is optional and shown muted. */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; count?: number }[] }) {
    return (
        <div className="flex flex-wrap gap-x-6 border-b border-[var(--a-border)]">
            {items.map((t) => (
                <button key={t.id} onClick={() => onChange(t.id)}
                    className={`-mb-px border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition ${t.id === value ? "border-[var(--a-accent)] text-[var(--a-accent)]" : "border-transparent text-black/50 hover:text-black"}`}>
                    {t.label}{t.count != null && <span className={`ml-1.5  px-1.5 py-0.5 text-[11px] ${t.id === value ? "bg-[var(--a-accent)]/10" : "bg-black/5"}`}>{t.count}</span>}
                </button>
            ))}
        </div>
    );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35 " onClick={onClose}>
            <aside onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-lg overflow-y-auto bg-[var(--a-surface-alt)] p-7 ">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-[17px] font-semibold">{title}</h2>
                    <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center text-xl leading-none hover:bg-black/5">×</button>
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
    overview: <svg {...ic}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
    orders: <svg {...ic}><path d="M6 3h12l2 4v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7l2-4z" /><path d="M4 7h16M9 11a3 3 0 006 0" /></svg>,
    products: <svg {...ic}><path d="M8 3l-5 3 2.5 4L8 9v12h8V9l2.5 1L21 6l-5-3a4 4 0 01-8 0z" /></svg>,
    customers: <svg {...ic}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c1.8.7 3.1 2.4 3.5 5.2" /></svg>,
    emails: <svg {...ic}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>,
    discounts: <svg {...ic}><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>,
    settings: <svg {...ic}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>,
    revenue: <svg {...ic}><path d="M12 2v20M17 6.5C16 5 14 4.5 12 4.5c-2.5 0-4.5 1.2-4.5 3s1.8 2.6 4.5 3 4.5 1.2 4.5 3-2 3-4.5 3c-2.2 0-4.2-.7-5.2-2.2" /></svg>,
    bag: <svg {...ic}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></svg>,
    avg: <svg {...ic}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>,
};

/** A column header that sorts when clicked. The arrow shows direction; a faint one marks sortable columns. */
export function SortTh({ label, k, sort, toggle, right }: { label: string; k: string; sort: SortState | null; toggle: (k: string) => void; right?: boolean }) {
    const active = sort?.key === k;
    return (
        <th aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"} className={`bg-[var(--a-subtle)] px-4 py-2.5 ${right ? "text-right" : "text-left"}`}>
            <button onClick={() => toggle(k)} className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ${active ? "text-black" : "text-black/45 hover:text-black"}`}>
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

/** "Showing 1–10 of 36", a page-size choice and numbered pages. Hidden when everything fits on one page of 10. */
export function Pagination({ p }: { p: { page: number; pages: number; size: number; total: number; setPage: (n: number) => void; setSize: (n: number) => void } }) {
    if (p.total <= 10) return null;
    const from = (p.page - 1) * p.size + 1, to = Math.min(p.total, p.page * p.size);
    const window = new Set([1, p.pages, p.page - 1, p.page, p.page + 1]);
    const nums = [...window].filter((n) => n >= 1 && n <= p.pages).sort((a, b) => a - b);
    const cell = "grid h-8 min-w-8 place-items-center border px-2 text-[12.5px] transition";
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--a-border-soft)] px-4 py-3 text-[12.5px] text-black/60">
            <div className="flex items-center gap-4">
                <span>Showing {from}–{to} of {p.total}</span>
                <label className="flex items-center gap-2">Rows
                    <select value={p.size} onChange={(e) => p.setSize(Number(e.target.value))} className="border border-black/15 bg-white px-2 py-1 text-[12.5px] outline-none focus:border-[var(--a-accent)]">
                        {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
            </div>
            <nav aria-label="Pagination" className="flex items-center gap-1">
                <button aria-label="Previous page" disabled={p.page === 1} onClick={() => p.setPage(p.page - 1)} className={`${cell} border-black/15 disabled:opacity-30`}>‹</button>
                {nums.map((n, i) => (
                    <span key={n} className="flex items-center gap-1">
                        {i > 0 && n - nums[i - 1] > 1 && <span className="px-1">…</span>}
                        <button aria-label={`Page ${n}`} aria-current={n === p.page ? "page" : undefined} onClick={() => p.setPage(n)}
                            className={`${cell} ${n === p.page ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white" : "border-black/15 text-black hover:border-black/40"}`}>{n}</button>
                    </span>
                ))}
                <button aria-label="Next page" disabled={p.page === p.pages} onClick={() => p.setPage(p.page + 1)} className={`${cell} border-black/15 disabled:opacity-30`}>›</button>
            </nav>
        </div>
    );
}
