// global imports
import { useEffect, useMemo, useRef, useState } from "react";

// local imports
import { fetchProduct, fetchQuote } from "../shared";
import { formatMoney } from "../shared";
import type { Quote, StorefrontVariant } from "../storefront-types";
import { createManualOrder, UnauthorizedError } from "../api";
import { useAdminData } from "../data";
import { Notice, btn, btnSolid, inputCls } from "../ui";
import type { CreateOrderResult, ManualOrderSource, ManualPaymentMethod } from "../types";

const SOURCES: { id: ManualOrderSource; label: string }[] = [
    { id: "WHATSAPP", label: "WhatsApp" }, { id: "IN_STORE", label: "In store" }, { id: "PHONE", label: "Phone" }, { id: "OTHER", label: "Other" },
];
const METHODS: { id: ManualPaymentMethod; label: string }[] = [
    { id: "CASH", label: "Cash" }, { id: "BANK_TRANSFER", label: "Bank transfer" }, { id: "MOBILE_MONEY", label: "Mobile money" }, { id: "CHECK", label: "Cheque" }, { id: "OTHER", label: "Other" },
];

interface Row { key: number; slug: string; sku: string; qty: string }
type Variants = StorefrontVariant[] | "loading" | "error";

const variantLabel = (v: StorefrontVariant) =>
    v.name ?? (Object.values(v.optionValues ?? {}).join(" · ") || v.sku);

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
    <label className={`block ${className}`}><span className="mb-1 block text-[11px] text-black/50">{label}</span>{children}</label>
);
const Heading = ({ children }: { children: React.ReactNode }) => (
    <p className="m-0 mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">{children}</p>
);

export function NewOrder({ onClose, onCreated }: { onClose: () => void; onCreated: (orderNumber: string) => void }) {
    const { token, unauthorized, liveProducts, refresh } = useAdminData();

    const [first, setFirst] = useState("");
    const [last, setLast] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [addr1, setAddr1] = useState("");
    const [addr2, setAddr2] = useState("");
    const [city, setCity] = useState("");
    const [region, setRegion] = useState("");
    const [postal, setPostal] = useState("");
    const [country, setCountry] = useState("");
    const [rows, setRows] = useState<Row[]>([{ key: 1, slug: "", sku: "", qty: "1" }]);
    const [discountCode, setDiscountCode] = useState("");
    const [notes, setNotes] = useState("");
    const [source, setSource] = useState<ManualOrderSource>("WHATSAPP");
    const [alreadyPaid, setAlreadyPaid] = useState(false);
    const [method, setMethod] = useState<ManualPaymentMethod>("CASH");
    const [reference, setReference] = useState("");

    const [variants, setVariants] = useState<Record<string, Variants>>({});
    const [quote, setQuote] = useState<Quote | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CreateOrderResult | null>(null);
    const [copied, setCopied] = useState(false);
    const nextKey = useRef(2);

    function chooseProduct(key: number, slug: string) {
        setRows((rs) => rs.map((r) => (r.key === key ? { ...r, slug, sku: "" } : r)));
        if (!slug || variants[slug]) return;
        setVariants((v) => ({ ...v, [slug]: "loading" }));
        fetchProduct(slug)
            .then((p) => setVariants((v) => ({ ...v, [slug]: p.variants })))
            .catch(() => setVariants((v) => ({ ...v, [slug]: "error" })));
    }
    const patchRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

    const qtyOf = (r: Row) => { const n = Number(r.qty); return Number.isInteger(n) && n >= 1 && n <= 20 ? n : 0; };
    const items = useMemo(() => rows.filter((r) => r.sku && qtyOf(r)).map((r) => ({ sku: r.sku, quantity: qtyOf(r) })), [rows]);
    const itemsComplete = rows.length > 0 && items.length === rows.length;
    const countryOk = /^[A-Za-z]{2}$/.test(country);
    const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

    // The server prices the basket: the same quote the website shows, with shipping and any discount applied.
    useEffect(() => {
        setQuote(null);
        setQuoteError(null);
        if (!itemsComplete || !countryOk) return;
        let live = true;
        const timer = setTimeout(() => {
            fetchQuote({ items, country: country.toUpperCase(), ...(emailOk ? { email: email.trim() } : {}), ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}) })
                .then((q) => { if (live) setQuote(q); })
                .catch((err) => { if (live) setQuoteError(err instanceof Error ? err.message : "Couldn’t price this basket."); });
        }, 500);
        return () => { live = false; clearTimeout(timer); };
    }, [items, itemsComplete, country, countryOk, email, emailOk, discountCode]);

    const valid = first.trim() && last.trim() && emailOk && addr1.trim() && city.trim() && region.trim() && postal.trim() && countryOk && itemsComplete;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError(null);
        try {
            const name = `${first.trim()} ${last.trim()}`;
            const res = await createManualOrder(token, {
                order: {
                    items,
                    customer: { firstName: first.trim(), lastName: last.trim(), email: email.trim(), phone: phone.trim() },
                    shippingAddress: {
                        recipientName: name, recipientPhone: phone.trim(),
                        address1: addr1.trim(), address2: addr2.trim(),
                        city: city.trim(), region: region.trim(), postalCode: postal.trim(), country: country.toUpperCase(),
                    },
                    ...(notes.trim() ? { notes: notes.trim() } : {}),
                    ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
                },
                source, alreadyPaid,
                ...(alreadyPaid ? { paymentMethod: method, ...(reference.trim() ? { paymentReference: reference.trim() } : {}) } : {}),
            });
            setResult(res);
            refresh();
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The order wasn’t created.");
        } finally {
            setBusy(false);
        }
    }

    async function copyLink(link: string) {
        try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
        catch { window.prompt("Copy this payment link", link); }
    }

    if (result) {
        const o = result.order;
        return (
            <div className="space-y-5 text-[13px]">
                <Notice>Order {o.orderNumber} created for {o.customerName || "the customer"}: {formatMoney(o.grandTotal, o.currency)}.</Notice>
                {result.paymentLink ? (
                    <div className="space-y-2">
                        <Heading>Payment link</Heading>
                        <p className="m-0 text-black/60">Send this to the customer so they can pay by card. The order stays “Awaiting payment” until they do.</p>
                        <input readOnly value={result.paymentLink} onFocus={(e) => e.currentTarget.select()} className={inputCls} />
                        <button className={btn} onClick={() => void copyLink(result.paymentLink!)}>{copied ? "Copied" : "Copy link"}</button>
                    </div>
                ) : <p className="m-0 text-black/60">It’s recorded as paid, so it’s ready to ship.</p>}
                <div className="flex gap-3 border-t border-[var(--a-border-soft)] pt-5">
                    <button className={btnSolid} onClick={() => onCreated(o.orderNumber)}>View order</button>
                    <button className={btn} onClick={onClose}>Done</button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-6 text-[13px]">
            <section>
                <Heading>Customer</Heading>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="First name"><input value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} /></Field>
                    <Field label="Last name"><input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} /></Field>
                    <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!email && !emailOk} className={inputCls} /></Field>
                    <Field label="Phone (optional)"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
                </div>
            </section>

            <section>
                <Heading>Ship to</Heading>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Address" className="col-span-2"><input value={addr1} onChange={(e) => setAddr1(e.target.value)} className={inputCls} /></Field>
                    <Field label="Address line 2 (optional)" className="col-span-2"><input value={addr2} onChange={(e) => setAddr2(e.target.value)} className={inputCls} /></Field>
                    <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
                    <Field label="Region / state"><input value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls} /></Field>
                    <Field label="Postal code"><input value={postal} onChange={(e) => setPostal(e.target.value)} className={inputCls} /></Field>
                    <Field label="Country (2 letters, e.g. GH)"><input value={country} maxLength={2} onChange={(e) => setCountry(e.target.value)} aria-invalid={!!country && !countryOk} className={`${inputCls} uppercase`} /></Field>
                </div>
            </section>

            <section>
                <Heading>Items</Heading>
                <div className="space-y-2">
                    {rows.map((r) => {
                        const vs = r.slug ? variants[r.slug] : undefined;
                        return (
                            <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_64px_24px] items-center gap-2">
                                <select value={r.slug} onChange={(e) => chooseProduct(r.key, e.target.value)} className={inputCls} aria-label="Product">
                                    <option value="">Product…</option>
                                    {liveProducts.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
                                </select>
                                <select value={r.sku} disabled={!Array.isArray(vs)} onChange={(e) => patchRow(r.key, { sku: e.target.value })} className={inputCls} aria-label="Option">
                                    <option value="">{vs === "loading" ? "Loading…" : vs === "error" ? "Couldn’t load" : "Option…"}</option>
                                    {Array.isArray(vs) && vs.map((v) => <option key={v.sku} value={v.sku}>{variantLabel(v)}{v.price != null ? ` · ${formatMoney(v.price, v.currency)}` : ""}{v.available ? "" : " (unavailable)"}</option>)}
                                </select>
                                <input value={r.qty} inputMode="numeric" onChange={(e) => patchRow(r.key, { qty: e.target.value })} aria-label="Quantity" className={inputCls} />
                                <button type="button" aria-label="Remove item" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="a-x">×</button>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3"><button type="button" className={btn} disabled={rows.length >= 20} onClick={() => setRows((rs) => [...rs, { key: nextKey.current++, slug: "", sku: "", qty: "1" }])}>Add item</button></div>
            </section>

            <section className="grid grid-cols-2 gap-3">
                <Field label="Discount code (optional)"><input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} maxLength={60} className={inputCls} /></Field>
                <Field label="Source">
                    <select value={source} onChange={(e) => setSource(e.target.value as ManualOrderSource)} className={inputCls}>
                        {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </Field>
                <Field label="Notes (optional)" className="col-span-2"><input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} className={inputCls} /></Field>
            </section>

            <section className="space-y-3">
                <label className="flex items-center gap-2"><input type="checkbox" checked={alreadyPaid} onChange={(e) => setAlreadyPaid(e.target.checked)} /> Already paid</label>
                {alreadyPaid ? (
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Paid by">
                            <select value={method} onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)} className={inputCls}>
                                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Reference (optional)"><input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} /></Field>
                    </div>
                ) : <p className="m-0 text-[12px] text-black/50">Not paid yet: you’ll get a card payment link to send the customer.</p>}
            </section>

            <section className="border-t border-[var(--a-border-soft)] pt-4">
                {quote ? (
                    <div className="space-y-1">
                        <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(quote.subtotal, quote.currency)}</span></div>
                        {quote.discountTotal > 0 && <div className="flex justify-between"><span>Discount</span><span>−{formatMoney(quote.discountTotal, quote.currency)}</span></div>}
                        <div className="flex justify-between"><span>Shipping</span><span>{quote.shippingWaived ? "Complimentary" : formatMoney(quote.shippingTotal, quote.currency)}</span></div>
                        <div className="flex justify-between border-t border-[var(--a-border-soft)] pt-2 font-medium"><span>Total</span><span>{formatMoney(quote.grandTotal, quote.currency)}</span></div>
                        {quote.settlementAmount != null && quote.settlementCurrency && <div className="flex justify-between text-black/55"><span>Charged as</span><span>{formatMoney(quote.settlementAmount, quote.settlementCurrency)}</span></div>}
                        {discountCode.trim() && quote.discountTotal === 0 && <p className="m-0 pt-1 text-[12px] text-black/55">That code doesn’t apply to these items.</p>}
                    </div>
                ) : quoteError ? <Notice tone="error">{quoteError}</Notice>
                    : <p className="m-0 text-black/45">{itemsComplete && countryOk ? "Pricing…" : "Choose the items and a country to see the total."}</p>}
            </section>

            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-3">
                <button className={btnSolid} disabled={!valid || busy}>{busy ? "Creating..." : "Create order"}</button>
                <button type="button" className={btn} disabled={busy} onClick={onClose}>Cancel</button>
            </div>
        </form>
    );
}
