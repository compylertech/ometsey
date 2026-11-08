import { useState } from "react"
import { Field, OutlineButton, PageShell } from "@/components/Form"
import { STORE } from "@/data/catalog"

export function OrderTracking() {
    const [tried, setTried] = useState(false);
    return (
        <PageShell title="Order tracking">
            <div className="mx-auto max-w-xl">
                <p className="mb-10 text-center text-[14px] leading-7">
                    To track your order please enter your Order ID in the box below and press the “Track” button. This was given to you on your receipt and in the confirmation email you should have received.
                </p>
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setTried(true); }}>
                    <Field label="Order ID" required />
                    <Field label="Billing email" type="email" required />
                    <div className="text-center"><OutlineButton type="submit">Track</OutlineButton></div>
                    {tried && (
                        <p className="text-center text-[12px] leading-5 text-black/60">
                            Live tracking isn’t connected to the store yet. Please email <a href={`mailto:${STORE.email}`} className="underline">{STORE.email}</a> with your order ID and we will update you.
                        </p>
                    )}
                </form>
            </div>
        </PageShell>
    );
}
