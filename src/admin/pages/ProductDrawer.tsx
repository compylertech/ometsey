// global imports
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// local imports
import { formatMoney } from "../shared";
import { addProductVariants, fetchProductDetail, fetchProductVariants, UnauthorizedError, updateProductContent, updateVariant, withRetry } from "../api";
import { useAdminData } from "../data";
import { Notice, StatePill, Tabs, Td, Th, btn, btnSolid, inputCls, linkBtn } from "../ui";
import type { AdminProductSummary, LabelValue, ProductAttributes, ProductDetail, ProductVariant, UpdateVariantRequest } from "../types";
import { Revenue } from "./Revenue";
import { SizeGenerator, VariantRowsEditor, blankRow, rowsState, toVariants } from "./VariantRows";
import type { VariantRow } from "./VariantRows";

type Tab = "overview" | "edit" | "variants";

const statusLabel = (p: AdminProductSummary) => (p.visible === false ? (p.status === "ARCHIVED" ? "Archived" : "Draft") : "Live");
const STATUS_COLOR: Record<string, string> = { Live: "var(--a-st-done)", Draft: "var(--a-st-pay)", Archived: "var(--a-st-ref)" };

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
        <p className="m-0 mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">{title}</p>
        {children}
    </section>
);
const Field = ({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) => (
    <label className={`block ${className}`}><span className="mb-1 block text-[11px] text-black/50">{label}</span>{children}</label>
);

const optionText = (v: ProductVariant) => Object.values(v.optionValues ?? {}).join(" · ") || "—";

// ---------- read view ----------

function Overview({ product, detail }: { product: AdminProductSummary; detail: ProductDetail }) {
    const a: ProductAttributes = detail.attributes ?? {};
    const status = statusLabel(product);
    const rates = Object.entries(a.shipping?.rates ?? {});
    return (
        <div className="space-y-6 text-[13px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-3"><StatePill label={status} color={STATUS_COLOR[status]} /><span className="text-black/50">{detail.code} · /{detail.slug}</span></span>
                {status === "Live" && <Link to={`/products/${detail.slug}`} className="a-link">Open on storefront</Link>}
            </div>
            {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="max-h-[360px] w-auto max-w-full object-contain" />}
            <div className="grid grid-cols-3 gap-4">
                <div><p className="m-0 text-[11px] text-black/50">Sold</p><p className="m-0 text-[18px] font-semibold">{product.sold ?? "—"}</p></div>
                <div><p className="m-0 text-[11px] text-black/50">Revenue</p><p className="m-0 text-[18px] font-semibold"><Revenue p={product} /></p></div>
                <div>
                    <p className="m-0 text-[11px] text-black/50">Price</p>
                    {product.prices.map((r) => <p key={r.label} className="m-0">{formatMoney(r.price, product.currency)}{product.prices.length > 1 && <span className="text-black/50"> · {r.label}</span>}</p>)}
                </div>
            </div>
            <Section title="Description">
                {detail.shortDescription && <p className="m-0 mb-2 font-medium">{detail.shortDescription}</p>}
                <p className="m-0 whitespace-pre-line text-black/70">{detail.description || "No description."}</p>
                {detail.brand && <p className="m-0 mt-2 text-black/50">Brand: {detail.brand}</p>}
            </Section>
            {(a.details?.length ?? 0) > 0 && (
                <Section title="Details">
                    <dl className="m-0 grid grid-cols-[160px_1fr] gap-x-4 gap-y-1">{a.details!.map((r, i) => <div key={i} className="contents"><dt className="text-black/50">{r.label}</dt><dd className="m-0">{r.value}</dd></div>)}</dl>
                </Section>
            )}
            {(a.shipment?.length ?? 0) > 0 && (
                <Section title="Shipment">
                    <dl className="m-0 grid grid-cols-[160px_1fr] gap-x-4 gap-y-1">{a.shipment!.map((r, i) => <div key={i} className="contents"><dt className="text-black/50">{r.label}</dt><dd className="m-0">{r.value}</dd></div>)}</dl>
                </Section>
            )}
            <Section title="Shipping rates charged at checkout">
                <p className="m-0">{rates.length ? rates.map(([c, n]) => `${c} ${n === 0 ? "free" : formatMoney(n, product.currency)}`).join(" · ") : "—"}{a.shipping?.default !== undefined && <span className="text-black/50"> · elsewhere {formatMoney(a.shipping.default, product.currency)}</span>}</p>
            </Section>
        </div>
    );
}

// ---------- editor ----------

interface Pair { key: number; a: string; b: string }

const isMoney = (raw: string) => /^\d+(\.\d{1,2})?$/.test(raw.trim());

/**
 * Edits the product's text and storefront content. The server replaces `attributes` as a whole, so
 * the save starts from the attributes as loaded and changes only the keys edited here: anything
 * else on the product (colourways, pieces, other shipping fields) is sent back as it was.
 */
function ContentEditor({ detail, onSaved }: { detail: ProductDetail; onSaved: (next: ProductDetail) => void }) {
    const { token, unauthorized } = useAdminData();
    const a: ProductAttributes = detail.attributes ?? {};
    const keys = useRef(1);
    const k = () => keys.current++;

    const [brand, setBrand] = useState(detail.brand ?? "");
    const [shortDescription, setShortDescription] = useState(detail.shortDescription ?? "");
    const [description, setDescription] = useState(detail.description ?? "");
    const [details, setDetails] = useState<Pair[]>(() => (a.details ?? []).map((r) => ({ key: k(), a: r.label, b: r.value })));
    const [shipment, setShipment] = useState<Pair[]>(() => (a.shipment ?? []).map((r) => ({ key: k(), a: r.label, b: r.value })));
    const [rates, setRates] = useState<Pair[]>(() => Object.entries(a.shipping?.rates ?? {}).map(([c, n]) => ({ key: k(), a: c, b: String(n) })));
    const [defaultRate, setDefaultRate] = useState(a.shipping?.default !== undefined ? String(a.shipping.default) : "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const problems = [
        [...details, ...shipment].some((r) => !r.a.trim()) && "Every details and shipment row needs a label.",
        rates.some((r) => !/^[A-Za-z]{2}$/.test(r.a.trim()) || !isMoney(r.b)) && "Each shipping rate needs a 2-letter country code and an amount like 45 or 12.50.",
        new Set(rates.map((r) => r.a.trim().toUpperCase())).size !== rates.length && "Each country can only appear once in shipping rates.",
        defaultRate.trim() !== "" && !isMoney(defaultRate) && "The default shipping rate must be an amount like 45.",
    ].filter(Boolean) as string[];

    async function save() {
        if (problems.length || busy) return;
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
            const next: ProductAttributes = { ...a };
            const rows = (list: Pair[]): LabelValue[] => list.map((r) => ({ label: r.a.trim(), value: r.b.trim() }));
            if (details.length) next.details = rows(details); else delete next.details;
            if (shipment.length) next.shipment = rows(shipment); else delete next.shipment;

            const shipping = { ...(a.shipping ?? {}) };
            if (rates.length) shipping.rates = Object.fromEntries(rates.map((r) => [r.a.trim().toUpperCase(), Number(r.b)])); else delete shipping.rates;
            if (defaultRate.trim()) shipping.default = Number(defaultRate); else delete shipping.default;
            if (Object.keys(shipping).length) next.shipping = shipping; else delete next.shipping;

            const updated = await updateProductContent(token, detail.id, {
                brand: brand.trim(), shortDescription: shortDescription.trim(), description: description.trim(), attributes: next,
            });
            onSaved({ ...detail, ...updated, attributes: updated.attributes ?? next });
            setSaved(true);
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The changes weren’t saved.");
        } finally {
            setBusy(false);
        }
    }

    const pairEditor = (title: string, list: Pair[], set: (next: Pair[]) => void, labels: [string, string], addLabel: string, narrowA = false) => (
        <Section title={title}>
            <div className="space-y-2">
                {list.map((r) => (
                    <div key={r.key} className={`grid ${narrowA ? "grid-cols-[88px_minmax(0,1fr)_24px]" : "grid-cols-[minmax(0,1fr)_minmax(0,2fr)_24px]"} items-center gap-2`}>
                        <input value={r.a} placeholder={labels[0]} aria-label={labels[0]} onChange={(e) => set(list.map((x) => (x.key === r.key ? { ...x, a: e.target.value } : x)))} className={inputCls} />
                        <input value={r.b} placeholder={labels[1]} aria-label={labels[1]} onChange={(e) => set(list.map((x) => (x.key === r.key ? { ...x, b: e.target.value } : x)))} className={inputCls} />
                        <button type="button" aria-label="Remove row" onClick={() => set(list.filter((x) => x.key !== r.key))} className="a-x">×</button>
                    </div>
                ))}
            </div>
            <div className="mt-3"><button type="button" className={btn} onClick={() => set([...list, { key: k(), a: "", b: "" }])}>{addLabel}</button></div>
        </Section>
    );

    return (
        <div className="space-y-6 text-[13px]">
            <Notice tone="warn">Changes appear on the live storefront as soon as you save.</Notice>

            <Section title="Text">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Brand"><input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} /></Field>
                    <Field label="Short description"><input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className={inputCls} /></Field>
                    <Field label="Description" className="col-span-2"><textarea value={description} rows={4} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></Field>
                </div>
            </Section>

            {pairEditor("Details", details, setDetails, ["Label", "Value"], "Add detail")}
            {pairEditor("Shipment", shipment, setShipment, ["Label", "Value"], "Add shipment row")}

            {pairEditor("Shipping rates charged at checkout", rates, setRates, ["GH", "Amount"], "Add country", true)}
            <div className="-mt-3 max-w-[240px]">
                <Field label="All other countries"><input value={defaultRate} inputMode="decimal" placeholder="Default rate" onChange={(e) => setDefaultRate(e.target.value)} className={inputCls} /></Field>
                <p className="m-0 mt-1 text-[11px] text-black/45">0 means free. These rates are what checkout charges, so keep the Shipment rows above in step.</p>
            </div>

            {problems.length > 0 && <Notice tone="error">{problems.join(" ")}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            {saved && <Notice>Saved.</Notice>}
            <div><button className={btnSolid} disabled={busy || problems.length > 0} onClick={() => void save()}>{busy ? "Saving..." : "Save changes"}</button></div>
        </div>
    );
}

// ---------- variants ----------

function Variants({ product, variants, onChanged }: { product: AdminProductSummary; variants: ProductVariant[]; onChanged: () => void }) {
    const { token, unauthorized, upsertProduct } = useAdminData();
    const [q, setQ] = useState("");
    const [adding, setAdding] = useState(false);
    const [rows, setRows] = useState<VariantRow[]>([blankRow(1)]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [added, setAdded] = useState<number | null>(null);
    const [editing, setEditing] = useState<ProductVariant | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rowError, setRowError] = useState<string | null>(null);
    const { dupSku, ok } = rowsState(rows);
    const taken = new Set(variants.map((v) => v.sku.toLowerCase()));
    const clash = rows.some((r) => taken.has(r.sku.trim().toLowerCase()));

    async function submit() {
        setBusy(true);
        setError(null);
        try {
            const count = rows.length;
            upsertProduct(await addProductVariants(token, product.id, toVariants(rows, product.name)));
            setAdded(count);
            setRows([blankRow(1)]);
            setAdding(false);
            onChanged();
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The variants weren’t added.");
        } finally {
            setBusy(false);
        }
    }

    async function toggle(v: ProductVariant) {
        setBusyId(v.id);
        setRowError(null);
        try {
            await updateVariant(token, v.id, { active: !v.active });
            onChanged();
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setRowError(err instanceof Error ? `${v.sku}: ${err.message}` : "That didn’t go through.");
        } finally {
            setBusyId(null);
        }
    }

    const shown = variants.filter((v) => !q.trim() || `${v.sku} ${v.name ?? ""} ${optionText(v)}`.toLowerCase().includes(q.trim().toLowerCase()));
    const off = variants.filter((v) => !v.active).length;
    return (
        <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between gap-3">
                <p className="m-0 text-black/60">{variants.length} variants{off ? ` · ${off} switched off` : ""}.</p>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU or option" aria-label="Search variants" className={`a-input w-[200px]`} />
            </div>
            {added !== null && <Notice>{added === 1 ? "1 variant was" : `${added} variants were`} added{product.visible === false ? "." : " and is on the storefront now."}</Notice>}
            {adding ? (
                <div className="space-y-3 border border-[var(--a-border-soft)] p-3">
                    <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-black/50">New variants · prices in {product.currency}</p>
                    <SizeGenerator codeHint={product.code} taken={taken} rows={rows} onChange={setRows} />
                    <VariantRowsEditor rows={rows} onChange={setRows} currency={product.currency} />
                    <p className="m-0 text-[11px] text-black/45">Variants always use the product’s currency. A variant with no price uses the product price. A new piece name adds a price row to the product.</p>
                    {clash && <p className="m-0 text-[12px] text-[var(--a-st-can)]">One of these SKUs is already on this product.</p>}
                    {error && <Notice tone="error">{error}</Notice>}
                    <div className="flex gap-3">
                        <button className={btnSolid} disabled={busy || !ok || dupSku || clash} onClick={() => void submit()}>{busy ? "Adding..." : rows.length === 1 ? "Add variant" : `Add ${rows.length} variants`}</button>
                        <button className={btn} disabled={busy} onClick={() => { setAdding(false); setError(null); }}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div><button className={btn} onClick={() => { setAdding(true); setAdded(null); setEditing(null); }}>Add variants</button></div>
            )}
            {rowError && <Notice tone="error">{rowError}</Notice>}
            {editing && <VariantEditor key={editing.id} variant={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
            <div className="max-h-[60vh] overflow-auto border border-[var(--a-border-soft)]">
                <table className="w-full border-collapse">
                    <thead><tr><Th>SKU</Th><Th>Options</Th><Th right>Own price</Th><Th>Status</Th><Th /></tr></thead>
                    <tbody>{shown.map((v) => (
                        <tr key={v.id} className="border-t border-[var(--a-border-soft)]">
                            <Td className="font-medium">{v.sku}</Td><Td>{optionText(v)}</Td>
                            <Td right>{v.priceOverride !== null ? formatMoney(v.priceOverride, v.currency) : <span className="text-black/40">product price</span>}</Td>
                            <Td><StatePill label={v.active ? "On" : "Off"} color={v.active ? "var(--a-st-done)" : "var(--a-st-ref)"} /></Td>
                            <Td right>
                                <span className="inline-flex items-center gap-x-3">
                                    <button className={linkBtn} onClick={() => { setEditing(v); setAdding(false); }}>Edit</button>
                                    <button className={linkBtn} disabled={busyId === v.id} onClick={() => void toggle(v)}>{busyId === v.id ? "…" : v.active ? "Switch off" : "Switch on"}</button>
                                </span>
                            </Td>
                        </tr>
                    ))}</tbody>
                </table>
                {!shown.length && <p className="m-0 py-8 text-center text-black/45">No variants match.</p>}
            </div>
            <p className="m-0 text-[11px] text-black/45">A switched-off variant can’t be bought. Prices are changed with Edit prices, and a SKU can’t be renamed here.</p>
        </div>
    );
}

/** Name, options and on/off for one variant. Sends only what changed; options are sent whole. */
function VariantEditor({ variant, onClose, onSaved }: { variant: ProductVariant; onClose: () => void; onSaved: () => void }) {
    const { token, unauthorized } = useAdminData();
    const opts = (variant.optionValues ?? {}) as Record<string, unknown>;
    const [name, setName] = useState(variant.name ?? "");
    const [piece, setPiece] = useState(String(opts.piece ?? ""));
    const [colour, setColour] = useState(String(opts.colour ?? ""));
    const [size, setSize] = useState(String(opts.size ?? ""));
    const [active, setActive] = useState(variant.active);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Other option keys on the variant are kept as they are; the three the storefront reads are edited.
    const nextOptions: Record<string, string> = Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, String(v)]));
    for (const [k, v] of [["piece", piece], ["colour", colour], ["size", size]] as const) {
        if (v.trim()) nextOptions[k] = v.trim(); else delete nextOptions[k];
    }
    const optionsChanged = JSON.stringify(Object.entries(nextOptions).sort()) !== JSON.stringify(Object.entries(opts).map(([k, v]) => [k, String(v)]).sort());
    const patch: UpdateVariantRequest = {
        ...(name.trim() !== (variant.name ?? "") && name.trim() ? { name: name.trim() } : {}),
        ...(optionsChanged ? { optionValues: nextOptions } : {}),
        ...(active !== variant.active ? { active } : {}),
    };
    const changed = Object.keys(patch).length > 0;

    async function save() {
        setBusy(true);
        setError(null);
        try {
            await updateVariant(token, variant.id, patch);
            onSaved();
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The variant wasn’t saved.");
        } finally {
            setBusy(false);
        }
    }

    const label = "mb-1 block text-[11px] text-black/50";
    return (
        <div className="space-y-3 border border-[var(--a-border-soft)] p-3">
            <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-black/50">Edit {variant.sku}</p>
            <label className="block"><span className={label}>Name</span><input value={name} aria-label="Variant name" onChange={(e) => setName(e.target.value)} className={inputCls} /></label>
            <div className="grid grid-cols-3 gap-3">
                <label className="block"><span className={label}>Piece</span><input value={piece} aria-label="Piece" onChange={(e) => setPiece(e.target.value)} className={inputCls} /></label>
                <label className="block"><span className={label}>Colour</span><input value={colour} aria-label="Colour" onChange={(e) => setColour(e.target.value)} className={inputCls} /></label>
                <label className="block"><span className={label}>Size</span><input value={size} aria-label="Size" onChange={(e) => setSize(e.target.value)} className={inputCls} /></label>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> On sale</label>
            <p className="m-0 text-[11px] text-black/45">Colour must match a colourway’s name, and size is what the picker shows. Changing them changes what the storefront offers.</p>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-3">
                <button className={btnSolid} disabled={busy || !changed} onClick={() => void save()}>{busy ? "Saving..." : "Save variant"}</button>
                <button className={btn} disabled={busy} onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
}

// ---------- drawer body ----------

export function ProductDrawerBody({ product: opened }: { product: AdminProductSummary }) {
    const { token, unauthorized, products, reloadProducts } = useAdminData();
    // The row the table holds now, so prices and status stay current after an edit made here.
    const product = products.find((p) => p.id === opened.id) ?? opened;
    const [tab, setTab] = useState<Tab>("overview");
    const [detail, setDetail] = useState<ProductDetail | null>(null);
    const [variants, setVariants] = useState<ProductVariant[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        const isLive = () => live;
        const noop = () => undefined;
        Promise.all([
            withRetry(() => fetchProductDetail(token, product.id), noop, isLive),
            withRetry(() => fetchProductVariants(token, product.id), noop, isLive),
        ]).then(([d, v]) => { if (live) { setDetail(d); setVariants(v); } })
            .catch((err) => {
                if (!live) return;
                if (err instanceof UnauthorizedError) return unauthorized();
                setError(err instanceof Error ? err.message : "Couldn’t load this product.");
            });
        return () => { live = false; };
    }, [token, product.id, unauthorized]);

    if (error) return <Notice tone="error">{error}</Notice>;
    if (!detail || !variants) return <p className="m-0 py-12 text-center text-[13px] text-black/45">Loading…</p>;

    return (
        <div className="space-y-6">
            <Tabs value={tab} onChange={setTab} items={[{ id: "overview", label: "Overview" }, { id: "edit", label: "Edit content" }, { id: "variants", label: "Variants", count: variants.length }]} />
            {tab === "overview" && <Overview product={product} detail={detail} />}
            {tab === "edit" && <ContentEditor detail={detail} onSaved={setDetail} />}
            {tab === "variants" && <Variants product={product} variants={variants} onChanged={() => { void reloadProducts(); void fetchProductVariants(token, product.id).then(setVariants).catch(() => undefined); }} />}
        </div>
    );
}
