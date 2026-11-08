import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react"

const line = "w-full border-0 border-b border-black/30 bg-transparent py-3 text-[13px] outline-none placeholder:text-black/50 focus:border-black";

/** Underlined input, as on the reference's account page. The label doubles as the placeholder. */
export function Field({ label, ...rest }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
    return <input aria-label={label} placeholder={label} className={line} {...rest} />;
}

export function Area({ label, ...rest }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea aria-label={label} placeholder={label} rows={4} className={`${line} resize-none`} {...rest} />;
}

export function OutlineButton({ children, ...rest }: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button {...rest} className={`border border-black px-6 py-2.5 text-[12px] transition-colors hover:bg-black hover:text-white ${rest.className ?? ""}`}>{children}</button>;
}

/** Page title block shared by the content pages: small uppercase title, top left. */
export function PageShell({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="px-5 pb-20 pt-6 lg:px-6">
            <h1 className="text-[18px] font-normal uppercase">{title}</h1>
            <div className="mt-12">{children}</div>
        </section>
    );
}
