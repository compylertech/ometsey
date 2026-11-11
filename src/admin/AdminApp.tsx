// global imports
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";

// local imports
import "./admin.css";
import { clearSession, loadSession, login, saveSession } from "./api";
import { AdminDataProvider } from "./data";
import { BRAND } from "./brand";
import { ADMIN } from "./model";
import { useAdminLayout, useAdminTheme } from "./theme";
import { Icons, Notice, inputCls } from "./ui";
import { Customers } from "./pages/Customers";
import { Discounts } from "./pages/Discounts";
import { Orders } from "./pages/Orders";
import { Overview } from "./pages/Overview";
import { Products } from "./pages/Products";
import { Settings } from "./pages/Settings";
import type { AdminSession } from "./types";

const NAV = [
    { to: ADMIN, label: "Overview", end: true, icon: Icons.overview },
    { to: `${ADMIN}/orders`, label: "Orders", icon: Icons.orders },
    { to: `${ADMIN}/products`, label: "Products", icon: Icons.products },
    { to: `${ADMIN}/customers`, label: "Customers", icon: Icons.customers },
    { to: `${ADMIN}/discounts`, label: "Discounts", icon: Icons.discounts },
    { to: `${ADMIN}/settings`, label: "Settings", icon: Icons.settings },
];

/** Sign-in against the real project-x administrator account; the token lives in sessionStorage. */
function LoginPanel({ onSignedIn }: { onSignedIn: (s: AdminSession) => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            onSignedIn(await login(email.trim(), password));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="grid min-h-screen place-items-center bg-[var(--a-side)] px-6">
            <form onSubmit={submit} noValidate className="w-full max-w-sm space-y-4 bg-[var(--a-surface-alt)] p-8">
                <div className="text-center">
                    <img src={BRAND.logo} alt={BRAND.name} className="mx-auto h-12 w-auto" />
                    <p className="m-0 mt-1 text-[11px] uppercase tracking-[0.2em] text-black/45">Admin Portal</p>
                </div>
                <p className="m-0 text-center text-[13px] text-black/55">Sign in with your administrator account.</p>
                <label className="block">
                    <span className="mb-1 block text-[11px] text-black/50">Email</span>
                    <input type="email" autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-[11px] text-black/50">Password</span>
                    <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
                </label>
                {error && <Notice tone="error">{error}</Notice>}
                <button className="a-btn-solid w-full" disabled={busy || !email || !password}>{busy ? "Signing in..." : "Sign in"}</button>
            </form>
        </div>
    );
}

export default function AdminApp() {
    const [session, setSession] = useState<AdminSession | null>(() => loadSession());
    const theme = useAdminTheme((t) => t.theme);
    const { collapsed, toggle } = useAdminLayout();

    useEffect(() => {
        const previous = document.title;
        document.title = `${BRAND.name} Admin`;
        const meta = document.createElement("meta");
        meta.name = "robots";
        meta.content = "noindex";
        document.head.appendChild(meta);
        return () => { meta.remove(); document.title = previous; };
    }, []);

    const signOut = useCallback(() => {
        clearSession();
        setSession(null);
    }, []);

    // Labels hide only on desktop: the mobile top bar always shows them.
    const hide = collapsed ? "md:hidden" : "";

    return (
        <div className="admin" data-admin-theme={theme}>
            {!session ? (
                <LoginPanel onSignedIn={(s) => { saveSession(s); setSession(s); }} />
            ) : (
                <AdminDataProvider token={session.token} onUnauthorized={signOut}>
                    <div className={`min-h-screen bg-[var(--a-bg)] md:grid md:transition-[grid-template-columns] md:duration-200 ${collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[236px_1fr]"}`}>
                        <aside className="bg-[var(--a-side)] text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-hidden">
                            <div className={`flex items-center justify-between px-5 pt-5 md:block md:pt-7 ${collapsed ? "md:flex md:justify-center md:px-0" : ""}`}>
                                <Link to={ADMIN} aria-label={`${BRAND.name} Admin`} className="flex items-center gap-3">
                                    <span className={`text-[17px] font-semibold uppercase tracking-[0.18em] ${hide}`}>{BRAND.name}</span>
                                    {collapsed && <span className="hidden text-[17px] font-semibold md:block">{BRAND.name[0]}</span>}
                                </Link>
                                <p className={`m-0 text-[11px] uppercase tracking-[0.2em] text-white/40 md:mt-1 ${hide}`}>Admin</p>
                            </div>
                            <nav className="flex gap-1 overflow-x-auto px-3 py-4 md:mt-4 md:flex-1 md:flex-col md:overflow-x-visible">
                                {NAV.map((n) => (
                                    <NavLink key={n.to} to={n.to} end={n.end} title={collapsed ? n.label : undefined} aria-label={n.label}
                                        className={({ isActive }) => `a-nav ${isActive ? "is-active" : ""} ${collapsed ? "md:justify-center md:px-0!" : ""}`}>
                                        <span className="a-nav-icon">{n.icon}</span><span className={hide}>{n.label}</span>
                                    </NavLink>
                                ))}
                            </nav>
                            <div className="hidden border-t border-white/10 md:block">
                                <div className={`p-5 ${collapsed ? "md:hidden" : ""}`}>
                                    <p className="m-0 truncate text-[11.5px] leading-4 text-white/45" title={session.email}>Signed in as {session.email}</p>
                                    <div className="mt-3 flex items-center gap-4 text-[12px]">
                                        <button onClick={signOut} className="text-white/70 hover:text-white">Sign out</button>
                                        <Link to="/" className="text-white/70 hover:text-white">View storefront</Link>
                                    </div>
                                </div>
                                <button onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : undefined}
                                    className={`a-side-btn ${collapsed ? "justify-center px-0!" : ""}`}>
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
                                    <Route path="discounts" element={<Discounts />} />
                                    <Route path="settings" element={<Settings onSignOut={signOut} session={session} />} />
                                    <Route path="*" element={<Navigate to={ADMIN} replace />} />
                                </Routes>
                            </div>
                        </main>
                    </div>
                </AdminDataProvider>
            )}
        </div>
    );
}
