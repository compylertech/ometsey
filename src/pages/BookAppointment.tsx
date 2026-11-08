import { useState } from "react"
import { Area, Field, OutlineButton, PageShell } from "@/components/Form"
import { STORE } from "@/data/catalog"
import { mailto, readForm } from "@/lib/mailto"

// Terms are those the FAQ publishes for the bespoke service.
const TERMS = [
    "Every bespoke order starts with a one-on-one consultation with Creative Director Darkwaa Edna, in person or virtually.",
    "The consultation fee is GHS 300.00. It is non-refundable but is deducted from the final cost of the garment once the design is confirmed.",
    "Book at least 3 months in advance. Traditional kente, asoke or fugu needs a minimum of 6 weeks’ notice; wedding gowns a minimum of 2 months’.",
    "A 70% deposit is required before production begins. The balance is due at least a day before the final fitting or collection.",
];

export function BookAppointment() {
    const [sent, setSent] = useState(false);
    return (
        <PageShell title="Book an appointment">
            <div className="mx-auto grid max-w-5xl gap-16 md:grid-cols-2">
                <div>
                    <h2 className="mb-5 text-[13px] uppercase tracking-[0.08em]">The bespoke process</h2>
                    <ul className="space-y-4 text-[13px] leading-6 text-black/70">
                        {TERMS.map((t) => <li key={t} className="border-b border-line pb-4">{t}</li>)}
                    </ul>
                </div>
                <form
                    className="space-y-6"
                    onSubmit={(e) => { e.preventDefault(); mailto("Bespoke appointment request", readForm(e.currentTarget)); setSent(true); }}
                >
                    <h2 className="text-[13px] uppercase tracking-[0.08em]">Request a consultation</h2>
                    <Field label="Name" required />
                    <Field label="Email" type="email" required />
                    <Field label="Phone / WhatsApp" type="tel" required />
                    <Field label="Preferred date" type="date" />
                    <select aria-label="Consultation type" defaultValue="In person" className="w-full border-0 border-b border-black/30 bg-transparent py-3 text-[13px] outline-none focus:border-black">
                        <option>In person</option>
                        <option>Virtual</option>
                    </select>
                    <Field label="Occasion" />
                    <Area label="Tell us about your vision" />
                    <OutlineButton type="submit">Request appointment</OutlineButton>
                    {sent && <p className="text-[12px] text-black/60">Your email app should have opened with the request ready to send to {STORE.email}. We will confirm a time with you.</p>}
                </form>
            </div>
        </PageShell>
    );
}
