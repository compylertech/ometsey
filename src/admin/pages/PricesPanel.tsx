// global imports
import { useState } from "react";

// local imports
import { UnauthorizedError, updateProductPrices } from "../api";
import { useAdminData } from "../data";
import { Notice, btn, btnSolid, inputCls } from "../ui";
import type { AdminProductSummary, ProductPriceChange } from "../types";

/** At least 0.01 and at most two decimals, the rule the server enforces. */
const validPrice = (raw: string) => /^\d+(\.\d{1,2})?$/.test(raw.trim()) && Number(raw) >= 0.01;
const key = (currency: string, label: string) => `${currency}|${label}`;

/**
 * The main price per piece, then a section per other currency. In another currency a price is
 * either entered (fixed, charged exactly) or left blank, in which case buyers see the main price
 * converted at the stored exchange rate. Only what moved is sent.
 */
export function PricesPanel({ product, onDone }: { product: AdminProductSummary; onDone: () => void }) {
    const { token, unauthorized, upsertProduct } = useAdminData();
    const main = product.currency.toUpperCase();
    const known = product.currencyPrices ?? [];

    const fixedOf = (currency: string, label: string) => known.find((c) => c.currency === currency)?.prices.find((r) => r.label === label);
    const initial = (currency: string, label: string) => {
        if (currency === main) return String(product.prices.find((r) => r.label === label)?.price ?? "");
        const row = fixedOf(currency, label);
        return row?.fixed && row.price !== null ? String(row.price) : "";
    };

    const [extra, setExtra] = useState<string[]>([]);
    const [newCurrency, setNewCurrency] = useState("");
    const currencies = [...known.map((c) => c.currency), ...extra];
    const [values, setValues] = useState<Record<string, string>>(() => {
        const all: Record<string, string> = {};
        for (const r of product.prices) {
            all[key(main, r.label)] = initial(main, r.label);
            for (const c of known) all[key(c.currency, r.label)] = initial(c.currency, r.label);
        }
        return all;
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const valueOf = (currency: string, label: string) => (values[key(currency, label)] ?? "").trim();

    const changes: ProductPriceChange[] = [];
    let invalid = false;
    for (const r of product.prices) {
        const now = valueOf(main, r.label);
        if (!validPrice(now)) invalid = true;
        else if (now !== initial(main, r.label)) changes.push({ label: r.label, price: Number(now) });
        for (const currency of currencies) {
            const cur = valueOf(currency, r.label);
            const was = initial(currency, r.label);
            if (cur === was) continue;
            if (!cur) changes.push({ label: r.label, price: null, currency });
            else if (!validPrice(cur)) invalid = true;
            else changes.push({ label: r.label, price: Number(cur), currency });
        }
    }

    const candidate = newCurrency.trim().toUpperCase();
    const canAdd = /^[A-Z]{3}$/.test(candidate) && candidate !== main && !currencies.includes(candidate);

    async function save() {
        setBusy(true);
        setError(null);
        try {
            upsertProduct(await updateProductPrices(token, product.id, changes));
            onDone();
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The prices weren’t saved.");
        } finally {
            setBusy(false);
        }
    }

    const set = (currency: string, label: string, next: string) => setValues((v) => ({ ...v, [key(currency, label)]: next }));
    const rowsOf = [main, ...currencies];
    const grid = { gridTemplateColumns: `minmax(150px,1.1fr) repeat(${product.prices.length}, minmax(120px,1fr))` };

    return (
        <div className="space-y-5 text-[13px]">
            <Notice>Changes apply to new orders straight away. Existing orders keep the price they were charged. A discount link’s 50% limit follows the new price.</Notice>

            <div className="overflow-x-auto">
                <div className="min-w-max space-y-3" role="table" aria-label="Prices by currency">
                    <div className="grid items-end gap-3" style={grid} role="row">
                        <span className="text-[11px] uppercase tracking-[0.08em] text-black/50" role="columnheader">Currency</span>
                        {product.prices.map((r) => <span key={r.label} className="text-[12.5px] font-semibold" role="columnheader">{r.label}</span>)}
                    </div>
                    {rowsOf.map((currency) => {
                        const c = known.find((x) => x.currency === currency);
                        const isMain = currency === main;
                        const isNew = extra.includes(currency);
                        return (
                            <div key={currency} className="grid items-center gap-3 border-t border-[var(--a-border-soft)] pt-3" style={grid} role="row">
                                <div role="rowheader">
                                    <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                                        {currency}
                                        {isMain && <span className="text-[10px] font-normal uppercase tracking-[0.06em] text-black/45">main</span>}
                                        {isNew && <button type="button" aria-label={`Remove ${currency}`} onClick={() => setExtra((x) => x.filter((e) => e !== currency))} className="a-x">×</button>}
                                    </span>
                                    <span className="block text-[11px] text-black/45">
                                        {isMain ? "Charged as entered" : c?.rate != null ? `Blank = converted at ${c.rate}` : "No exchange rate set"}
                                    </span>
                                </div>
                                {product.prices.map((r) => {
                                    const cur = valueOf(currency, r.label);
                                    const row = isMain ? undefined : fixedOf(currency, r.label);
                                    const hint = row && !row.fixed && row.price !== null ? `${row.price} converted` : isMain ? "" : "Not offered";
                                    const bad = isMain ? !validPrice(cur) : !!cur && !validPrice(cur);
                                    return (
                                        <label key={r.label} className="relative block" role="cell">
                                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-black/40">{currency}</span>
                                            <input value={values[key(currency, r.label)] ?? ""} inputMode="decimal" placeholder={hint} aria-label={`${r.label} in ${currency}`} aria-invalid={bad} onChange={(e) => set(currency, r.label, e.target.value)} className={`${inputCls} pl-11!`} />
                                        </label>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            <section className="border-t border-[var(--a-border-soft)] pt-4">
                <p className="m-0 mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">Add a currency</p>
                <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (canAdd) { setExtra((x) => [...x, candidate]); setNewCurrency(""); } }}>
                    <input value={newCurrency} maxLength={3} placeholder="e.g. GHS" aria-label="Currency code" onChange={(e) => setNewCurrency(e.target.value)} className={`${inputCls} w-[110px] uppercase`} />
                    <button className={btn} disabled={!canAdd}>Add</button>
                </form>
                <p className="m-0 mt-2 text-[11px] text-black/45">Add as many as you sell in. A price you enter is charged exactly. Leave it blank and buyers see the main price converted at the exchange rate, if one is set. Clearing a price you entered goes back to the converted one. The main currency can’t be changed.</p>
            </section>

            {invalid && <p className="m-0 text-[12px] text-black/55">Each price must be at least 0.01 with at most two decimals.</p>}
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-3">
                <button className={btnSolid} disabled={busy || invalid || !changes.length} onClick={() => void save()}>{busy ? "Saving..." : changes.length ? `Save ${changes.length === 1 ? "price" : `${changes.length} prices`}` : "Save"}</button>
                <button className={btn} disabled={busy} onClick={onDone}>Cancel</button>
            </div>
        </div>
    );
}
