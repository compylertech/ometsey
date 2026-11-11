import { useState } from "react"
import { Link } from "react-router-dom"
import { useProducts } from "@/store/catalog"
import { useMoney } from "@/store/market"
import { useCart } from "@/store/cart"

export function CartDrawer() {
    const { lines, open, setOpen, remove } = useCart();
    const products = useProducts();
    const { fmt, priceOf } = useMoney();
    const [notice, setNotice] = useState(false);
    const rows = lines.flatMap((l) => {
        const product = products.find((p) => p.handle === l.handle);
        return product ? [{ ...l, product }] : [];
    });
    const subtotal = rows.reduce((n, r) => n + priceOf(r.product) * r.qty, 0);
    const count = rows.reduce((n, r) => n + r.qty, 0);

    return (
        <>
            <div onClick={() => setOpen(false)} className={`fixed inset-0 z-50 bg-black/40 transition ${open ? "visible opacity-100" : "invisible opacity-0"}`} />
            <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
                <div className="label flex items-center justify-between border-b border-line p-5">
                    <span>Bag ({count})</span>
                    <button onClick={() => setOpen(false)} className="border-0 bg-transparent">Close</button>
                </div>
                <p className="label bg-paper p-3 text-center">Worldwide shipping</p>
                <div className="flex-1 overflow-y-auto p-5">
                    {!rows.length ? (
                        <div className="mt-16 text-center">
                            <p className="label">Your shopping bag is empty</p>
                            <Link to="/collections/all" onClick={() => setOpen(false)} className="btn-outline mt-6">Explore Collections</Link>
                        </div>
                    ) : rows.map((r) => (
                        <div key={r.handle + r.size} className="mb-5 flex gap-4">
                            <img src={r.product.images[0]} alt={r.product.title} className="h-28 w-20 shrink-0 object-cover" />
                            <div className="flex-1 text-sm">
                                <p className="label">{r.product.title}</p>
                                <p className="mt-1 text-black/60">Size {r.size} · Qty {r.qty}</p>
                                <p className="mt-1">{fmt(priceOf(r.product) * r.qty)}</p>
                                <button onClick={() => remove(r.handle, r.size)} className="mt-2 border-0 bg-transparent p-0 text-xs underline">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-line p-5">
                    <div className="label flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                    <p className="mt-2 text-xs text-black/60">Taxes and shipping calculated at checkout.</p>
                    <button disabled={!rows.length} onClick={() => setNotice(true)} className="btn-black mt-4 w-full disabled:opacity-40">Checkout</button>
                    {notice && <p className="mt-3 text-[12px] leading-5 text-black/60">Checkout isn’t connected to payments yet.</p>}
                    <Link to="/cart" onClick={() => setOpen(false)} className="btn-outline mt-3 block w-full text-center">View Shopping Bag</Link>
                </div>
            </aside>
        </>
    )
}
