// global imports
import { useState } from "react";
import type { ReactNode } from "react";

// local imports
import { createProduct, UnauthorizedError } from "../api";
import { useAdminData } from "../data";
import { Notice, btn, btnSolid, inputCls } from "../ui";
import { VariantRowsEditor, rowsState, toVariants, validPrice } from "./VariantRows";
import type { VariantRow } from "./VariantRows";
import type { AdminProductSummary } from "../types";

const Field = ({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) => (
    <label className={`block ${className}`}><span className="mb-1 block text-[11px] text-black/50">{label}</span>{children}</label>
);
const Heading = ({ children }: { children: ReactNode }) => (
    <p className="m-0 mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">{children}</p>
);


/**
 * One call creates the product, its headline price and its variants, or nothing. It is saved as a
 * draft, so nothing reaches the storefront half-made; show it from the table when it is ready.
 * Rich storefront content (colourways, details, shipping rates) is not edited here.
 */
export function AddProduct({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const { token, unauthorized, products, upsertProduct, reloadProducts } = useAdminData();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [brand, setBrand] = useState("");
    const [shortDescription, setShortDescription] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState("");
    const [currency, setCurrency] = useState(products[0]?.currency ?? "USD");
    const [price, setPrice] = useState("");
    const [rows, setRows] = useState<VariantRow[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<AdminProductSummary | null>(null);

    const { dupSku, ok: variantsOk } = rowsState(rows);
    const priced = validPrice(price) || (rows.length > 0 && rows.some((r) => validPrice(r.price)));
    const valid = code.trim() && name.trim() && /^[A-Za-z]{3}$/.test(currency) && image.length <= 50 && variantsOk && !dupSku && priced && (!price.trim() || validPrice(price));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError(null);
        try {
            const variants = toVariants(rows, name.trim());
            const product = await createProduct(token, {
                code: code.trim(), name: name.trim(), currency: currency.toUpperCase(),
                ...(slug.trim() ? { slug: slug.trim() } : {}),
                ...(brand.trim() ? { brand: brand.trim() } : {}),
                ...(shortDescription.trim() ? { shortDescription: shortDescription.trim() } : {}),
                ...(description.trim() ? { description: description.trim() } : {}),
                ...(image.trim() ? { primaryImageId: image.trim() } : {}),
                ...(price.trim() ? { price: Number(price) } : {}),
                ...(variants.length ? { variants } : {}),
                visible: false,
            });
            upsertProduct(product);
            void reloadProducts();
            onCreated();
            setCreated(product);
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The product wasn’t created.");
        } finally {
            setBusy(false);
        }
    }

    if (created) {
        return (
            <div className="space-y-5 text-[13px]">
                <Notice>{created.name} ({created.code}) was created as a <b>draft</b>. It isn’t on the storefront yet. When it’s ready, use <b>Show</b> on its row.</Notice>
                <button className={btnSolid} onClick={onClose}>Done</button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-6 text-[13px]">
            <div><Notice>It’s saved as a draft, so nothing goes live half-made. Descriptions and photos beyond the basics are managed in the catalog.</Notice></div>
            <section>
                <Heading>Product</Heading>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Code (unique)"><input value={code} maxLength={50} onChange={(e) => setCode(e.target.value)} className={inputCls} /></Field>
                    <Field label="Name"><input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
                    <Field label="Web address (optional)"><input value={slug} placeholder="From the name if blank" onChange={(e) => setSlug(e.target.value)} className={inputCls} /></Field>
                    <Field label="Brand (optional)"><input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} /></Field>
                    <Field label="Short description (optional)" className="col-span-2"><input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className={inputCls} /></Field>
                    <Field label="Description (optional)" className="col-span-2"><textarea value={description} rows={3} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></Field>
                    <Field label="Main image path (optional, max 50)" className="col-span-2"><input value={image} placeholder="/images/name/hero.jpg" aria-invalid={image.length > 50} onChange={(e) => setImage(e.target.value)} className={inputCls} /></Field>
                </div>
                <p className="m-0 mt-2 text-[11px] text-black/45">Images are files in the storefront’s assets, referenced by path. They aren’t uploaded here.</p>
            </section>

            <section>
                <Heading>Price</Heading>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Currency"><input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value)} className={`${inputCls} uppercase`} /></Field>
                    <Field label="Price"><input value={price} inputMode="decimal" placeholder={rows.length ? "Optional: highest variant if blank" : "Required without variants"} aria-invalid={!!price.trim() && !validPrice(price)} onChange={(e) => setPrice(e.target.value)} className={inputCls} /></Field>
                </div>
            </section>

            <section>
                <Heading>Variants (optional){/^[A-Za-z]{3}$/.test(currency) ? ` · prices in ${currency.toUpperCase()}` : ""}</Heading>
                <VariantRowsEditor rows={rows} onChange={setRows} currency={currency} />
                <p className="m-0 mt-2 text-[11px] text-black/45">Without variants the product gets one variant that uses its code as the SKU. A variant with no price uses the product price. Variants always use the product’s currency. Stock isn’t tracked: items are made to order.</p>
            </section>

            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-3">
                <button className={btnSolid} disabled={!valid || busy}>{busy ? "Creating..." : "Create as draft"}</button>
                <button type="button" className={btn} disabled={busy} onClick={onClose}>Cancel</button>
            </div>
        </form>
    );
}
