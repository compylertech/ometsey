import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { Field, PageShell } from "@/components/Form"
import { createCheckout, fetchProductDetail, fetchQuote } from "@/lib/api"
import { COUNTRIES } from "@/lib/countries"
import type { CheckoutRequest, Quote } from "@/lib/storefront-types"
import { useCart } from "@/store/cart"
import { useMoney } from "@/store/market"
import { useProducts, useShopStatus } from "@/store/shop"

interface Address { address1: string; address2: string; city: string; region: string; postalCode: string; country: string }

const EMPTY_ADDRESS: Address = { address1: "", address2: "", city: "", region: "", postalCode: "", country: "GH" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Form {
    firstName: string; lastName: string; email: string; phone: string;
    recipientName: string; recipientPhone: string;
    shipping: Address; billing: Address; billingSame: boolean; notes: string;
}

const INITIAL: Form = {
    firstName: "", lastName: "", email: "", phone: "", recipientName: "", recipientPhone: "",
    shipping: { ...EMPTY_ADDRESS }, billing: { ...EMPTY_ADDRESS }, billingSame: true, notes: "",
};

function validate(f: Form): Record<string, string> {
    const e: Record<string, string> = {};
    if (!f.firstName.trim()) e.firstName = "First name is required";
    if (!f.lastName.trim()) e.lastName = "Last name is required";
    if (!f.email.trim()) e.email = "Email is required";
    else if (!EMAIL.test(f.email.trim())) e.email = "Enter a valid email address";
    if (!f.recipientName.trim()) e.recipientName = "Recipient name is required";
    const address = (a: Address, key: string) => {
        if (!a.address1.trim()) e[`${key}.address1`] = "Address is required";
        if (!a.city.trim()) e[`${key}.city`] = "City is required";
        if (!a.region.trim()) e[`${key}.region`] = "Region or state is required";
        if (!a.postalCode.trim()) e[`${key}.postalCode`] = "Postal code is required";
    };
    address(f.shipping, "shipping");
    if (!f.billingSame) address(f.billing, "billing");
    return e;
}

/** A field with its error underneath. */
function Row({ error, children }: { error?: string; children: React.ReactNode }) {
    return <div>{children}{error && <p role="alert" className="mt-1 text-[11.5px] text-red-700">{error}</p>}</div>;
}

function AddressFields({ value, onChange, errors, prefix }: { value: Address; onChange: (a: Address) => void; errors: Record<string, string>; prefix: string }) {
    const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
    return (
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div className="sm:col-span-2"><Row error={errors[`${prefix}.address1`]}><Field label="Address" value={value.address1} onChange={set("address1")} autoComplete="address-line1" aria-invalid={!!errors[`${prefix}.address1`]} /></Row></div>
            <div className="sm:col-span-2"><Field label="Apartment, suite, etc. (optional)" value={value.address2} onChange={set("address2")} autoComplete="address-line2" /></div>
            <Row error={errors[`${prefix}.city`]}><Field label="City" value={value.city} onChange={set("city")} autoComplete="address-level2" aria-invalid={!!errors[`${prefix}.city`]} /></Row>
            <Row error={errors[`${prefix}.region`]}><Field label="Region or state" value={value.region} onChange={set("region")} autoComplete="address-level1" aria-invalid={!!errors[`${prefix}.region`]} /></Row>
            <Row error={errors[`${prefix}.postalCode`]}><Field label="Postal code" value={value.postalCode} onChange={set("postalCode")} autoComplete="postal-code" aria-invalid={!!errors[`${prefix}.postalCode`]} /></Row>
            <label>
                <span className="sr-only">Country</span>
                <select value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value })} className="w-full border-0 border-b border-black/30 bg-transparent py-3 text-[13px] outline-none focus:border-black">
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
            </label>
        </div>
    );
}

export function Checkout() {
    const { lines, setQty, remove } = useCart();
    const products = useProducts();
    const status = useShopStatus();
    const { fmt, currency } = useMoney();

    const rows = useMemo(() => lines.flatMap((l) => {
        const product = products.find((p) => p.handle === l.handle);
        return product ? [{ ...l, product }] : [];
    }), [lines, products]);
    // Products from the backend carry the currency they are priced in; the static fallback has none and can't be bought.
    const live = rows.length > 0 && rows.every((r) => r.product.currency);
    const cur = rows[0]?.product.currency ?? currency;
    const subtotal = rows.reduce((n, r) => n + r.product.price * r.qty, 0);

    const [form, setForm] = useState<Form>(INITIAL);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [attempted, setAttempted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [quote, setQuote] = useState<Quote | null>(null);
    // Each cart line's variant SKU. The cart stores handle and size; the order needs the SKU.
    const [skus, setSkus] = useState<Record<string, string>>({});
    const [skuError, setSkuError] = useState<string | null>(null);

    const handles = useMemo(() => [...new Set(rows.map((r) => r.handle))].sort().join(","), [rows]);
    useEffect(() => {
        if (!live) return;
        const ctl = new AbortController();
        setSkuError(null);
        Promise.all(handles.split(",").map((h) => fetchProductDetail(h, cur, ctl.signal)))
            .then((details) => {
                const next: Record<string, string> = {};
                for (const d of details) for (const v of d.variants) if (v.optionValues?.size) next[`${d.slug}|${v.optionValues.size}`] = v.sku;
                setSkus(next);
            })
            .catch((e) => { if (!ctl.signal.aborted) setSkuError((e as Error).message); });
        return () => ctl.abort();
    }, [handles, cur, live]);

    const items = rows.flatMap((r) => {
        const sku = skus[`${r.handle}|${r.size}`];
        return sku ? [{ sku, quantity: r.qty, customisation: { size: r.size } }] : [];
    });
    const ready = live && items.length === rows.length;

    useEffect(() => { if (attempted) setErrors(validate(form)); }, [attempted, form]);

    // Totals come from the server, so they match what is charged. Debounced while the buyer types an email or picks a country.
    const email = form.email.trim();
    const itemsKey = JSON.stringify(items);
    useEffect(() => {
        if (!ready) return;
        const ctl = new AbortController();
        const timer = window.setTimeout(() => {
            fetchQuote({ items, country: form.shipping.country, email: EMAIL.test(email) ? email : undefined, currency: cur }, ctl.signal)
                .then((q) => !ctl.signal.aborted && setQuote(q))
                .catch(() => undefined);
        }, 400);
        return () => { ctl.abort(); window.clearTimeout(timer); };
        // `items` is covered by its serialised key.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, itemsKey, email, form.shipping.country, cur]);

    const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
    const text = (key: "firstName" | "lastName" | "email" | "phone" | "recipientName" | "recipientPhone") => ({
        value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement>) => update(key, e.target.value), "aria-invalid": !!errors[key],
    });

    async function submit(e: FormEvent) {
        e.preventDefault();
        setSubmitError(null);
        setAttempted(true);
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length) { document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
        if (!ready) return;
        setSubmitting(true);
        try {
            const payload: CheckoutRequest = {
                items,
                customer: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim() },
                shippingAddress: { recipientName: form.recipientName.trim(), recipientPhone: form.recipientPhone.trim(), ...form.shipping },
                billingAddress: form.billingSame ? null : form.billing,
                notes: form.notes.trim() || undefined,
                callbackUrl: `${window.location.origin}/order-status`,
                currency: cur,
            };
            const result = await createCheckout(payload);
            // The payment page appends ?reference= on return; keep a copy in case the buyer loses the query string.
            try { sessionStorage.setItem("ometsey-last-reference", result.reference); } catch { /* the query string still carries it */ }
            window.location.href = result.authorizationUrl;
        } catch (err) {
            setSubmitError((err as Error).message);
            setSubmitting(false);
        }
    }

    if (!lines.length) {
        return (
            <PageShell title="Checkout">
                <div className="py-16 text-center">
                    <p className="text-[14px]">Your shopping bag is empty</p>
                    <Link to="/collections/all" className="label ulink mt-6 inline-block">Explore collections</Link>
                </div>
            </PageShell>
        );
    }
    if (!rows.length) {
        return <PageShell title="Checkout"><p className="py-16 text-center text-black/50">{status === "ready" ? "Those items are no longer available." : "Loading…"}</p></PageShell>;
    }

    const shown = quote && quote.currency === cur;
    return (
        <PageShell title="Checkout">
            <form onSubmit={submit} noValidate className="grid gap-14 lg:grid-cols-[3fr_2fr]">
                <div className="space-y-12">
                    <section>
                        <h2 className="label mb-4">Contact</h2>
                        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            <Row error={errors.firstName}><Field label="First name" autoComplete="given-name" {...text("firstName")} /></Row>
                            <Row error={errors.lastName}><Field label="Last name" autoComplete="family-name" {...text("lastName")} /></Row>
                            <Row error={errors.email}><Field label="Email" type="email" autoComplete="email" {...text("email")} /></Row>
                            <Field label="Phone (optional)" type="tel" autoComplete="tel" {...text("phone")} />
                        </div>
                    </section>

                    <section>
                        <h2 className="label mb-4">Delivery</h2>
                        <div className="mb-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            <Row error={errors.recipientName}><Field label="Recipient name" {...text("recipientName")} /></Row>
                            <Field label="Recipient phone (optional)" type="tel" {...text("recipientPhone")} />
                        </div>
                        <AddressFields value={form.shipping} onChange={(a) => update("shipping", a)} errors={errors} prefix="shipping" />
                    </section>

                    <section>
                        <label className="flex items-center gap-3 text-[13px]">
                            <input type="checkbox" checked={form.billingSame} onChange={(e) => update("billingSame", e.target.checked)} />
                            Billing address is the same as delivery
                        </label>
                        {!form.billingSame && <div className="mt-5"><h2 className="label mb-4">Billing address</h2><AddressFields value={form.billing} onChange={(a) => update("billing", a)} errors={errors} prefix="billing" /></div>}
                    </section>

                    <section>
                        <h2 className="label mb-4">Notes (optional)</h2>
                        <textarea aria-label="Notes" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything we should know about your order" className="w-full resize-none border-0 border-b border-black/30 bg-transparent py-3 text-[13px] outline-none placeholder:text-black/50 focus:border-black" />
                    </section>
                </div>

                <aside className="h-fit border border-line p-6 lg:sticky lg:top-28">
                    <h2 className="label mb-5">Order summary</h2>
                    {rows.map((r) => (
                        <div key={r.handle + r.size} className="flex gap-4 border-b border-line py-4 text-[13px]">
                            <img src={r.product.images[0]} alt="" className="h-20 w-16 object-cover" />
                            <div className="flex-1">
                                <p className="uppercase tracking-[0.03em]">{r.product.title}</p>
                                <p className="mt-1 text-black/60">Size {r.size}</p>
                                <div className="mt-2 flex items-center gap-4">
                                    <div className="flex items-center border border-black/25">
                                        <button type="button" aria-label="Decrease" onClick={() => setQty(r.handle, r.size, r.qty - 1)} className="h-7 w-7">−</button>
                                        <span className="w-6 text-center">{r.qty}</span>
                                        <button type="button" aria-label="Increase" onClick={() => setQty(r.handle, r.size, r.qty + 1)} className="h-7 w-7">+</button>
                                    </div>
                                    <button type="button" onClick={() => remove(r.handle, r.size)} className="border-b border-black text-[11.5px]">Remove</button>
                                </div>
                            </div>
                            <p>{fmt(r.product.price * r.qty, r.product.currency)}</p>
                        </div>
                    ))}
                    <dl className="mt-5 space-y-2 text-[13px]">
                        <div className="flex justify-between"><dt>Subtotal</dt><dd>{fmt(shown ? quote.subtotal : subtotal, cur)}</dd></div>
                        {shown && quote.discountTotal > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{fmt(quote.discountTotal, cur)}</dd></div>}
                        <div className="flex justify-between"><dt>Shipping</dt><dd>{shown ? (quote.shippingTotal === 0 ? "Free" : fmt(quote.shippingTotal, cur)) : "—"}</dd></div>
                        {shown && quote.taxTotal > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{fmt(quote.taxTotal, cur)}</dd></div>}
                        <div className="label flex justify-between border-t border-line pt-4 text-[13px]"><dt>Total</dt><dd>{shown ? fmt(quote.grandTotal, cur) : "—"}</dd></div>
                    </dl>
                    {shown && quote.settlementCurrency && quote.settlementCurrency !== cur && quote.settlementAmount != null && (
                        <p className="mt-3 text-[11.5px] leading-5 text-black/60">You will be charged {fmt(quote.settlementAmount, quote.settlementCurrency)} at the current exchange rate.</p>
                    )}
                    {!live && <p className="mt-4 text-[12px] leading-5 text-black/60">Checkout is unavailable right now. Please try again shortly.</p>}
                    {skuError && <p role="alert" className="mt-4 text-[12px] text-red-700">{skuError}</p>}
                    {submitError && <p role="alert" className="mt-4 text-[12px] text-red-700">{submitError}</p>}
                    <button disabled={submitting || !ready || !shown} className="btn-black mt-6 w-full disabled:opacity-40">{submitting ? "Redirecting to payment…" : "Pay now"}</button>
                    <p className="mt-3 text-[11.5px] leading-5 text-black/55">You will be taken to our payment partner to complete your order securely.</p>
                    <Link to="/cart" className="label ulink mt-5 inline-block">Back to bag</Link>
                </aside>
            </form>
        </PageShell>
    );
}
