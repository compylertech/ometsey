import { PageShell } from "@/components/Form"
import { HOURS, STORE_HQ } from "@/data/catalog"

export function StoreLocation() {
    const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE_HQ.mapQuery)}`;
    return (
        <PageShell title="Stores">
            <div className="mx-auto max-w-md text-center text-[14px] uppercase leading-6">
                <h2 className="underline underline-offset-4">Headquarters</h2>
                <p className="mt-8">{STORE_HQ.address.map((l) => <span key={l} className="block">{l}</span>)}</p>
                <div className="mt-10">{HOURS.map((h) => <p key={h.days} className="mb-3">{h.days}<br />{h.hours}</p>)}</div>
                <p className="mt-10">Reach us via WhatsApp<br />{STORE_HQ.phone}</p>
                <a href={map} target="_blank" rel="noreferrer" className="label ulink mt-10 inline-block">Open in Google Maps</a>
            </div>
        </PageShell>
    );
}
