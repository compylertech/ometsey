import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BEST_SELLERS, COLLECTION_TILES, HERO_SLIDES } from "@/data/catalog"
import { useProducts } from "@/store/catalog"
import { ProductCard } from "@/components/ProductCard"

function Hero() {
    const [i, setI] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setI((n) => (n + 1) % HERO_SLIDES.length), 5000);
        return () => clearInterval(id);
    }, []);
    return (
        <section className="relative h-[calc(100vh-45px)] min-h-[560px] overflow-hidden bg-black">
            {HERO_SLIDES.map((src, n) => (
                <img key={src} src={src} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${n === i ? "opacity-100" : "opacity-0"}`} />
            ))}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-x-0 bottom-0 pb-12 text-center text-white">
                <Link to="/collections/all" className="label ulink inline-block">Shop Now</Link>
                <div className="mt-6 flex justify-center gap-2">
                    {HERO_SLIDES.map((_, n) => (
                        <button key={n} aria-label={`Slide ${n + 1}`} onClick={() => setI(n)}
                            className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-white" : "bg-white/40"}`} />
                    ))}
                </div>
            </div>
        </section>
    )
}

function Tiles({ title, items }: { title: string; items: { title: string; to: string; image: string }[] }) {
    return (
        <section className="px-5 py-10 lg:px-6">
            <h2 className="mb-8 text-center text-[22px] font-light uppercase tracking-wide text-brand">{title}</h2>
            <div className="grid gap-4 md:grid-cols-3">
                {items.map((t) => (
                    <Link key={t.title} to={t.to} className="group relative block overflow-hidden">
                        <img src={t.image} alt={t.title} loading="lazy" className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute left-0 top-0 p-5 text-white">
                            <p className="text-xl font-light drop-shadow">{t.title}</p>
                            <span className="label ulink mt-3 inline-block">Shop Now</span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}

export function Home() {
    const products = useProducts();
    const arrivals = products.filter((p) => p.tags.includes("new-in")).slice(0, 4);
    return (
        <>
            <Hero />

            <section className="px-5 py-10 lg:px-6">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <p className="text-[9px] uppercase tracking-[0.1em]">Just landed</p>
                        <h2 className="text-[22px] font-light uppercase text-brand">New Arrivals</h2>
                    </div>
                    <Link to="/collections/new-in" className="label ulink">Shop</Link>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4">
                    {arrivals.map((p) => <ProductCard key={p.handle} product={p} />)}
                </div>
            </section>

            <Tiles title="Collections" items={COLLECTION_TILES} />
            <Tiles title="Best Sellers" items={BEST_SELLERS} />

            {/* Brand statement, as worded on ometsey.com */}
            <section className="mx-auto max-w-4xl px-5 py-24 text-center">
                <h2 className="text-3xl font-light uppercase tracking-wide text-brand">Classic. Elegant. Graceful.</h2>
                <p className="label mt-10">Woman of substance</p>
                <p className="mx-auto mt-4 max-w-3xl text-[14px] leading-7 text-black/70">
                    “To be a woman of substance is to be a woman of power, positive influence and a woman of meaning. To be branded as such is one of the greatest compliments one can have”
                </p>
                <p className="label-wide mt-6 text-black/50">#OmetseyWoman</p>
                <Link to="/pages/about-us" className="label ulink mt-8 inline-block">About Us</Link>
            </section>

            {/* Social strip */}
            <section className="rail flex gap-1 overflow-x-auto">
                {products.map((p) => <img key={p.handle} src={p.images[0]} alt="" loading="lazy" className="aspect-square w-60 shrink-0 object-cover" />)}
            </section>
        </>
    )
}
