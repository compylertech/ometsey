// global imports
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

// local imports
import { formatMoney } from "../shared";
import { createDiscountLink, setDiscountLinkActive, UnauthorizedError } from "../api";
import { useAdminData } from "../data";
import { usePaged, useSort } from "../hooks";
import { Card, Empty, FilterField, Notice, PageHead, Pagination, SortTh, StatePill, Tabs, Td, Th, btn, btnSolid, fmtDate, inputBare, inputCls, linkBtn } from "../ui";
import type { AdminDiscountLink, AdminProductSummary, DiscountType } from "../types";
import { DataNotices } from "./notices";

/** Mirrors the 50%-off cap the server enforces, so a bad value is caught before it's sent. */
function floorFor(product: AdminProductSummary | null, type: DiscountType, value: number) {
    if (!product || !Number.isFinite(value) || value <= 0) return null;
    if (type === "PERCENTAGE") {
        return value > 50 ? "A discount link cannot take off more than 50%." : null;
    }
    if (product.minPrice === null) return null;
    const floor = product.minPrice * 0.5;
    if (value <= floor) return null;
    const cheapest = product.prices.reduce((min, p) => (p.price < min.price ? p : min), product.prices[0]);
    return cheapest
        ? `${cheapest.label} is ${formatMoney(cheapest.price, product.currency)}; a `
              + `${formatMoney(value, product.currency)} discount would take more than 50% off it `
              + `(floor is ${formatMoney(floor, product.currency)}).`
        : null;
}

const worth = (l: AdminDiscountLink) => (l.discountType === "PERCENTAGE" ? `${l.discountValue}% off` : `${formatMoney(l.discountValue, l.currency ?? "USD")} off`);
const linkFor = (l: AdminDiscountLink) => (l.productSlug ? `${window.location.origin}/live/product/${l.productSlug}?discount=${l.code}` : null);

type Tab = "ALL" | "ACTIVE" | "REVOKED";

export function Discounts() {
    const { token, unauthorized, products, liveProducts, links, setLinks, loading } = useAdminData();
    const [productId, setProductId] = useState("");
    const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
    const [value, setValue] = useState("");
    const [code, setCode] = useState("");
    const [note, setNote] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [rowError, setRowError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>("ALL");
    const [q, setQ] = useState("");
    const [productFilter, setProductFilter] = useState("");

    const selectedId = productId || liveProducts[0]?.id || "";
    const selected = useMemo(() => liveProducts.find((p) => p.id === selectedId) ?? null, [liveProducts, selectedId]);
    const numeric = parseFloat(value);
    const floorWarning = floorFor(selected, discountType, numeric);
    const canCreate = Boolean(selected) && Number.isFinite(numeric) && numeric > 0 && !floorWarning && !creating;

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!canCreate) return;
        setCreating(true);
        setCreateError(null);
        try {
            const created = await createDiscountLink(token, {
                productId: selectedId, discountType, discountValue: numeric,
                code: code.trim() || undefined, note: note.trim() || undefined,
            });
            setLinks((cur) => [created, ...cur]);
            setValue(""); setCode(""); setNote("");
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setCreateError((err as Error).message);
        } finally {
            setCreating(false);
        }
    }

    async function toggle(link: AdminDiscountLink) {
        setRowError(null);
        try {
            const updated = await setDiscountLinkActive(token, link.id, !link.active);
            setLinks((cur) => cur.map((l) => (l.id === updated.id ? updated : l)));
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setRowError((err as Error).message);
        }
    }

    async function copy(link: AdminDiscountLink) {
        const url = linkFor(link);
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(link.id);
            window.setTimeout(() => setCopiedId(null), 2000);
        } catch {
            window.prompt("Copy this link", url);
        }
    }

    const filtered = useMemo(() => links.filter((l) =>
        (tab === "ALL" || (tab === "ACTIVE" ? l.active : !l.active))
        && (!productFilter || l.productId === productFilter)
        && (!q.trim() || `${l.code} ${l.note ?? ""} ${l.productName}`.toLowerCase().includes(q.trim().toLowerCase()))), [links, tab, q, productFilter]);
    const { sorted, sort, toggle: toggleSort } = useSort(filtered, {
        code: (l) => l.code, product: (l) => l.productName, worth: (l) => l.discountValue, created: (l) => l.createdAt, status: (l) => (l.active ? "Active" : "Revoked"),
    });
    const paged = usePaged(sorted, JSON.stringify([tab, q, productFilter, sort]));
    const dirty = !!(q || productFilter);
    const count = (t: Tab) => (t === "ALL" ? links.length : links.filter((l) => (t === "ACTIVE" ? l.active : !l.active)).length);

    return (
        <>
            <PageHead title="Discounts" subtitle="Shareable links that take a set amount off one product" />
            <div className="mb-5"><Notice>Links are capped at 50% off, are tied to one product, and can be revoked but not deleted or given an expiry. Redemption is checked by the server at checkout.</Notice></div>
            <DataNotices of={["links", "products"]} />

            <div className="mb-6">
                <Card title="New discount link">
                    <form onSubmit={submit} noValidate className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <FilterField label="Product">
                                <select value={selectedId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
                                    {liveProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </FilterField>
                            <FilterField label="Discount type">
                                <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className={inputCls}>
                                    <option value="PERCENTAGE">Percentage off</option>
                                    <option value="FIXED_AMOUNT">Fixed amount off</option>
                                </select>
                            </FilterField>
                            <FilterField label={discountType === "PERCENTAGE" ? "Percent off" : `Amount off (${selected?.currency ?? "USD"})`}>
                                <input inputMode="decimal" value={value} placeholder={discountType === "PERCENTAGE" ? "20" : "50"} aria-invalid={Boolean(floorWarning)} onChange={(e) => setValue(e.target.value)} className={inputCls} />
                            </FilterField>
                            <FilterField label="Custom code (optional)">
                                <input value={code} placeholder="Generated if left blank" onChange={(e) => setCode(e.target.value)} className={inputCls} />
                            </FilterField>
                        </div>
                        {selected && <p className="m-0 text-[12px] text-black/50">{selected.prices.map((r) => `${r.label}: ${formatMoney(r.price, selected.currency)}`).join(" · ")}</p>}
                        {floorWarning && <Notice tone="error">{floorWarning}</Notice>}
                        <FilterField label="Note (optional, admin-only)">
                            <input value={note} placeholder="e.g. Instagram giveaway, Oct 2026" onChange={(e) => setNote(e.target.value)} className={inputCls} />
                        </FilterField>
                        <button className={btnSolid} disabled={!canCreate}>{creating ? "Creating..." : "Create discount link"}</button>
                        {createError && <Notice tone="error">{createError}</Notice>}
                    </form>
                </Card>
            </div>

            <div className="mb-5"><Tabs value={tab} onChange={setTab} items={[{ id: "ALL", label: "All", count: count("ALL") }, { id: "ACTIVE", label: "Active", count: count("ACTIVE") }, { id: "REVOKED", label: "Revoked", count: count("REVOKED") }]} /></div>
            <div className="mb-5 flex flex-wrap items-end gap-3">
                <FilterField label="Search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, note or product" className={`${inputBare} w-[200px]`} /></FilterField>
                <FilterField label="Product"><select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={`${inputBare} w-[160px]`}><option value="">All</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></FilterField>
                {dirty && <button onClick={() => { setQ(""); setProductFilter(""); }} className={`${linkBtn} pb-2`}>Clear filters</button>}
            </div>
            {rowError && <div className="mb-5"><Notice tone="error">{rowError}</Notice></div>}

            <Card flush>
                {sorted.length ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] border-collapse">
                                <thead><tr>
                                    <SortTh label="Code" k="code" sort={sort} toggle={toggleSort} /><SortTh label="Product" k="product" sort={sort} toggle={toggleSort} />
                                    <SortTh label="Discount" k="worth" sort={sort} toggle={toggleSort} /><SortTh label="Created" k="created" sort={sort} toggle={toggleSort} />
                                    <SortTh label="Status" k="status" sort={sort} toggle={toggleSort} /><Th />
                                </tr></thead>
                                <tbody>{paged.rows.map((l) => (
                                    <tr key={l.id} className="border-t border-[var(--a-border-soft)]">
                                        <Td className="font-medium">{l.code}{l.note && <span className="block text-[12px] font-normal text-black/50">{l.note}</span>}</Td>
                                        <Td>{l.productName}</Td><Td>{worth(l)}</Td><Td>{fmtDate(l.createdAt)}</Td>
                                        <Td><StatePill label={l.active ? "Active" : "Revoked"} color={l.active ? "var(--a-st-done)" : "var(--a-st-ref)"} /></Td>
                                        <Td right>
                                            <span className="inline-flex items-center gap-4">
                                                {linkFor(l) && <button className={btn} onClick={() => void copy(l)}>{copiedId === l.id ? "Copied" : "Copy link"}</button>}
                                                <button className={linkBtn} onClick={() => void toggle(l)}>{l.active ? "Revoke" : "Restore"}</button>
                                            </span>
                                        </Td>
                                    </tr>))}</tbody>
                            </table>
                        </div>
                        <Pagination p={paged} />
                    </>
                ) : <Empty>{loading ? "Loading…" : links.length ? "No links match." : "No discount links yet."}</Empty>}
            </Card>
        </>
    );
}
