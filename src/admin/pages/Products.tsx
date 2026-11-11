// global imports
import { useMemo, useState } from "react";

// local imports
import { formatMoney } from "../shared";
import { archiveProduct, setProductVisible, UnauthorizedError } from "../api";
import { useAdminData } from "../data";
import { usePaged, useSort } from "../hooks";
import { Card, Drawer, Empty, FilterField, Notice, PageHead, Pagination, SortTh, StatePill, Td, Th, btn, btnDanger, btnSolid, inputBare, linkBtn } from "../ui";
import type { AdminProductSummary } from "../types";
import { AddProduct } from "./AddProduct";
import { ExchangeRates } from "./ExchangeRates";
import { ProductDrawerBody } from "./ProductDrawer";
import { PricesPanel } from "./PricesPanel";
import { Revenue } from "./Revenue";
import { DataNotices } from "./notices";

const statusOf = (p: AdminProductSummary) => (p.visible === false ? (p.status === "ARCHIVED" ? "Archived" : "Draft") : "Live");
const STATUS_COLOR: Record<string, string> = { Live: "var(--a-st-done)", Draft: "var(--a-st-pay)", Archived: "var(--a-st-ref)" };

type Panel = { kind: "prices" | "archive" | "view"; product: AdminProductSummary } | { kind: "add" } | { kind: "rates" } | null;

function ArchivePanel({ product, onDone }: { product: AdminProductSummary; onDone: () => void }) {
    const { token, unauthorized, upsertProduct } = useAdminData();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function archive() {
        setBusy(true);
        setError(null);
        try {
            upsertProduct(await archiveProduct(token, product.id));
            onDone();
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The product wasn’t archived.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-4 text-[13px]">
            <p className="m-0 border border-[var(--a-st-can)] p-4">
                Archive <b>{product.name}</b>? It comes off the storefront, its page stops working and its discount links stop working. Past orders keep it, and you can show it again later.
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-3">
                <button className={btnDanger} disabled={busy} onClick={() => void archive()}>{busy ? "Archiving..." : "Archive product"}</button>
                <button className={btn} disabled={busy} onClick={onDone}>Keep it</button>
            </div>
        </div>
    );
}

/**
 * The catalog: what is on sale, what has sold, and the few changes the admin API allows (show or
 * hide, archive, prices, add a product). Sold and revenue come from the server, per product id.
 */
export function Products() {
    const { products, token, unauthorized, upsertProduct, loading } = useAdminData();
    const [q, setQ] = useState("");
    const [min, setMin] = useState("");
    const [max, setMax] = useState("");
    const [showHidden, setShowHidden] = useState(false);
    const [panel, setPanel] = useState<Panel>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rowError, setRowError] = useState<string | null>(null);

    const hiddenCount = products.filter((p) => p.visible === false).length;
    const filtered = useMemo(() => products.filter((p) =>
        (showHidden || p.visible !== false)
        && (!q.trim() || `${p.name} ${p.code} ${p.slug}`.toLowerCase().includes(q.trim().toLowerCase()))
        && (!min || (p.minPrice ?? 0) >= Number(min)) && (!max || (p.minPrice ?? 0) <= Number(max))), [products, showHidden, q, min, max]);

    const { sorted, sort, toggle } = useSort(filtered, {
        name: (p) => p.name, price: (p) => p.minPrice ?? 0, sold: (p) => p.sold ?? 0, revenue: (p) => p.revenue ?? 0,
    });
    const paged = usePaged(sorted, JSON.stringify([showHidden, q, min, max, sort]));
    const dirty = !!(q || min || max);
    const clear = () => { setQ(""); setMin(""); setMax(""); };

    async function toggleVisible(p: AdminProductSummary) {
        setBusyId(p.id);
        setRowError(null);
        try {
            upsertProduct(await setProductVisible(token, p.id, p.visible === false));
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setRowError(err instanceof Error ? `${p.name}: ${err.message}` : "That didn’t go through.");
        } finally {
            setBusyId(null);
        }
    }

    const hasSales = products.some((p) => p.sold !== undefined);
    const closePanel = () => setPanel(null);

    return (
        <>
            <PageHead title="Products" subtitle={`${products.length - hiddenCount} live${hiddenCount ? ` · ${hiddenCount} hidden` : ""}`}>
                <button className={btn} onClick={() => setPanel({ kind: "rates" })}>Exchange rates</button>
                <button className={btnSolid} onClick={() => setPanel({ kind: "add" })}>Add product</button>
            </PageHead>
            <DataNotices of={["products"]} />

            <div className="mb-5 flex flex-wrap items-end gap-3">
                <FilterField label="Search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or code" className={`${inputBare} w-[200px]`} /></FilterField>
                <FilterField label="From price">
                    <span className="flex items-center gap-1.5">
                        <input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min" className={`${inputBare} w-[84px]`} />
                        <span className="text-black/30">–</span>
                        <input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max" className={`${inputBare} w-[84px]`} />
                    </span>
                </FilterField>
                <label className="flex items-center gap-2 pb-2 text-[12.5px]"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Show hidden{hiddenCount ? ` (${hiddenCount})` : ""}</label>
                {dirty && <button onClick={clear} className={`${linkBtn} pb-2`}>Clear filters</button>}
            </div>
            {rowError && <div className="mb-5"><Notice tone="error">{rowError}</Notice></div>}

            <Card flush>
                {sorted.length ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] border-collapse">
                                <thead><tr>
                                    <SortTh label="Product" k="name" sort={sort} toggle={toggle} /><Th>Status</Th><SortTh label="Price" k="price" sort={sort} toggle={toggle} />
                                    <SortTh label="Sold" k="sold" sort={sort} toggle={toggle} right /><SortTh label="Revenue" k="revenue" sort={sort} toggle={toggle} right /><Th />
                                </tr></thead>
                                <tbody>{paged.rows.map((p) => {
                                    const status = statusOf(p);
                                    const muted = status !== "Live" ? "opacity-60" : "";
                                    return (
                                        <tr key={p.id} className="border-t border-[var(--a-border-soft)]">
                                            <Td className={muted}>
                                                <span className="flex items-center gap-3">
                                                    {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-14 w-10 shrink-0 object-cover" /> : <span className="h-14 w-10 shrink-0 bg-[var(--a-subtle)]" />}
                                                    <span>{p.name}<span className="block text-[12px] text-black/50">{p.code}</span></span>
                                                </span>
                                            </Td>
                                            <Td><StatePill label={status} color={STATUS_COLOR[status]} /></Td>
                                            <Td className={muted}>
                                                {p.prices.length ? p.prices.map((row) => (
                                                    <span key={row.label} className="block">{formatMoney(row.price, p.currency)}{p.prices.length > 1 && <span className="text-black/50"> · {row.label}</span>}</span>
                                                )) : "—"}
                                                {!!p.currencyPrices?.length && <span className="block text-[11px] text-black/45">also {p.currencyPrices.map((c) => c.currency).join(", ")}</span>}
                                            </Td>
                                            <Td right className={muted}>{p.sold ?? "—"}</Td><Td right className={muted}><Revenue p={p} /></Td>
                                            <Td right>
                                                <span className="inline-flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                                                    <button className={linkBtn} onClick={() => setPanel({ kind: "view", product: p })}>View</button>
                                                    <button className={linkBtn} disabled={!p.prices.length || p.status === "ARCHIVED"} onClick={() => setPanel({ kind: "prices", product: p })}>Edit prices</button>
                                                    <button className={linkBtn} disabled={busyId === p.id || (status !== "Live" && !p.prices.length)} onClick={() => void toggleVisible(p)}>{busyId === p.id ? "…" : status === "Live" ? "Hide" : "Show"}</button>
                                                    {p.status !== "ARCHIVED" && <button className={linkBtn} onClick={() => setPanel({ kind: "archive", product: p })}>Archive</button>}
                                                </span>
                                            </Td>
                                        </tr>
                                    );
                                })}</tbody>
                            </table>
                        </div>
                        <Pagination p={paged} />
                    </>
                ) : <Empty>{loading ? "Loading…" : products.length ? <>No products match. {dirty && <button onClick={clear} className={linkBtn}>Clear filters</button>}</> : "No products."}</Empty>}
            </Card>
            {hasSales && <p className="m-0 mt-3 text-[11px] text-black/40">Sold and revenue count lines on paid orders for each product. Unpaid, cancelled and fully refunded orders count for nothing.</p>}

            <Drawer wide open={panel?.kind === "view"} onClose={closePanel} title={panel?.kind === "view" ? panel.product.name : "Product"}>
                {panel?.kind === "view" && <ProductDrawerBody key={panel.product.id} product={panel.product} />}
            </Drawer>
            <Drawer wide open={panel?.kind === "prices"} onClose={closePanel} title={panel?.kind === "prices" ? `Prices: ${panel.product.name}` : "Prices"}>
                {panel?.kind === "prices" && <PricesPanel key={panel.product.id} product={panel.product} onDone={closePanel} />}
            </Drawer>
            <Drawer open={panel?.kind === "rates"} onClose={closePanel} title="Exchange rates">
                {panel?.kind === "rates" && <ExchangeRates />}
            </Drawer>
            <Drawer open={panel?.kind === "archive"} onClose={closePanel} title="Archive product">
                {panel?.kind === "archive" && <ArchivePanel key={panel.product.id} product={panel.product} onDone={closePanel} />}
            </Drawer>
            <Drawer open={panel?.kind === "add"} onClose={closePanel} title="Add product">
                {panel?.kind === "add" && <AddProduct onClose={closePanel} onCreated={() => setShowHidden(true)} />}
            </Drawer>
        </>
    );
}
