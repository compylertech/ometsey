// global imports
import { useRef, useState } from "react";

// local imports
import { UnauthorizedError, uploadImage } from "../api";
import { useAdminData } from "../data";
import { inputCls } from "../ui";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * An image the storefront shows: a thumbnail, the address it is stored under, and an Upload button.
 * Existing products store a path the storefront serves (`/images/…`); an upload gives a full web
 * address instead, and both work in a colourway because the storefront uses the value as an image
 * source as it is.
 */
export function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
    const { token, unauthorized } = useAdminData();
    const fileRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function pick(file: File | undefined) {
        if (!file) return;
        setError(null);
        if (!file.type.startsWith("image/")) return setError("Choose an image file.");
        if (file.size > MAX_BYTES) return setError("That image is over 10 MB.");
        setBusy(true);
        try {
            const uploaded = await uploadImage(token, file);
            onChange(uploaded.secureUrl || uploaded.url || "");
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The upload didn’t go through.");
        } finally {
            setBusy(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    return (
        <div className="min-w-0">
            <span className="mb-1 block text-[11px] text-black/50">{label}</span>
            <div className="flex items-start gap-2">
                <div className="grid h-[38px] w-[38px] shrink-0 place-items-center overflow-hidden border border-[var(--a-border)] bg-[var(--a-subtle)]">
                    {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-black/35">none</span>}
                </div>
                <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/images/… or upload" aria-label={label} className={inputCls} />
                <button type="button" className="a-btn shrink-0" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Uploading…" : "Upload"}</button>
                <input ref={fileRef} type="file" accept="image/*" hidden aria-label={`${label} file`} onChange={(e) => void pick(e.target.files?.[0])} />
            </div>
            {error && <p role="alert" className="m-0 mt-1 text-[11.5px] text-[var(--a-st-can)]">{error}</p>}
        </div>
    );
}
