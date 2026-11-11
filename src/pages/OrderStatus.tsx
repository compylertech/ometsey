import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { PageShell } from "@/components/Form"
import { fetchOrderStatus } from "@/lib/api"
import type { OrderStatusResponse } from "@/lib/storefront-types"
import { useCart } from "@/store/cart"
import { useMoney } from "@/store/market"

/** The payment provider can report a charge before its webhook reaches us, so poll a few times before calling it unpaid. */
const POLL_MS = 2500;
const MAX_POLLS = 8;
const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"]);
const KEY = "ometsey-last-reference";

const remembered = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };

export function OrderStatus() {
    const [params] = useSearchParams();
    const clear = useCart((s) => s.clear);
    const { fmt } = useMoney();
    const reference = params.get("reference") ?? params.get("trxref") ?? remembered();

    const [order, setOrder] = useState<OrderStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [settled, setSettled] = useState(false);
    const polls = useRef(0);

    const load = useCallback(async () => {
        if (!reference) { setError("We could not identify this order."); setSettled(true); return; }
        try {
            const result = await fetchOrderStatus(reference);
            setOrder(result);
            if (TERMINAL.has(result.paymentStatus)) {
                setSettled(true);
                if (result.paid) { clear(); try { sessionStorage.removeItem(KEY); } catch { /* nothing to clean up */ } }
                return;
            }
            polls.current += 1;
            if (polls.current >= MAX_POLLS) setSettled(true);
        } catch (e) {
            setError((e as Error).message);
            setSettled(true);
        }
    }, [reference, clear]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        if (settled) return;
        const t = setTimeout(() => void load(), POLL_MS);
        return () => clearTimeout(t);
    }, [settled, order, load]);

    if (error) {
        return (
            <PageShell title="Order">
                <div className="mx-auto max-w-md py-10 text-center text-[13px] leading-6">
                    <p className="text-[15px]">Something went wrong</p>
                    <p className="mt-3 text-black/65">{error}</p>
                    <p className="mt-3 text-black/65">If you were charged, your order is safe. Write to us with your payment reference and we will sort it out.</p>
                    <Link to="/pages/contact-us" className="label ulink mt-6 inline-block">Contact us</Link>
                </div>
            </PageShell>
        );
    }
    if (!order) return <PageShell title="Order"><p className="py-16 text-center text-black/50">Confirming your payment…</p></PageShell>;

    const headline = order.paid ? "Thank you, your order is confirmed"
        : ["FAILED", "CANCELLED"].includes(order.paymentStatus) ? "Your payment didn’t go through"
        : settled ? "We haven’t received your payment yet" : "Confirming your payment…";

    return (
        <PageShell title={`Order ${order.orderNumber}`}>
            <div className="mx-auto max-w-xl text-[13px]">
                <p className="text-[16px]">{headline}</p>
                {order.paid && order.customerEmail && <p className="mt-2 text-black/65">A confirmation is on its way to {order.customerEmail}.</p>}
                {!order.paid && settled && <p className="mt-2 text-black/65">If you were charged, it can take a few minutes to show here. Your order is kept, and you can write to us with this order number.</p>}
                <div className="mt-8 border border-line">
                    {order.items.map((i) => (
                        <div key={i.sku} className="flex justify-between border-b border-line px-5 py-4">
                            <span>{i.name ?? i.sku} <span className="text-black/50">× {i.quantity}</span></span><span>{fmt(i.totalPrice, order.currency)}</span>
                        </div>
                    ))}
                    <dl className="space-y-2 px-5 py-4">
                        <div className="flex justify-between"><dt>Subtotal</dt><dd>{fmt(order.subtotal, order.currency)}</dd></div>
                        {order.discountTotal > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{fmt(order.discountTotal, order.currency)}</dd></div>}
                        <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shippingTotal === 0 ? "Free" : fmt(order.shippingTotal, order.currency)}</dd></div>
                        <div className="label flex justify-between border-t border-line pt-3"><dt>Total</dt><dd>{fmt(order.grandTotal, order.currency)}</dd></div>
                    </dl>
                </div>
                <Link to="/collections/all" className="label ulink mt-8 inline-block">Continue shopping</Link>
            </div>
        </PageShell>
    );
}
