// global imports
import { useRef, useState } from "react";

// local imports
import { btn, btnSolid, inputCls } from "../ui";
import type { CreateProductVariant } from "../types";

export interface VariantRow { key: number; sku: string; piece: string; colour: string; size: string; price: string }

export const validPrice = (raw: string) => /^\d+(\.\d{1,2})?$/.test(raw.trim()) && Number(raw) >= 0.01;
export const blankRow = (key: number): VariantRow => ({ key, sku: "", piece: "", colour: "", size: "", price: "" });

/** Whether every row has a SKU, no SKU repeats, and any price entered is valid. */
export function rowsState(rows: VariantRow[]) {
    const skus = rows.map((r) => r.sku.trim().toLowerCase()).filter(Boolean);
    return { dupSku: skus.length !== new Set(skus).size, ok: rows.every((r) => r.sku.trim() && (!r.price.trim() || validPrice(r.price))) };
}

/** The request shape for the rows; `productName` prefixes each variant's display name. */
export function toVariants(rows: VariantRow[], productName: string): CreateProductVariant[] {
    return rows.map((r) => {
        const optionValues = Object.fromEntries(Object.entries({ piece: r.piece, colour: r.colour, size: r.size }).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
        const label = [r.piece.trim(), r.colour.trim() && `in ${r.colour.trim()}`, r.size.trim() && `UK ${r.size.trim()}`].filter(Boolean).join(" ");
        return {
            sku: r.sku.trim(),
            ...(label ? { name: `${productName} ${label}` } : {}),
            ...(Object.keys(optionValues).length ? { optionValues } : {}),
            ...(r.price.trim() ? { price: Number(r.price) } : {}),
        };
    });
}

/** The editable variant rows, shared by the Add product form and a product's Variants tab. */
export function VariantRowsEditor({ rows, onChange, currency }: { rows: VariantRow[]; onChange: (next: VariantRow[]) => void; currency: string }) {
    const nextKey = useRef(Math.max(0, ...rows.map((r) => r.key)) + 1);
    const patch = (key: number, p: Partial<VariantRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...p } : r)));
    const { dupSku } = rowsState(rows);
    const ccy = currency.toUpperCase();
    return (
        <>
            <div className="space-y-2">
                {rows.map((r) => (
                    <div key={r.key} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_56px_72px_24px] items-center gap-2">
                        <input value={r.sku} placeholder="SKU" aria-label="SKU" onChange={(e) => patch(r.key, { sku: e.target.value })} className={inputCls} />
                        <input value={r.piece} placeholder="Piece" aria-label="Piece" onChange={(e) => patch(r.key, { piece: e.target.value })} className={inputCls} />
                        <input value={r.colour} placeholder="Colour" aria-label="Colour" onChange={(e) => patch(r.key, { colour: e.target.value })} className={inputCls} />
                        <input value={r.size} placeholder="Size" aria-label="Size" onChange={(e) => patch(r.key, { size: e.target.value })} className={inputCls} />
                        <input value={r.price} placeholder={currency.length === 3 ? ccy : "Price"} aria-label={`Variant price in ${ccy}`} inputMode="decimal" aria-invalid={!!r.price.trim() && !validPrice(r.price)} onChange={(e) => patch(r.key, { price: e.target.value })} className={inputCls} />
                        <button type="button" aria-label="Remove variant" onClick={() => onChange(rows.filter((x) => x.key !== r.key))} className="a-x">×</button>
                    </div>
                ))}
            </div>
            {dupSku && <p className="m-0 mt-2 text-[12px] text-[var(--a-st-can)]">Each SKU must be different.</p>}
            <div className="mt-3"><button type="button" className={btn} disabled={rows.length >= 100} onClick={() => onChange([...rows, blankRow(nextKey.current++)])}>Add variant</button></div>
        </>
    );
}

const UK_SIZES = ["8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32", "34", "36"];
const initials = (colour: string) => colour.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("");

/**
 * Many sizes of one colour at once: tick the sizes and one row per size is added, with the SKU
 * built from a prefix and the size. Sizes already on the form or the product are skipped.
 */
export function SizeGenerator({ codeHint, taken, rows, onChange }: { codeHint: string; taken: Set<string>; rows: VariantRow[]; onChange: (next: VariantRow[]) => void }) {
    const [colour, setColour] = useState("");
    const [piece, setPiece] = useState("");
    const [prefix, setPrefix] = useState("");
    const [price, setPrice] = useState("");
    const [picked, setPicked] = useState<string[]>([]);
    const [custom, setCustom] = useState("");

    const skuPrefix = (prefix.trim() || [codeHint, initials(colour)].filter(Boolean).join("-")).replace(/-+$/, "");
    const sizes = [...new Set([...picked, ...custom.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean)])];
    const used = new Set([...rows.map((r) => r.sku.trim().toLowerCase()), ...taken]);
    const fresh = sizes.filter((sz) => !used.has(`${skuPrefix}-${sz}`.toLowerCase()));
    const priceOk = !price.trim() || validPrice(price);
    const toggle = (sz: string) => setPicked((cur) => (cur.includes(sz) ? cur.filter((x) => x !== sz) : [...cur, sz]));

    function generate() {
        let key = Math.max(0, ...rows.map((r) => r.key)) + 1;
        // A single blank starter row is replaced rather than left behind.
        const kept = rows.filter((r) => r.sku.trim() || r.piece.trim() || r.colour.trim() || r.size.trim() || r.price.trim());
        onChange([...kept, ...fresh.map((size) => ({ key: key++, sku: `${skuPrefix}-${size}`, piece: piece.trim(), colour: colour.trim(), size, price: price.trim() }))]);
        setPicked([]);
        setCustom("");
    }

    const label = "mb-1 block text-[11px] text-black/50";
    return (
        <div className="space-y-3 border border-dashed border-[var(--a-border)] p-3">
            <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-black/50">Add several sizes at once</p>
            <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={label}>Colour (must match the colourway name)</span><input value={colour} aria-label="Colour for all sizes" onChange={(e) => setColour(e.target.value)} className={inputCls} /></label>
                <label className="block"><span className={label}>Piece (optional)</span><input value={piece} aria-label="Piece for all sizes" onChange={(e) => setPiece(e.target.value)} className={inputCls} /></label>
                <label className="block"><span className={label}>SKU starts with</span><input value={prefix} placeholder={[codeHint, initials(colour)].filter(Boolean).join("-")} aria-label="SKU prefix" onChange={(e) => setPrefix(e.target.value)} className={inputCls} /></label>
                <label className="block"><span className={label}>Price (optional)</span><input value={price} inputMode="decimal" aria-label="Price for all sizes" aria-invalid={!priceOk} onChange={(e) => setPrice(e.target.value)} className={inputCls} /></label>
            </div>
            <div>
                <span className={label}>Sizes</span>
                <div className="flex flex-wrap gap-1.5">
                    {UK_SIZES.map((sz) => (
                        <button key={sz} type="button" aria-pressed={picked.includes(sz)} onClick={() => toggle(sz)} className={picked.includes(sz) ? btnSolid : btn}>{sz}</button>
                    ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" className="a-link" onClick={() => setPicked(picked.length === UK_SIZES.length ? [] : [...UK_SIZES])}>{picked.length === UK_SIZES.length ? "Clear sizes" : "Select all"}</button>
                    <input value={custom} placeholder="Other sizes, e.g. XS, S, M" aria-label="Other sizes" onChange={(e) => setCustom(e.target.value)} className={`${inputCls} w-[220px]`} />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button type="button" className={btn} disabled={!colour.trim() || !skuPrefix || !priceOk || !fresh.length} onClick={generate}>{fresh.length ? `Add ${fresh.length} ${fresh.length === 1 ? "row" : "rows"}` : "Add rows"}</button>
                {sizes.length > fresh.length && <span className="text-[11.5px] text-black/50">{sizes.length - fresh.length} already added, skipped</span>}
            </div>
        </div>
    );
}
