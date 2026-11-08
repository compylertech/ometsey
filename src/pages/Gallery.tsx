import { useEffect, useMemo, useState } from "react"
import { PageShell } from "@/components/Form"
import { BEST_SELLERS, COLLECTION_TILES, HERO_SLIDES } from "@/data/catalog"
import { useProducts } from "@/store/catalog"

/** Every campaign and product photograph we hold. The live Gallery page is empty, so this stands in for it. */
const CAMPAIGN = [...HERO_SLIDES, ...COLLECTION_TILES.map((t) => t.image), ...BEST_SELLERS.map((t) => t.image)];

export function Gallery() {
    const products = useProducts();
    const IMAGES = useMemo(() => [...new Set([...CAMPAIGN, ...products.flatMap((p) => p.images)])], [products]);
    const [open, setOpen] = useState<number | null>(null);

    useEffect(() => {
        if (open === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(null);
            if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % IMAGES.length));
            if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + IMAGES.length) % IMAGES.length));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, IMAGES.length]);

    return (
        <PageShell title="Gallery">
            <div className="columns-2 gap-2 md:columns-3 lg:columns-4">
                {IMAGES.map((src, i) => (
                    <button key={src} onClick={() => setOpen(i)} className="mb-2 block w-full" aria-label={`Open image ${i + 1}`}>
                        <img src={src} alt="" loading="lazy" className="w-full" />
                    </button>
                ))}
            </div>
            {open !== null && (
                <div onClick={() => setOpen(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6">
                    <button aria-label="Close" className="absolute right-6 top-5 text-2xl text-white">×</button>
                    <img src={IMAGES[open]} alt="" onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full object-contain" />
                </div>
            )}
        </PageShell>
    );
}
