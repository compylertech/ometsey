import { useState } from "react"
import { Link } from "react-router-dom"
import { money, type Product } from "@/data/catalog"

/** Large image, then a small left-aligned title and price. Hover cycles to the next shot. */
export function ProductCard({ product }: { product: Product }) {
    const [i, setI] = useState(0);
        return (
        <article>
            <Link to={`/products/${product.handle}`} onMouseEnter={() => setI(1)} onMouseLeave={() => setI(0)}>
                <img src={product.images[i]} alt={product.title} loading="lazy" className="aspect-[5/7] w-full object-cover" />
            </Link>
            <Link to={`/products/${product.handle}`} className="mt-4 block">
                <h3 className="text-[13px] font-normal uppercase tracking-[0.03em]">{product.title}</h3>
                <p className="mt-0.5 text-[13px] text-black/70">{money(product.price)}</p>
            </Link>
        </article>
    )
}
