import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { SIZES } from "@/data/catalog"
import { fetchProductDetail } from "@/lib/api"
import type { StorefrontProduct } from "@/lib/storefront-types"
import { useProducts, useShopStatus } from "@/store/shop"
import { useMoney } from "@/store/market"
import { ProductCard } from "@/components/ProductCard"
import { useCart } from "@/store/cart"
import { useWishlist } from "@/store/wishlist"


export function Product() {
    const { handle } = useParams();
    const products = useProducts();
    const { fmtProduct, currency } = useMoney();
    const status = useShopStatus();
    const product = products.find((p) => p.handle === handle);
    const [size, setSize] = useState("");
    const [detail, setDetail] = useState<StorefrontProduct | null>(null);
    const add = useCart((s) => s.add);
    const { handles, toggle } = useWishlist();

    // The grid card has one image and no copy, so the page asks for the full product. Offline, the card stands in.
    const live = product?.currency !== undefined;
    useEffect(() => {
        if (!handle || !live) { setDetail(null); return; }
        const ctl = new AbortController();
        fetchProductDetail(handle, currency, ctl.signal).then(setDetail).catch(() => setDetail(null));
        return () => ctl.abort();
    }, [handle, live, currency]);

    if (!product && (status === "idle" || status === "loading")) return <p className="py-32 text-center text-black/50">Loading…</p>;
    if (!product) return <p className="py-32 text-center">Product not found. <Link to="/collections/all" className="underline">Shop all</Link></p>;
    const images = [...new Set(detail?.imageIds?.length ? detail.imageIds : detail?.primaryImageId ? [detail.primaryImageId] : product.images)];
    // Sizes the backend lists as sold; the static list stands in offline.
    const sizes = detail ? [...new Map(detail.variants.filter((v) => v.optionValues?.size).map((v) => [v.optionValues!.size, v.available])).entries()] : SIZES.map((s) => [s, true] as const);
    const description = detail?.description || detail?.shortDescription || product.description;
    const related = products.filter((p) => p.category === product.category && p.handle !== product.handle).slice(0, 4);

    return (
        <>
            <section className="mx-auto grid gap-10 px-5 py-10 lg:grid-cols-[1.4fr_1fr] lg:px-10">
                <div className="grid grid-cols-2 gap-3">
                    {images.map((src) => (
                        <img key={src} src={src} alt={product.title} className="aspect-[5/7] w-full object-cover" />
                    ))}
                </div>
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <h1 className="label text-sm">{product.title}</h1>
                    <p className="mt-3">{fmtProduct(product)}</p>
                    <p className="mt-6 text-sm leading-6 text-black/70">{description}</p>
                    <p className="label mb-3 mt-8">Size</p>
                    <div className="flex flex-wrap gap-2">
                        {sizes.map(([s, available]) => (
                            <button key={s} disabled={!available} onClick={() => setSize(s)}
                                className={`h-11 w-14 border text-xs tracking-widest disabled:opacity-30 disabled:line-through ${size === s ? "border-black bg-black text-white" : "border-black/30 bg-transparent"}`}>{s}</button>
                        ))}
                    </div>
                    <button disabled={!size} onClick={() => add(product.handle, size)} className="btn-black mt-8 w-full disabled:opacity-40">
                        {size ? "Add to Bag" : "Select a size"}
                    </button>
                    <button onClick={() => toggle(product.handle)} className="mt-3 w-full border border-black/25 py-3 text-[12px] uppercase tracking-[0.15em]">
                        {handles.includes(product.handle) ? "Saved to wishlist" : "Add to wishlist"}
                    </button>
                    <p className="mt-4 text-xs text-black/60">Worldwide shipping. Made to order in Accra.</p>
                </div>
            </section>
            {related.length > 0 && (
                <section className="mx-auto px-5 pb-20 lg:px-10">
                    <h2 className="label mb-8 text-center">You may also like</h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">
                        {related.map((p) => <ProductCard key={p.handle} product={p} />)}
                    </div>
                </section>
            )}
        </>
    )
}
