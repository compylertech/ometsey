import { STORE } from "@/data/catalog"
import { DEFAULT_RATE, formatMoney } from "@/lib/money"
import { useCatalog } from "@/store/catalog"
import { useMarket } from "@/store/market"
import { useAdmin } from "../store"
import { THEMES, useAdminTheme } from "../theme"
import { Card, PageHead, btn, btnSolid } from "../ui"

export function Settings() {
    const s = useAdmin();
    const { theme, setTheme } = useAdminTheme();
    const { rate, setRate } = useMarket();
    const sample = s.orders.some((o) => o.sample) || s.discounts.some((d) => d.sample);

    const exportData = () => {
        const { orders, discounts, templates, automations, queue } = s;
        const { added, edited, removed } = useCatalog.getState();
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), orders, discounts, templates, automations, queue, catalog: { added, edited, removed } }, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `ometsey-admin-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <>
            <PageHead title="Settings" />
            <div className="grid max-w-3xl gap-6">
                <Card title="Appearance">
                    <p className="mb-4 text-[13px] text-black/60">Choose how the admin looks. This only changes the admin, not the storefront.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {THEMES.map((t) => (
                            <button key={t.id} onClick={() => setTheme(t.id)} aria-pressed={theme === t.id}
                                className={`flex items-center gap-4  border p-4 text-left transition ${theme === t.id ? "border-[var(--a-accent)] ring-1 ring-[var(--a-accent)]" : "border-[var(--a-border)] hover:border-black/30"}`}>
                                <span className="flex h-12 w-16 shrink-0 overflow-hidden border border-black/10" aria-hidden>
                                    <span className="w-5" style={{ background: t.id === "mono" ? "#0a0a0a" : "#1b1410" }} />
                                    <span className="flex flex-1 flex-col justify-center gap-1 px-1.5" style={{ background: t.id === "mono" ? "#f6f6f6" : "#f5f2ea" }}>
                                        <span className="h-1.5 w-full " style={{ background: t.id === "mono" ? "#000" : "#76410f" }} />
                                        <span className="h-1 w-2/3 bg-black/15" />
                                    </span>
                                </span>
                                <span>
                                    <span className="block text-[13px] font-medium">{t.label}{theme === t.id && <span className="ml-2 text-[11px] font-normal text-black/45">Current</span>}</span>
                                    <span className="mt-0.5 block text-[12px] text-black/50">{t.note}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </Card>
                <Card title="Currency and prices">
                    <p className="mb-4 text-[13px] leading-6 text-black/60">
                        Customers in Ghana see cedi prices; everyone else sees dollars. They can switch with the currency selector. A product with a US price set on it uses that; the rest are converted from the cedi price at this rate and rounded to a whole dollar.
                    </p>
                    <div className="flex flex-wrap items-end gap-4">
                        <label className="block">
                            <span className="mb-1 block text-[11px] text-black/50">Cedis per US dollar</span>
                            <input type="number" min={0.01} step={0.01} value={rate} onChange={(e) => { const v = Number(e.target.value); if (v > 0) setRate(v); }} className="w-[140px] border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--a-accent)]" />
                        </label>
                        <p className="pb-2 text-[12.5px] text-black/55">Example: {formatMoney(1500, "GHS")} → {formatMoney(Math.max(1, Math.round(1500 / rate)), "USD")}</p>
                        {rate !== DEFAULT_RATE && <button className="pb-2 text-[12.5px] font-medium text-[var(--a-accent)] hover:underline" onClick={() => setRate(DEFAULT_RATE)}>Reset to {DEFAULT_RATE}</button>}
                    </div>
                    <p className="mt-4 text-[11.5px] text-black/40">The starting rate of {DEFAULT_RATE} is a placeholder, so set the real one. Like the rest of the admin, it applies in this browser until the backend is connected. The admin itself always works in cedis.</p>
                </Card>
                <Card title="Where this data lives">
                    <p className="text-[13px] leading-6 text-black/70">
                        Orders, discounts, templates and the email queue are saved in <strong>this browser only</strong>. Clearing site data or using another device starts empty, so export a copy before you do. When the Ometsey backend is ready, the data layer in <code>src/admin/store.ts</code> is the one file that changes.
                    </p>
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                        <div><dt className="text-black/50">Orders</dt><dd>{s.orders.length}</dd></div>
                        <div><dt className="text-black/50">Discounts</dt><dd>{s.discounts.length}</dd></div>
                        <div><dt className="text-black/50">Templates</dt><dd>{s.templates.length}</dd></div>
                        <div><dt className="text-black/50">Queued emails</dt><dd>{s.queue.length}</dd></div>
                    </dl>
                </Card>
                <Card title="Sample data">
                    <p className="mb-4 text-[13px] text-black/70">Demo orders and discounts so you can see the dashboard populated. They’re labelled SAMPLE and removed without touching anything real.</p>
                    {sample ? <button className={btn} onClick={s.clearSample}>Remove sample data</button> : <button className={btn} onClick={s.loadSample}>Load sample data</button>}
                </Card>
                <Card title="Backup and reset">
                    <div className="flex flex-wrap gap-3">
                        <button className={btnSolid} onClick={exportData}>Export JSON</button>
                        <button className={btn} onClick={() => { if (confirm("Delete all orders, discounts and emails, undo product changes, and restore the default templates?")) { s.resetAll(); useCatalog.getState().reset(); } }}>Reset everything</button>
                    </div>
                </Card>
                <Card title="Store">
                    <p className="text-[13px] leading-6 text-black/70">{STORE.address}<br />{STORE.phone} · {STORE.email}</p>
                </Card>
            </div>
        </>
    );
}
