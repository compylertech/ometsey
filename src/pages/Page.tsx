import { useParams } from "react-router-dom"

/** Generic content page for /pages/:slug until real copy is supplied. */
export function Page() {
    const { slug = "" } = useParams();
    return (
        <section className="mx-auto max-w-2xl px-5 py-24 text-center">
            <h1 className="text-2xl font-light uppercase tracking-widest">{slug.replace(/-/g, " ")}</h1>
            <p className="mt-6 text-sm leading-7 text-black/60">Content for this page is coming soon.</p>
        </section>
    )
}
