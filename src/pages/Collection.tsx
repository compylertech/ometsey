import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { CATEGORIES, COLLECTION_TITLES, COLOR_SWATCH, SIZES, colorOf, productsFor } from "@/data/catalog"
import { ProductCard } from "@/components/ProductCard"
import { CloseIcon } from "@/components/Icons"

type Sort = "featured" | "low" | "high" | "az";

const PAGE_SIZE = 10;

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** A facet column: a small heading and a list of selectable rows. */
function Facet({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="mb-4 text-[9.5px] uppercase tracking-[0.08em] text-black/70">{title}</p>
            <ul className="space-y-3.5">{children}</ul>
        </div>
    )
}

/** Previous / numbered / next links; the current page is boxed, as the category pills are. */
function Pager({ page, pages, go }: { page: number; pages: number; go: (n: number) => void }) {
    const cell = "flex h-10 min-w-10 items-center justify-center border px-3 text-[12.5px]";
    return (
        <nav aria-label="Pagination" className="mt-14 flex justify-center gap-2">
            <button aria-label="Previous page" disabled={page === 1} onClick={() => go(page - 1)} className={`${cell} border-black/25 disabled:opacity-30`}>‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} aria-label={`Page ${n}`} aria-current={n === page ? "page" : undefined} onClick={() => go(n)}
                    className={`${cell} ${n === page ? "border-black" : "border-black/25"}`}>{n}</button>
            ))}
            <button aria-label="Next page" disabled={page === pages} onClick={() => go(page + 1)} className={`${cell} border-black/25 disabled:opacity-30`}>›</button>
        </nav>
    )
}

/** Keyed by handle so switching collection starts from clean filters and page 1. */
export function Collection() {
    const { handle = "all" } = useParams();
    return <CollectionPage key={handle} handle={handle} />;
}

function CollectionPage({ handle }: { handle: string }) {
    const base = useMemo(() => productsFor(handle), [handle]);
    const prices = base.map((p) => p.price);
    const lo = Math.min(...prices, 0), hi = Math.max(...prices, 0);

    const [sort, setSort] = useState<Sort>("featured");
    const [open, setOpen] = useState(false);
    const [stock, setStock] = useState<string[]>([]);
    const [cats, setCats] = useState<string[]>([]);
    const [colors, setColors] = useState<string[]>([]);
    const [sizes, setSizes] = useState<string[]>([]);
    const [min, setMin] = useState<number | null>(null);
    const [max, setMax] = useState<number | null>(null);
    const pmin = min ?? lo, pmax = max ?? hi;

    const [params, setParams] = useSearchParams();
    const gridTop = useRef<HTMLDivElement>(null);

    // The catalog has no stock or per-size data yet: every product counts as in stock and offered in
    // every size, so "Out of stock" empties the list and the size choice narrows nothing.
    const stockOk = !stock.length || stock.includes("In stock");
    const items = (stockOk ? base : [])
        .filter((p) => !cats.length || cats.includes(p.category))
        .filter((p) => !colors.length || colors.includes(colorOf(p.handle) ?? ""))
        .filter((p) => p.price >= pmin && p.price <= pmax);
    if (sort === "low") items.sort((a, b) => a.price - b.price);
    if (sort === "high") items.sort((a, b) => b.price - a.price);
    if (sort === "az") items.sort((a, b) => a.title.localeCompare(b.title));

    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const page = Math.min(Math.max(1, Number(params.get("page")) || 1), pages);
    const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const go = (n: number) => {
        setParams(n === 1 ? {} : { page: String(n) });
        gridTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // A different result set means page 1. Comparing against the previous filters (rather than
    // skipping the first run) keeps a linked ?page=2 intact, including under StrictMode's double run.
    const sig = JSON.stringify([sort, stock, cats, colors, sizes, min, max]);
    const lastSig = useRef(sig);
    useEffect(() => {
        if (lastSig.current === sig) return;
        lastSig.current = sig;
        setParams({}, { replace: true });
    }, [sig, setParams]);

    const colorChoices = [...new Set(base.map((p) => colorOf(p.handle)).filter((c): c is string => !!c))].sort();
    const catChoices = [...new Set(base.map((p) => p.category))];
    const dirty = stock.length + cats.length + colors.length + sizes.length > 0 || min !== null || max !== null;
    const clear = () => { setStock([]); setCats([]); setColors([]); setSizes([]); setMin(null); setMax(null); };
    const row = (on: boolean) => `text-[12px] ${on ? "font-medium underline underline-offset-4" : ""}`;

    return (
        <section className="px-5 pb-16 pt-6 lg:px-6">
            <h1 className="text-[18px] font-normal">{handle === "all" ? "All Products" : COLLECTION_TITLES[handle] ?? handle.replace(/-/g, " ")}</h1>

            {/* Category pills */}
            <div className="rail mt-9 flex gap-4 overflow-x-auto pb-1">
                <Link to="/collections/all" className={`shrink-0 border px-5 py-[8.5px] text-[12.5px] ${handle === "all" ? "border-black" : "border-black/25"}`}>All Products</Link>
                {CATEGORIES.map((c) => (
                    <Link key={c.to} to={c.to} className={`shrink-0 border px-5 py-[8.5px] text-[12.5px] ${c.to.endsWith(`/${handle}`) ? "border-black" : "border-black/25"}`}>{c.label}</Link>
                ))}
            </div>

            {/* Toolbar */}
            <div className="mt-8 flex items-center justify-end gap-6 text-[12px]">
                <span>Items: {items.length}</span>
                <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 7h18M3 17h18" /><circle cx="9" cy="7" r="2.5" fill="#fffef8" /><circle cx="15" cy="17" r="2.5" fill="#fffef8" /></svg>
                    Filter
                </button>
                <label className="flex items-center gap-2">
                    Sort By <span className="text-black/30">▪</span>
                    <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="border-0 bg-transparent pr-2 outline-none">
                        <option value="featured">Featured</option>
                        <option value="low">Price, low to high</option>
                        <option value="high">Price, high to low</option>
                        <option value="az">Alphabetically, A–Z</option>
                    </select>
                </label>
            </div>

            {/* Filter panel */}
            {open && (
                <div className="relative -mx-5 mt-5 border-t border-line bg-paper px-5 py-8 lg:-mx-6 lg:px-6">
                    <button aria-label="Close filters" onClick={() => setOpen(false)} className="absolute right-6 top-8"><CloseIcon /></button>
                    <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
                        <Facet title="Availability">
                            {["In stock", "Out of stock"].map((v) => (
                                <li key={v}><button onClick={() => setStock(toggle(stock, v))} className={row(stock.includes(v))}>{v}</button></li>
                            ))}
                        </Facet>
                        <Facet title="Category">
                            {catChoices.map((v) => (
                                <li key={v}><button onClick={() => setCats(toggle(cats, v))} className={row(cats.includes(v))}>{v.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}</button></li>
                            ))}
                        </Facet>
                        <Facet title="Color">
                            {colorChoices.map((v) => (
                                <li key={v}>
                                    <button onClick={() => setColors(toggle(colors, v))} className={`flex items-center gap-2 ${row(colors.includes(v))}`}>
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_SWATCH[v] ?? "#999" }} />{v}
                                    </button>
                                </li>
                            ))}
                        </Facet>
                        <Facet title="Size">
                            {SIZES.map((v) => (
                                <li key={v}><button onClick={() => setSizes(toggle(sizes, v))} className={row(sizes.includes(v))}>{v}</button></li>
                            ))}
                        </Facet>
                        <div>
                            <p className="mb-4 text-[9.5px] uppercase tracking-[0.08em] text-black/70">Price</p>
                            <input type="range" aria-label="Minimum price" min={lo} max={hi} value={pmin} onChange={(e) => setMin(Math.min(+e.target.value, pmax))} className="w-full accent-black" />
                            <input type="range" aria-label="Maximum price" min={lo} max={hi} value={pmax} onChange={(e) => setMax(Math.max(+e.target.value, pmin))} className="mt-1 w-full accent-black" />
                            <div className="mt-4 flex items-center gap-3 text-[12px]">
                                <span className="flex-1 border border-black/25 px-3 py-2.5">₵ {pmin.toLocaleString()}</span>
                                <span className="text-black/30">▪</span>
                                <span className="flex-1 border border-black/25 px-3 py-2.5">₵ {pmax.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={clear} disabled={!dirty} className={`mt-10 px-6 py-3 text-[12px] ${dirty ? "bg-black text-white" : "bg-black/30 text-white"}`}>Clear all</button>
                </div>
            )}

            {/* Grid */}
            <div ref={gridTop} className="scroll-mt-4" />
            {items.length ? (
                <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
                    {visible.map((p) => <ProductCard key={p.handle} product={p} />)}
                </div>
            ) : <p className="py-24 text-center text-sm text-black/60">No products match. <button onClick={clear} className="underline">Clear filters</button></p>}
            {pages > 1 && <Pager page={page} pages={pages} go={go} />}
        </section>
    )
}
