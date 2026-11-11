import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ACCOUNT_LINKS, NAV, PROMO } from "@/data/catalog"
import { useMenu } from "@/lib/menu"
import { useProducts } from "@/store/shop"
import { useMoney } from "@/store/market"
import { CurrencySelect } from "./CurrencySelect"
import { useCart } from "@/store/cart"
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons"

function Announcement() {
    const [shown, setShown] = useState(true);
    if (!shown) return null;
    return (
        <div className="relative z-30 flex h-[45px] items-center justify-center bg-brand text-white">
            <Link to={PROMO.to} className="ulink text-[12px] uppercase tracking-[0.02em]">{PROMO.text}</Link>
            <button aria-label="Dismiss" onClick={() => setShown(false)} className="absolute right-4"><CloseIcon /></button>
        </div>
    )
}

/** The reference shows no inline nav at any width: everything lives in this left drawer. */
function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const menu = useMenu();
    const items = NAV.map((i) => (i.label === "Collections" ? { ...i, links: menu.collections } : i));
    return (
        <>
            <div onClick={onClose} className={`fixed inset-0 z-50 bg-black/40 transition ${open ? "visible opacity-100" : "invisible opacity-0"}`} />
            <aside className={`fixed left-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col overflow-y-auto bg-paper px-8 py-6 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
                <button aria-label="Close menu" onClick={onClose} className="mb-8"><CloseIcon /></button>
                <ul>
                    {items.map((item) => (
                        <li key={item.label} className="border-b border-line py-4">
                            <Link to={item.to} onClick={onClose} className="label">{item.label}</Link>
                            {item.links?.map((l) => (
                                <Link key={l.to} to={l.to} onClick={onClose} className="label mt-3 block pl-5 text-black/60">{l.label}</Link>
                            ))}
                        </li>
                    ))}
                </ul>
                <div className="mt-auto">
                    <div className="flex items-center justify-between border-t border-line pt-5 text-[13px]"><span className="label text-black/50">Currency</span><CurrencySelect /></div>
                                    <div className="label mt-5 flex flex-wrap gap-6 border-t border-line pt-5">
                    {ACCOUNT_LINKS.map((l) => <Link key={l.to} to={l.to} onClick={onClose}>{l.label}</Link>)}
                </div>
                </div>
            </aside>
        </>
    )
}

function Search({ onClose }: { onClose: () => void }) {
    const [q, setQ] = useState("");
    const products = useProducts();
    const { fmtProduct } = useMoney();
    const hits = q.trim() ? products.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())) : [];
    return (
        <div className="fixed inset-0 z-50 bg-paper p-6 md:p-12">
            <button aria-label="Close search" onClick={onClose} className="absolute right-6 top-6"><CloseIcon /></button>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH"
                className="mx-auto mt-12 block w-full max-w-3xl border-0 border-b border-black bg-transparent py-3 text-lg tracking-widest outline-none" />
            <div className="mx-auto mt-8 max-w-3xl">
                {!q.trim() && (
                    <>
                        <p className="label text-black/50">Trending Searches</p>
                        <Link to="/collections/new-in" onClick={onClose} className="label ulink mt-4 inline-block">New In</Link>
                    </>
                )}
                {hits.map((p) => (
                    <Link key={p.handle} to={`/products/${p.handle}`} onClick={onClose} className="label flex justify-between border-b border-line py-3">
                        <span>{p.title}</span><span>{fmtProduct(p)}</span>
                    </Link>
                ))}
                {q.trim() && !hits.length && <p className="text-sm text-black/60">No results for “{q}”.</p>}
            </div>
        </div>
    )
}

export function Header() {
    const [menu, setMenu] = useState(false);
    const [search, setSearch] = useState(false);
    const { pathname } = useLocation();
    const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
    const setOpen = useCart((s) => s.setOpen);
    // Over the hero the header is transparent with white type; elsewhere it sits on the page.
    const overHero = pathname === "/";

    return (
        <>
            <Announcement />
            <header className={`${overHero ? "absolute inset-x-0 z-20 text-white" : "relative"}`}
                style={overHero ? { top: "var(--announcement, 45px)" } : undefined}>
                <div className="relative flex items-start justify-between px-5 py-5 lg:px-6">
                    <button aria-label="Open menu" onClick={() => setMenu(true)}><MenuIcon /></button>
                    <Link to="/" aria-label="Ometsey" className="absolute left-1/2 top-3 -translate-x-1/2"><img src="/images/brand/logo.png" alt="Ometsey" className="h-14 w-auto" /></Link>
                    <div className="flex items-start gap-8">
                        <CurrencySelect className="hidden pt-0.5 lg:block" />
                        <div className="flex flex-col items-center gap-3">
                            <button aria-label="Search" onClick={() => setSearch(true)}><SearchIcon /></button>
                            <Link aria-label="Account" to="/pages/my-account"><UserIcon /></Link>
                            <button aria-label="Bag" onClick={() => setOpen(true)} className="flex items-center gap-1"><BagIcon /><span className="text-[11px]">({count})</span></button>
                        </div>
                    </div>
                </div>
            </header>
            <MenuDrawer open={menu} onClose={() => setMenu(false)} />
            {search && <Search onClose={() => setSearch(false)} />}
        </>
    )
}
