import { useState } from "react"
import { Area, Field, OutlineButton, PageShell } from "@/components/Form"
import { HOURS, STORE } from "@/data/catalog"
import { mailto, readForm } from "@/lib/mailto"

const label = "mb-3 text-[14px] uppercase underline underline-offset-4";

export function Contact() {
    const [sent, setSent] = useState(false);
    return (
        <PageShell title="Contact Us">
            <p className="mx-auto max-w-2xl text-center text-[14px] leading-7">
                We would love to hear from you! Whether you have questions about our collections, need assistance with a bespoke order, or want to provide feedback, our team is here to help.
            </p>

            <div className="mx-auto mt-14 grid max-w-4xl gap-12 text-center text-[14px] uppercase leading-6 md:grid-cols-3">
                <div>
                    <h2 className={label}>Locate us</h2>
                    <p>Commandos, Adenta Municipality<br />Accra, Ghana</p>
                </div>
                <div>
                    <h2 className={label}>Contact info</h2>
                    <p>Call / WhatsApp<br />{STORE.phone}</p>
                    <a href={`mailto:${STORE.email}`} className="mt-2 block normal-case">{STORE.email}</a>
                </div>
                <div>
                    <h2 className={label}>Business hours</h2>
                    {HOURS.map((h) => <p key={h.days}>{h.days}<br />{h.hours}</p>)}
                </div>
            </div>

            <form
                className="mx-auto mt-20 max-w-xl space-y-6"
                onSubmit={(e) => { e.preventDefault(); mailto("Message from the Ometsey website", readForm(e.currentTarget)); setSent(true); }}
            >
                <h2 className="text-center text-[14px] uppercase tracking-[0.08em]">Have a question? Contact us</h2>
                <Field label="Name" required />
                <Field label="Email" type="email" required />
                <Field label="Phone" type="tel" />
                <Area label="Message" required />
                <div className="text-center"><OutlineButton type="submit">Send message</OutlineButton></div>
                {sent && <p className="text-center text-[12px] text-black/60">Your email app should have opened with the message ready to send to {STORE.email}.</p>}
            </form>
        </PageShell>
    );
}
