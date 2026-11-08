import { useEffect, useState, type FormEvent } from "react"
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom"
import { Overview } from "./pages/Overview"
import { Orders } from "./pages/Orders"
import { Products } from "./pages/Products"
import { Customers } from "./pages/Customers"
import { Emails } from "./pages/Emails"
import { Discounts } from "./pages/Discounts"
import { Settings } from "./pages/Settings"
import { useAdminLayout, useAdminTheme } from "./theme"
import { Icons, btnSolid, inputCls } from "./ui"

const PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE as string | undefined;
const SESSION_KEY = "ometsey-admin-session";

const NAV = [
    { to: "/admin", label: "Overview", end: true, icon: Icons.overview },
    { to: "/admin/orders", label: "Orders", icon: Icons.orders },
    { to: "/admin/products", label: "Products", icon: Icons.products },
    { to: "/admin/customers", label: "Customers", icon: Icons.customers },
    { to: "/admin/emails", label: "Emails", icon: Icons.emails },
    { to: "/admin/discounts", label: "Discounts", icon: Icons.discounts },
    { to: "/admin/settings", label: "Settings", icon: Icons.settings },
];

const unlocked = () => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
};

/**
 * A client-side gate only: the passcode ships in the bundle, so it keeps casual visitors out but is not
 * real security. Real authentication arrives with the backend. With no passcode set the admin is open
 * in development and disabled in a production build.
 */
function Gate({ children }: { children: React.ReactNode }) {
    const [ok, setOk] = useState(() => (PASSCODE ? unlocked() : import.meta.env.DEV));
    const [value, setValue] = useState("");
    const [bad, setBad] = useState(false);

    if (ok) return <>{children}</>;
    if (!PASSCODE) {
        return <div className="grid min-h-screen place-items-center bg-[var(--a-bg)] px-6 text-center text-[13px] text-black/60">The admin is disabled. Set VITE_ADMIN_PASSCODE to enable it.</div>;
    }
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (value === PASSCODE) {
            try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* the gate just asks again next load */ }
            setOk(true);
        } else setBad(true);
    };
    return (
        <div className="grid min-h-screen place-items-center bg-[var(--a-side)] px-6">
            <form onSubmit={submit} className="w-full max-w-sm space-y-4 bg-[var(--a-surface-alt)] p-8 ">
                <img src="/images/brand/logo.png" alt="Ometsey" className="mx-auto h-12 w-auto" style={{ filter: "var(--a-logo-on-light)" }} />
                <p className="text-center text-[13px] text-black/55">Enter the admin passcode</p>
                <input autoFocus type="password" value={value} onChange={(e) => { setValue(e.target.value); setBad(false); }} placeholder="Passcode" className={inputCls} />
                {bad && <p className="text-[12px] text-red-700">That passcode isn’t right.</p>}
                <button className={`${btnSolid} w-full py-2.5`}>Enter</button>
            </form>
        </div>
    );
}

export function AdminApp() {
    useEffect(() => {
        document.title = "Ometsey Admin";
        const meta = document.createElement("meta");
        meta.name = "robots";
        meta.content = "noindex";
        document.head.appendChild(meta);
        return () => { meta.remove(); document.title = "Ometsey"; };
    }, []);

    const theme = useAdminTheme((t) => t.theme);
    const { collapsed, toggle } = useAdminLayout();
    // Labels hide only on desktop: the mobile top bar always shows them.
    const hide = collapsed ? "md:hidden" : "";
    return (
        <div className="admin" data-admin-theme={theme}>
        <Gate>
            <div className={`min-h-screen bg-[var(--a-bg)] md:grid md:transition-[grid-template-columns] md:duration-200 ${collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[236px_1fr]"}`}>
                <aside className="bg-[var(--a-side)] text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-hidden">
                    <div className={`flex items-center justify-between px-5 pt-5 md:block md:pt-7 ${collapsed ? "md:flex md:justify-center md:px-0" : ""}`}>
                        <Link to="/admin" aria-label="Ometsey Admin">
                            <img src="/images/brand/logo.png" alt="Ometsey" className={`h-10 w-auto md:h-11 ${hide}`} style={{ filter: "var(--a-logo-on-dark)" }} />
                            {collapsed && (
                                <span className="hidden h-9 w-9 overflow-hidden md:block">
                                    <img src="/images/brand/logo.png" alt="Ometsey" className="h-9 max-w-none" style={{ filter: "var(--a-logo-on-dark)" }} />
                                </span>
                            )}
                        </Link>
                        <p className={`text-[11px] uppercase tracking-[0.2em] text-white/40 md:mt-3 ${hide}`}>Admin</p>
                    </div>
                    <nav className="flex gap-1 overflow-x-auto px-3 py-4 md:mt-4 md:flex-1 md:flex-col md:overflow-x-visible md:px-3">
                        {NAV.map((n) => (
                            <NavLink key={n.to} to={n.to} end={n.end} title={collapsed ? n.label : undefined} aria-label={n.label}
                                className={({ isActive }) => `flex shrink-0 items-center gap-3 whitespace-nowrap px-3 py-2.5 text-[13px] transition ${collapsed ? "md:justify-center md:px-0" : ""} ${isActive ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                                {({ isActive }) => (<><span className={isActive ? "text-[var(--a-side-accent)]" : ""}>{n.icon}</span><span className={hide}>{n.label}</span></>)}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="hidden border-t border-white/10 md:block">
                        <div className={`p-5 ${collapsed ? "md:hidden" : ""}`}>
                            <p className="text-[11.5px] leading-4 text-white/45">Data is stored in this browser until the backend is connected.</p>
                            <Link to="/" className="mt-3 inline-block text-[12px] text-white/70 hover:text-white">‹ View storefront</Link>
                        </div>
                        <button onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : undefined}
                            className={`flex w-full items-center gap-3 border-t border-white/10 px-6 py-3.5 text-[12px] text-white/60 transition hover:bg-white/5 hover:text-white ${collapsed ? "justify-center px-0" : ""}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={collapsed ? "rotate-180" : ""}><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /></svg>
                            {!collapsed && "Collapse"}
                        </button>
                    </div>
                </aside>
                <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">
                    <div className="mx-auto max-w-[1180px]">
                        <Routes>
                            <Route index element={<Overview />} />
                            <Route path="orders" element={<Orders />} />
                            <Route path="products" element={<Products />} />
                            <Route path="customers" element={<Customers />} />
                            <Route path="emails" element={<Emails />} />
                            <Route path="discounts" element={<Discounts />} />
                            <Route path="settings" element={<Settings />} />
                            <Route path="*" element={<Navigate to="/admin" replace />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </Gate>
        </div>
    );
}
