// global imports
import { useState } from "react";
import type { ReactNode } from "react";

// local imports
import { formatMoney } from "../shared";
import { cancelOrder, deliverOrder, markOrderPaid, shipOrder, UnauthorizedError } from "../api";
import { useAdminData } from "../data";
import { stageOf } from "../model";
import { Notice, btn, btnDanger, btnOk, btnSolid, inputCls } from "../ui";
import type { AdminOrder, ManualPaymentMethod } from "../types";

const METHODS: { id: ManualPaymentMethod; label: string }[] = [
    { id: "CASH", label: "Cash" },
    { id: "BANK_TRANSFER", label: "Bank transfer" },
    { id: "MOBILE_MONEY", label: "Mobile money" },
    { id: "CHECK", label: "Cheque" },
    { id: "OTHER", label: "Other" },
];

type Mode = "pay" | "cancel" | "deliver" | null;

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block"><span className="mb-1 block text-[11px] text-black/50">{label}</span>{children}</label>
);

/**
 * What an admin can do to one order, in three parts so the drawer can place them: `buttons` are
 * Mark as paid and Cancel order (top right), `top` holds their confirmations and any result
 * notice, `bottom` holds the shipping form. The server decides what is allowed (and a paid cancel really
 * refunds the customer), so this only offers the actions that fit the order's state and asks first
 * before anything that moves money. Nothing here is retried automatically.
 */
export function useOrderActions(order: AdminOrder): { buttons: ReactNode; top: ReactNode; bottom: ReactNode } {
    const { token, unauthorized, updateOrder } = useAdminData();
    const stage = stageOf(order);
    const status = order.orderStatus;
    const money = formatMoney(order.grandTotal, order.currency);

    const [mode, setMode] = useState<Mode>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<{ text: string; at: "top" | "bottom" } | null>(null);
    const [done, setDone] = useState<string | null>(null);

    const [tracking, setTracking] = useState(order.trackingNumber ?? "");
    const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? "");
    const [method, setMethod] = useState<ManualPaymentMethod>("CASH");
    const [reference, setReference] = useState("");
    const [note, setNote] = useState("");
    const [reason, setReason] = useState("");

    async function run(action: () => Promise<AdminOrder>, success: string, at: "top" | "bottom" = "top") {
        setBusy(true);
        setError(null);
        setDone(null);
        try {
            updateOrder(await action());
            setMode(null);
            setDone(success);
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError({ text: err instanceof Error ? err.message : "That didn’t go through.", at });
        } finally {
            setBusy(false);
        }
    }

    const shipped = stage === "SHIPPED";
    const canShip = stage === "AWAITING_FULFILMENT" || shipped;
    const canDeliver = shipped;
    const canPay = status === "PLACED" && !order.paid;
    const refunds = order.paid;
    const canCancel = (status === "PLACED" && !order.paid) || (order.paid && (status === "PLACED" || status === "PROCESSING"));
    const trackingReady = tracking.trim().length > 0;

    if (stage === "COMPLETED" || stage === "CANCELLED" || stage === "REFUNDED") {
        return { buttons: null, top: done ? <Notice>{done}</Notice> : null, bottom: <p className="m-0 text-[11px] text-black/40">This order is closed, so there are no actions left.</p> };
    }

    const bottom = canShip && mode === null ? (
        <div className="space-y-4">
            {error?.at === "bottom" && <Notice tone="error">{error.text}</Notice>}
            <div className="space-y-3">
                <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-black/50">{shipped ? "Tracking" : "Ship this order"}</p>
                <Field label="Tracking number"><input value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={100} placeholder="e.g. DHL 1234567890" className={inputCls} /></Field>
                <Field label="Tracking link (optional)"><input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} maxLength={500} placeholder="https://" className={inputCls} /></Field>
                <button className={btnSolid} disabled={!trackingReady || busy}
                    onClick={() => void run(() => shipOrder(token, order.orderNumber, { trackingNumber: tracking.trim(), ...(trackingUrl.trim() ? { trackingUrl: trackingUrl.trim() } : {}) }), shipped ? "Tracking updated." : "Marked as shipped.", "bottom")}>
                    {busy ? "Saving..." : shipped ? "Update tracking" : "Mark shipped"}
                </button>
                {!shipped && <p className="m-0 text-[11px] text-black/40">The customer isn’t emailed automatically. Use “Order on the way” below.</p>}
            </div>
        </div>
    ) : null;

    const top = (
        <div className="space-y-4">
            {done && <Notice>{done}</Notice>}
            {error?.at === "top" && <Notice tone="error">{error.text}</Notice>}

            {mode === "pay" && (
                <div className="space-y-3 border border-[var(--a-border)] p-4">
                    <p className="m-0 font-medium">Record a payment of {money}</p>
                    <p className="m-0 text-[12px] text-black/55">Use this when the customer paid outside the website. Their open card payment is cancelled so they can’t pay twice.</p>
                    <Field label="Paid by">
                        <select value={method} onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)} className={inputCls}>
                            {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Reference (optional)"><input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} /></Field>
                    <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></Field>
                    <div className="flex gap-3">
                        <button className={btnOk} disabled={busy}
                            onClick={() => void run(() => markOrderPaid(token, order.orderNumber, { method, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(note.trim() ? { note: note.trim() } : {}) }), "Payment recorded.")}>
                            {busy ? "Recording..." : "Record payment"}
                        </button>
                        <button className={btn} disabled={busy} onClick={() => setMode(null)}>Back</button>
                    </div>
                </div>
            )}

            {mode === "cancel" && (
                <div className="space-y-3 border border-[var(--a-st-can)] p-4">
                    <p className="m-0 font-medium">Cancel {order.orderNumber}?</p>
                    <p className="m-0 text-[12px] text-black/65">
                        {refunds
                            ? `This will refund ${money} to the customer. A card refund can take a while to settle, and if it fails the order is left as it is.`
                            : "No payment was taken, so nothing is refunded. Their open payment link stops working."}
                    </p>
                    <Field label="Reason (optional)"><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} placeholder="e.g. customer asked" className={inputCls} /></Field>
                    <div className="flex gap-3">
                        <button className={btnDanger} disabled={busy}
                            onClick={() => void run(() => cancelOrder(token, order.orderNumber, reason.trim() || undefined), refunds ? "Order cancelled and refund started." : "Order cancelled.")}>
                            {busy ? "Cancelling..." : refunds ? "Cancel and refund" : "Cancel order"}
                        </button>
                        <button className={btn} disabled={busy} onClick={() => setMode(null)}>Keep order</button>
                    </div>
                </div>
            )}

            {mode === "deliver" && (
                <div className="space-y-3 border border-[var(--a-border)] p-4">
                    <p className="m-0 font-medium">Mark {order.orderNumber} as delivered?</p>
                    <p className="m-0 text-[12px] text-black/55">This completes the order, and it moves to Completed. The customer isn’t emailed.</p>
                    <div className="flex gap-3">
                        <button className={btnOk} disabled={busy} onClick={() => void run(() => deliverOrder(token, order.orderNumber), "Marked as delivered.")}>
                            {busy ? "Saving..." : "Mark delivered"}
                        </button>
                        <button className={btn} disabled={busy} onClick={() => setMode(null)}>Back</button>
                    </div>
                </div>
            )}

            {shipped && !canCancel && mode === null && <p className="m-0 text-[11px] text-black/40">A shipped order can’t be cancelled here. Returns are handled separately.</p>}
        </div>
    );

    const buttons = mode === null && (canPay || canCancel || canDeliver) ? (
        <div className="flex items-center gap-2">
            {canDeliver && <button className={btnOk} onClick={() => { setMode("deliver"); setError(null); setDone(null); }}>Mark delivered</button>}
            {canPay && <button className={btnOk} onClick={() => { setMode("pay"); setError(null); setDone(null); }}>Mark as paid</button>}
            {canCancel && <button className={btnDanger} onClick={() => { setMode("cancel"); setError(null); setDone(null); }}>Cancel order</button>}
        </div>
    ) : null;

    return { buttons, top, bottom };
}
