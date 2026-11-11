// local imports
import { API_BASE_URL, TENANT_ID } from "../api";
import { useAdminData } from "../data";
import { csvOf } from "../model";
import { THEMES, useAdminTheme } from "../theme";
import type { AdminTheme } from "../theme";
import { Card, Notice, PageHead, btn, fmtDateTime } from "../ui";
import type { AdminSession } from "../types";

/** A miniature of the admin in each theme, so the choice is visible before it's made. */
function Swatch({ id }: { id: AdminTheme }) {
    return (
        <div className="admin pointer-events-none flex h-20 overflow-hidden border border-[var(--a-border)]" data-admin-theme={id} aria-hidden>
            <div className="w-1/4 bg-[var(--a-side)]"><div className="m-2 h-1.5 w-1/2 bg-[var(--a-side-accent)]" /></div>
            <div className="flex-1 bg-[var(--a-bg)] p-2"><div className="h-2 w-1/3 bg-[var(--a-accent)]" /><div className="mt-2 h-8 border border-[var(--a-border)] bg-white" /></div>
        </div>
    );
}

function save(name: string, type: string, body: string) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

export function Settings({ session, onSignOut }: { session: AdminSession; onSignOut: () => void }) {
    const { theme, setTheme } = useAdminTheme();
    const { orders, products, links, loadedAt, loading, refresh } = useAdminData();
    const day = new Date().toISOString().slice(0, 10);

    return (
        <>
            <PageHead title="Settings" />
            <div className="max-w-[760px] space-y-6">
                <Card title="Appearance">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {THEMES.map((t) => (
                            <button key={t.id} aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}
                                className={`block ${theme === t.id ? "border-2 border-[var(--a-accent)] p-[11px]" : "border border-[var(--a-border)] p-3"}`}>
                                <Swatch id={t.id} />
                                <span className="mt-3 block text-[13px] font-medium">{t.label}</span>
                                <span className="block text-[12px] text-black/50">{t.note}</span>
                            </button>
                        ))}
                    </div>
                </Card>

                <Card title="Data">
                    <p className="m-0 text-black/70">
                        Everything here is live from the project-x backend ({API_BASE_URL}, tenant <b>{TENANT_ID}</b>). Nothing is stored in this browser except your theme, sidebar state and sign-in for this tab.
                    </p>
                    <p className="m-0 mt-3 text-black/60">
                        {orders.length} orders · {products.length} products · {links.length} discount links
                        {loadedAt && <> · loaded {fmtDateTime(new Date(loadedAt).toISOString())}</>}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button className={btn} onClick={refresh} disabled={loading}>{loading ? "Refreshing..." : "Refresh data"}</button>
                        <button className={btn} disabled={!orders.length} onClick={() => save(`ometsey-orders-${day}.csv`, "text/csv", csvOf(orders))}>Export orders (CSV)</button>
                        <button className={btn} onClick={() => save(`ometsey-admin-${day}.json`, "application/json", JSON.stringify({ orders, products, discountLinks: links }, null, 2))}>Export all (JSON)</button>
                    </div>
                </Card>

                <Card title="Account">
                    <p className="m-0 text-black/70">Signed in as <b>{session.name}</b> ({session.email}). Your session ends when this tab closes.</p>
                    <div className="mt-4"><button className={btn} onClick={onSignOut}>Sign out</button></div>
                </Card>

                <Notice>Not available yet, because the backend has no endpoints for them: editing products, changing order status or entering orders by hand, refunds, editable email templates and automations, discount expiry or deletion, and user roles.</Notice>
            </div>
        </>
    );
}
