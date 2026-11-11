import { useState } from "react"
import { Link } from "react-router-dom"
import { FOOTER_GROUPS, STORE } from "@/data/catalog"
import { useMenu } from "@/lib/menu"

export function Footer() {
    const [sent, setSent] = useState(false);
    const menu = useMenu();
    // The Shopping column lists the live collections, after the two fixed links and before Track Your Order.
    const groups = FOOTER_GROUPS.map((g) => g.heading !== "Shopping" ? g : {
        ...g,
        links: [
            ...g.links.filter((l) => l.to === "/collections/all" || l.to === "/collections/new-in"),
            ...menu.collections.slice(0, 3),
            ...g.links.filter((l) => !l.to.startsWith("/collections/")),
        ],
    });
    return (
        <footer className="bg-paper">
            <section className="px-5 py-16 text-center lg:px-6">
                <p className="label-wide">Tag @ometsey</p>
                <p className="mx-auto mt-4 max-w-xl text-[11px] leading-5 text-black/60">
                    for a chance to be featured on our platforms. By tagging us on Instagram, you grant us permission to repost and feature your content across our digital platforms, including our website, social media and marketing materials.
                </p>
            </section>

            <section className="border-t border-line px-5 py-12 text-center lg:px-6">
                <h4 className="label-wide mb-6">Shop by category</h4>
                <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                    {menu.categories.map((c) => (
                        <li key={c.to}>{c.soon
                            ? <span title="Coming soon" className="label text-black/35">{c.label}</span>
                            : <Link to={c.to} className="label hover:underline">{c.label}</Link>}</li>
                    ))}
                </ul>
            </section>

            <section className="grid gap-12 border-t border-line px-5 py-14 lg:grid-cols-[2fr_1fr] lg:px-6">
                <div className="grid gap-10 sm:grid-cols-3">
                    {groups.map((g) => (
                        <div key={g.heading}>
                            <h4 className="label-wide mb-5">{g.heading}</h4>
                            <ul>{g.links.map((l) => <li key={l.label}><Link to={l.to} className="label block py-1.5 text-black/70 hover:text-black">{l.label}</Link></li>)}</ul>
                        </div>
                    ))}
                    <div>
                        <h4 className="label-wide mb-5">Store Details</h4>
                        <p className="label py-1.5 text-black/70">{STORE.phone}</p>
                        <p className="label py-1.5 normal-case text-black/70">{STORE.address}</p>
                        <a href={`mailto:${STORE.email}`} className="label block py-1.5 normal-case text-black/70 hover:text-black">{STORE.email}</a>
                    </div>
                </div>
                <div>
                    <h4 className="label-wide mb-3">Join the Ometsey mailing list</h4>
                    <p className="mb-5 max-w-md text-[12px] leading-5 text-black/70">15% off your first purchase, plus early access, VIP events and adventures.</p>
                    {sent ? <p className="text-sm">Thank you — you're on the list.</p> : (
                        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="flex max-w-md border-b border-black">
                            <input required type="email" placeholder="Email" className="flex-1 border-0 bg-transparent py-3 text-sm outline-none" />
                            <button className="label-wide">Subscribe</button>
                        </form>
                    )}
                </div>
            </section>
            <p className="px-5 pb-8 text-[11px] text-black/50 lg:px-6">© {new Date().getFullYear()} Ometsey</p>
        </footer>
    )
}
