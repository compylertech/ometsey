import { useState } from "react"
import { Area, Field, OutlineButton, PageShell } from "@/components/Form"
import { STORE } from "@/data/catalog"
import { useMoney } from "@/store/market"
import { mailto, readForm } from "@/lib/mailto"

export function GiftCard() {
    const [sent, setSent] = useState(false);
    const { currency } = useMoney();
    return (
        <PageShell title="Gift card">
            <div className="mx-auto max-w-xl">
                <p className="mb-10 text-center text-[14px] leading-7">
                    Give the gift of OMETSEY. Tell us the amount and who it is for, and our team will arrange the gift card with you.
                </p>
                <form
                    className="space-y-6"
                    onSubmit={(e) => { e.preventDefault(); mailto("Gift card request", readForm(e.currentTarget)); setSent(true); }}
                >
                    <Field label={`Amount (${currency})`} type="number" min={1} required />
                    <Field label="Recipient name" required />
                    <Field label="Recipient email" type="email" required />
                    <Field label="Your name" required />
                    <Field label="Your email" type="email" required />
                    <Area label="Message to the recipient" />
                    <div className="text-center"><OutlineButton type="submit">Request gift card</OutlineButton></div>
                    {sent && <p className="text-center text-[12px] text-black/60">Your email app should have opened with the request ready to send to {STORE.email}.</p>}
                </form>
            </div>
        </PageShell>
    );
}
