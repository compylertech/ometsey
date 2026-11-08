import { Link } from "react-router-dom"
import { PageShell } from "@/components/Form"

// Questions and answers as published on ometsey.com/faq.
const GROUPS: { title: string; items: { q: string; a: React.ReactNode }[] }[] = [
    { title: "General", items: [
        { q: "What is OMETSEY?", a: "OMETSEY is a contemporary women’s fashion brand founded in 2017 in Accra, Ghana, by Darkwaa Edna. We specialize in timeless, sophisticated garments that fuse classic elegance with modern style, offering both made-to-order and bespoke fashion services." },
        { q: "Do you offer customization for sizing?", a: "Yes, we do. You can request customization by providing your preferred measurements for bust, waist, hips, and length in the “Order Notes” box before checking out." },
        { q: "Do you make custom-made outfits?", a: <>Yes, we offer custom-made outfits through our bespoke service. For more details on how to get a personalized outfit designed, please visit our <Link to="/pages/book-an-appointment" className="underline">Bespoke page</Link>.</> },
    ] },
    { title: "Orders and Shipping", items: [
        { q: "How long do orders take to process and ship?", a: "Our pieces are produced on-demand, so orders typically take 6-10 working days to ship after the order is placed. However, some bestsellers are readily available and can be processed within 24 hours." },
        { q: "Do you ship internationally?", a: "Yes, OMETSEY ships worldwide. Shipping fees and delivery times will vary depending on the destination. For international orders, please allow additional time for customs processing." },
        { q: "Can I track my order?", a: "Yes, once your order has been shipped, you will receive a confirmation email with a tracking number so you can follow your package’s journey." },
        { q: "Do you offer express orders?", a: "Yes, we offer express orders on a limited basis, subject to availability. Express orders attract a 30% surcharge on the total cost of the garment. Please contact us in advance to confirm availability." },
    ] },
    { title: "Bespoke Services", items: [
        { q: "What is the bespoke process like?", a: "Our bespoke service begins with a one-on-one consultation with Creative Director Darkwaa Edna. During this session, we discuss your vision, occasion, and preferences, after which the design is sketched and finalized. The process includes fittings to ensure a perfect fit, and timelines vary based on the complexity of the garment." },
        { q: "How far in advance should I book a bespoke service?", a: <>We recommend booking at least 3 months in advance. For specific garments:<ul className="mt-2 list-disc pl-5"><li>Traditional kente/asoke/fugu requires a minimum of 6 weeks’ notice.</li><li>Wedding gowns require a minimum of 2 months’ notice.</li></ul></> },
        { q: "Is the consultation fee refundable?", a: "The consultation fee of GHS 300.00 is non-refundable but will be deducted from the final cost of the garment once the design is confirmed." },
    ] },
    { title: "Payments and Returns", items: [
        { q: "How do payments work?", a: "For bespoke orders, a 70% deposit is required before production begins. The remaining balance must be settled at least a day before the final fitting or collection. For regular orders, payment is made in full at checkout." },
        { q: "Do you accept returns or offer refunds?", a: "Since each piece is made-to-order or custom-made, we do not accept returns or offer refunds. However, we will make minor adjustments if communicated early. For bespoke items, no refunds are issued after production has begun." },
    ] },
];

export function Faq() {
    return (
        <PageShell title="FAQs">
            <div className="mx-auto max-w-3xl">
                <p className="mb-12 text-center text-[14px]">Frequently Asked Questions</p>
                {GROUPS.map((g) => (
                    <div key={g.title} className="mb-12">
                        <h2 className="mb-4 text-[13px] uppercase tracking-[0.08em]">{g.title}</h2>
                        {g.items.map((it) => (
                            <details key={it.q} className="group border-t border-line last:border-b">
                                <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[14px] [&::-webkit-details-marker]:hidden">
                                    {it.q}
                                    <span className="ml-6 text-lg leading-none group-open:hidden">+</span>
                                    <span className="ml-6 hidden text-lg leading-none group-open:inline">−</span>
                                </summary>
                                <div className="pb-6 pr-10 text-[13px] leading-6 text-black/70">{it.a}</div>
                            </details>
                        ))}
                    </div>
                ))}
            </div>
        </PageShell>
    );
}
