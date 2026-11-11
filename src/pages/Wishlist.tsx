import { Link } from "react-router-dom"
import { PageShell } from "@/components/Form"
import { ProductCard } from "@/components/ProductCard"
import { useProducts } from "@/store/shop"
import { useWishlist } from "@/store/wishlist"

export function Wishlist() {
    const { handles, toggle } = useWishlist();
    const products = useProducts();
    const items = handles.flatMap((h) => products.find((p) => p.handle === h) ?? []);
    return (
        <PageShell title="Wishlist">
            {items.length ? (
                <div className="grid grid-cols-2 gap-x-2 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
                    {items.map((p) => (
                        <div key={p.handle}>
                            <ProductCard product={p} />
                            <button onClick={() => toggle(p.handle)} className="mt-2 border-b border-black text-[12px]">Remove</button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-16 text-center">
                    <p className="text-[14px]">No products added to the wishlist</p>
                    <Link to="/collections/all" className="label ulink mt-6 inline-block">Continue shopping</Link>
                </div>
            )}
        </PageShell>
    );
}
