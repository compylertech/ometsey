import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { COLLECTION_TITLES, money, type Product } from "@/data/catalog"
import { isBaseProduct, useCatalog, useProducts } from "@/store/catalog"
import { usePaged, useSort } from "../hooks"
import { useAdmin } from "../store"
import { Card, Drawer, Empty, FilterField, PageHead, Pagination, SortTh, Td, Th, btn, btnSolid, inputCls, linkBtn } from "../ui"

const COLLECTION_IDS = ["refined-basics", "refined-basics-ii", "capsule-collection", "siso", "2023-capsule-collection", "modern-retro-2"];
type Status = "Active" | "Hidden" | "Removed";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Downscale and re-encode an upload so a few photos don't fill the browser's storage. */
async function resizeImage(file: File, max = 1000): Promise<string> {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    let q = 0.82, out = c.toDataURL("image/jpeg", q);
    while (out.length > 300_000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
    return out;
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const [error, setError] = useState("");
    const upload = async (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) return setError("Choose an image file.");
        try { setError(""); onChange(await resizeImage(file)); } catch { setError("That image couldn’t be read."); }
    };
    return (
        <div className="flex gap-3">
            <div className="grid h-24 w-[68px] shrink-0 place-items-center overflow-hidden border border-black/15 bg-white text-[10px] text-black/35">
                {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : "No image"}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[12px] text-black/55">{label}</p>
                <input value={value.startsWith("data:") ? "" : value} onChange={(e) => onChange(e.target.value)} placeholder={value.startsWith("data:") ? "Uploaded image" : "Image URL or /images/… path"} className={inputCls} />
                <label className={`${btn} inline-block cursor-pointer`}>Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
                {error && <p className="text-[12px] text-red-700">{error}</p>}
            </div>
        </div>
    );
}

function ProductForm({ product, all, onDone }: { product?: Product; all: Product[]; onDone: () => void }) {
    const { addProduct, updateProduct } = useCatalog();
    const [f, setF] = useState({
        title: product?.title ?? "", price: product ? String(product.price) : "", category: product?.category ?? "",
        description: product?.description ?? "", color: product?.color ?? "",
        collections: product?.collections ?? [] as string[], newIn: product?.tags.includes("new-in") ?? false,
        front: product?.images[0] ?? "", hover: product?.images[1] ?? "", hidden: product?.hidden ?? false,
    });
    const [error, setError] = useState("");
    const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
    const categories = useMemo(() => [...new Set(all.map((p) => p.category))].sort(), [all]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const price = Number(f.price);
        if (!f.title.trim()) return setError("Give the product a name.");
        if (!(price > 0)) return setError("Enter a price above zero.");
        if (!f.front.trim()) return setError("Add a front image.");
        const category = slugify(f.category) || "uncategorised";
        const tags = [...(product?.tags.filter((t) => t !== "new-in") ?? []), ...(f.newIn ? ["new-in"] : [])];
        const fields = {
            title: f.title.trim(), price, category, description: f.description.trim(), color: f.color.trim() || undefined,
            collections: f.collections, tags, images: [f.front.trim(), (f.hover || f.front).trim()], hidden: f.hidden,
        };
        if (product) updateProduct(product.handle, fields);
        else {
            const taken = new Set(all.map((p) => p.handle));
            let handle = slugify(f.title) || "product", n = 2;
            while (taken.has(handle)) handle = `${slugify(f.title)}-${n++}`;
            addProduct({ handle, ...fields });
        }
        onDone();
    };

    return (
        <form onSubmit={submit} className="space-y-4 text-[13px]">
            <input placeholder="Product name" value={f.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
            {product && <p className="-mt-2 text-[11px] text-black/40">Link: /products/{product.handle} (fixed once created, so existing orders and bookmarks keep working)</p>}
            <div className="grid gap-3 sm:grid-cols-2">
                <input type="number" min={1} placeholder="Price (₵)" value={f.price} onChange={(e) => set("price", e.target.value)} className={inputCls} />
                <div>
                    <input list="admin-categories" placeholder="Category" value={f.category} onChange={(e) => set("category", e.target.value)} className={inputCls} />
                    <datalist id="admin-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
            </div>
            <textarea rows={3} placeholder="Description" value={f.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
            <input placeholder="Colour (optional, e.g. Olive) for the colour filter" value={f.color} onChange={(e) => set("color", e.target.value)} className={inputCls} />
            <div>
                <p className="mb-2 text-[12px] text-black/55">Collections</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                    {COLLECTION_IDS.map((c) => (
                        <label key={c} className="flex items-center gap-2"><input type="checkbox" checked={f.collections.includes(c)} onChange={(e) => set("collections", e.target.checked ? [...f.collections, c] : f.collections.filter((x) => x !== c))} />{COLLECTION_TITLES[c] ?? c}</label>
                    ))}
                </div>
            </div>
            <ImageField label="Front image" value={f.front} onChange={(v) => set("front", v)} />
            <ImageField label="Hover image (optional)" value={f.hover} onChange={(v) => set("hover", v)} />
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.newIn} onChange={(e) => set("newIn", e.target.checked)} />Show in New In</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.hidden} onChange={(e) => set("hidden", e.target.checked)} />Hide from the storefront</label>
            {error && <p className="text-[12px] text-red-700">{error}</p>}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--a-border-soft)] pt-4">
                <button type="button" className={btn} onClick={onDone}>Cancel</button>
                <button className={btnSolid}>{product ? "Save changes" : "Add product"}</button>
            </div>
        </form>
    );
}

interface Row extends Product { status: Status; sold: number; revenue: number }

export function Products() {
    const orders = useAdmin((s) => s.orders);
    const { removeProduct, restoreProduct, updateProduct } = useCatalog();
    const removedHandles = useCatalog((s) => s.removed);
    const all = useProducts({ includeHidden: true, includeRemoved: true });

    const [q, setQ] = useState("");
    const [category, setCategory] = useState("");
    const [collection, setCollection] = useState("");
    const [status, setStatus] = useState("");
    const [min, setMin] = useState("");
    const [max, setMax] = useState("");
    const [editing, setEditing] = useState<Product | "new" | null>(null);

    const sold = useMemo(() => {
        const m = new Map<string, { qty: number; revenue: number }>();
        for (const o of orders) {
            if (!o.paidAt || o.status === "CANCELLED") continue;
            for (const i of o.items) {
                const s = m.get(i.handle) ?? { qty: 0, revenue: 0 };
                s.qty += i.qty; s.revenue += i.price * i.qty;
                m.set(i.handle, s);
            }
        }
        return m;
    }, [orders]);

    const rows: Row[] = useMemo(() => all.map((p) => ({
        ...p, status: removedHandles.includes(p.handle) ? "Removed" : p.hidden ? "Hidden" : "Active",
        sold: sold.get(p.handle)?.qty ?? 0, revenue: sold.get(p.handle)?.revenue ?? 0,
    })), [all, removedHandles, sold]);

    const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);
    const filtered = useMemo(() => rows.filter((p) =>
        (!category || p.category === category) &&
        (!collection || p.collections.includes(collection)) &&
        (status ? p.status === status : p.status !== "Removed") &&
        (!min || p.price >= Number(min)) && (!max || p.price <= Number(max)) &&
        (!q.trim() || `${p.title} ${p.category}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, category, collection, status, min, max]);

    const { sorted, sort, toggle } = useSort(filtered, {
        title: (r) => r.title, category: (r) => r.category, price: (r) => r.price, sold: (r) => r.sold, revenue: (r) => r.revenue, status: (r) => r.status,
    });
    const paged = usePaged(sorted, JSON.stringify([q, category, collection, status, min, max, sort]));
    const dirty = !!(q || category || collection || status || min || max);
    const clear = () => { setQ(""); setCategory(""); setCollection(""); setStatus(""); setMin(""); setMax(""); };

    const remove = (p: Row) => {
        const msg = isBaseProduct(p.handle)
            ? `Remove “${p.title}” from the catalog? You can restore it later from the Removed filter.`
            : `Delete “${p.title}” permanently?`;
        if (confirm(msg)) removeProduct(p.handle);
    };

    return (
        <>
            <PageHead title="Products" subtitle={`${rows.filter((r) => r.status !== "Removed").length} products`}>
                <button className={btnSolid} onClick={() => setEditing("new")}>Add product</button>
            </PageHead>

            <div className="mb-5 flex flex-wrap items-end gap-3">
                <FilterField label="Search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or category" className={`${inputCls} w-[190px]`} /></FilterField>
                <FilterField label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} w-[150px]`}><option value="">All</option>{categories.map((c) => <option key={c} value={c}>{c.replace(/-/g, " ")}</option>)}</select></FilterField>
                <FilterField label="Collection"><select value={collection} onChange={(e) => setCollection(e.target.value)} className={`${inputCls} w-[200px]`}><option value="">All</option>{COLLECTION_IDS.map((c) => <option key={c} value={c}>{COLLECTION_TITLES[c] ?? c}</option>)}</select></FilterField>
                <FilterField label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} w-[120px]`}><option value="">Live</option><option>Active</option><option>Hidden</option><option>Removed</option></select></FilterField>
                <FilterField label="Price (₵)">
                    <span className="flex items-center gap-1.5">
                        <input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min" className={`${inputCls} w-[84px]`} />
                        <span className="text-black/30">–</span>
                        <input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max" className={`${inputCls} w-[84px]`} />
                    </span>
                </FilterField>
                {dirty && <button onClick={clear} className={`${linkBtn} pb-2`}>Clear filters</button>}
            </div>

            <Card flush>
                {sorted.length ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px]">
                                <thead><tr>
                                    <Th /><SortTh label="Product" k="title" sort={sort} toggle={toggle} /><SortTh label="Category" k="category" sort={sort} toggle={toggle} /><Th>Collections</Th>
                                    <SortTh label="Price" k="price" sort={sort} toggle={toggle} right /><SortTh label="Sold" k="sold" sort={sort} toggle={toggle} right />
                                    <SortTh label="Revenue" k="revenue" sort={sort} toggle={toggle} right /><SortTh label="Status" k="status" sort={sort} toggle={toggle} /><Th />
                                </tr></thead>
                                <tbody>{paged.rows.map((p) => (
                                    <tr key={p.handle} className="border-t border-[var(--a-border-soft)]">
                                        <Td className="w-14"><img src={p.images[0]} alt="" className="h-14 w-10 object-cover" loading="lazy" /></Td>
                                        <Td>{p.status === "Removed" ? p.title : <Link to={`/products/${p.handle}`} className="hover:underline">{p.title}</Link>}</Td>
                                        <Td>{p.category.replace(/-/g, " ")}</Td>
                                        <Td className="text-black/60">{p.collections.map((c) => COLLECTION_TITLES[c] ?? c).join(", ") || "—"}</Td>
                                        <Td right>{money(p.price)}</Td><Td right>{p.sold}</Td><Td right>{p.revenue ? money(p.revenue) : "—"}</Td>
                                        <Td><span className={p.status === "Active" ? "" : "text-black/50"}>{p.status}</span></Td>
                                        <Td right className="whitespace-nowrap">
                                            {p.status === "Removed" ? <button className={linkBtn} onClick={() => restoreProduct(p.handle)}>Restore</button> : (
                                                <>
                                                    <button className={linkBtn} onClick={() => setEditing(p)}>Edit</button>
                                                    <button className={`${linkBtn} ml-3`} onClick={() => updateProduct(p.handle, { hidden: !p.hidden })}>{p.hidden ? "Show" : "Hide"}</button>
                                                    <button className={`${linkBtn} ml-3 !text-black/50`} onClick={() => remove(p)}>Remove</button>
                                                </>
                                            )}
                                        </Td>
                                    </tr>))}</tbody>
                            </table>
                        </div>
                        <Pagination p={paged} />
                    </>
                ) : <Empty>No products match. {dirty && <button onClick={clear} className={linkBtn}>Clear filters</button>}</Empty>}
            </Card>
            <p className="mt-3 text-[11.5px] text-black/40">Changes show on the storefront in this browser. They’re saved here until the backend is connected.</p>

            <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add product" : "Edit product"}>
                {editing !== null && <ProductForm key={editing === "new" ? "new" : editing.handle} product={editing === "new" ? undefined : editing} all={all} onDone={() => setEditing(null)} />}
            </Drawer>
        </>
    );
}
