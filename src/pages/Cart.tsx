import { useState } from "react"
import { Link } from "react-router-dom"
import { PageShell } from "@/components/Form"
import { useProducts } from "@/store/catalog"
import { useMoney } from "@/store/market"
import { useCart } from "@/store/cart"

export function Cart() {
    const { lines, setQty, remove } = useCart();
    const products = useProducts();
    const { fmt, fmtProduct, priceOf } = useMoney();
    const [notice, setNotice] = useState(false);
    const rows = lines.flatMap((l) => {
        const product = products.find((p) => p.handle === l.handle);
        return product ? [{ ...l, product }] : [];
    });
    const subtotal = rows.reduce((n, r) => n + priceOf(r.product) * r.qty, 0);

    if (!rows.length) {
        return (
            <PageShell title="Shopping bag">
                <div className="py-16 text-center">
                    <p className="text-[14px]">Your shopping bag is empty</p>
                    <Link to="/collections/all" className="label ulink mt-6 inline-block">Explore collections</Link>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell title="Shopping bag">
            <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
                <div>
                    {rows.map((r) => (
                        <div key={r.handle + r.size} className="flex gap-5 border-b border-line py-6">
                            <Link to={`/products/${r.handle}`}><img src={r.product.images[0]} alt={r.product.title} className="h-36 w-28 object-cover" /></Link>
                            <div className="flex flex-1 flex-col justify-between text-[13px]">
                                <div>
                                    <p className="uppercase tracking-[0.03em]">{r.product.title}</p>
                                    <p className="mt-1 text-black/60">Size {r.size}</p>
                                    <p className="mt-1">{fmtProduct(r.product)}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center border border-black/25">
                                        <button aria-label="Decrease" onClick={() => setQty(r.handle, r.size, r.qty - 1)} className="h-9 w-9">−</button>
                                        <span className="w-8 text-center">{r.qty}</span>
                                        <button aria-label="Increase" onClick={() => setQty(r.handle, r.size, r.qty + 1)} className="h-9 w-9">+</button>
                                    </div>
                                    <button onClick={() => remove(r.handle, r.size)} className="border-b border-black text-[12px]">Remove</button>
                                </div>
                            </div>
                            <p className="text-[13px]">{fmt(priceOf(r.product) * r.qty)}</p>
                        </div>
                    ))}
                </div>
                <aside className="h-fit border border-line p-6">
                    <div className="flex justify-between text-[14px] uppercase"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                    <p className="mt-3 text-[12px] text-black/60">Worldwide shipping. Taxes and shipping are calculated at checkout.</p>
                    <button onClick={() => setNotice(true)} className="btn-black mt-6 w-full">Checkout</button>
                    {notice && <p className="mt-3 text-[12px] leading-5 text-black/60">Checkout isn’t connected to payments yet.</p>}
                    <Link to="/collections/all" className="label ulink mt-6 inline-block">Continue shopping</Link>
                </aside>
            </div>
        </PageShell>
    );
}
