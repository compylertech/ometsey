import { Link } from "react-router-dom"
import { PageShell } from "@/components/Form"

interface Post { slug: string; title: string; date: string; author: string; image: string }

/** Ometsey has no published articles yet (the live blog only carries template filler), so the grid starts empty. */
const POSTS: Post[] = [];

export function Blog() {
    return (
        <PageShell title="Journal">
            {POSTS.length ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                    {POSTS.map((p) => (
                        <article key={p.slug}>
                            <img src={p.image} alt="" loading="lazy" className="aspect-[5/6] w-full object-cover" />
                            <h2 className="mt-4 text-[17px] leading-6">{p.title}</h2>
                            <p className="mt-2 text-[12px] text-black/60">{p.date}&nbsp;&nbsp;{p.author}</p>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="py-16 text-center">
                    <p className="text-[14px]">Stories from the studio are coming soon.</p>
                    <Link to="/collections/all" className="label ulink mt-6 inline-block">Shop the collection</Link>
                </div>
            )}
        </PageShell>
    );
}
