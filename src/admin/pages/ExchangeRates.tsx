// global imports
import { useCallback, useEffect, useState } from "react";

// local imports
import { fetchExchangeRates, setExchangeRate, UnauthorizedError, withRetry } from "../api";
import { useAdminData } from "../data";
import { Notice, Td, Th, btn, btnSolid, inputCls } from "../ui";
import type { ExchangeRate } from "../types";

const validRate = (raw: string) => /^\d+(\.\d{1,6})?$/.test(raw.trim()) && Number(raw) >= 0.000001;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * The rates the storefront converts prices with, and charges with in a currency Paystack doesn't
 * settle directly. Setting a rate applies from now on; the old one is kept as history.
 */
export function ExchangeRates() {
    const { token, unauthorized } = useAdminData();
    const [rates, setRates] = useState<ExchangeRate[] | null>(null);
    const [history, setHistory] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [from, setFrom] = useState("USD");
    const [to, setTo] = useState("");
    const [rate, setRate] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);

    const load = useCallback(async (withHistory: boolean) => {
        setLoadError(null);
        try {
            setRates(await withRetry(() => fetchExchangeRates(token, withHistory), () => undefined, () => true));
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setLoadError(err instanceof Error ? err.message : "Couldn’t load the exchange rates.");
        }
    }, [token, unauthorized]);

    useEffect(() => { void load(history); }, [load, history]);

    const f = from.trim().toUpperCase();
    const t = to.trim().toUpperCase();
    const valid = /^[A-Z]{3}$/.test(f) && /^[A-Z]{3}$/.test(t) && f !== t && validRate(rate);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError(null);
        setSaved(null);
        try {
            const next = await setExchangeRate(token, { from: f, to: t, rate: Number(rate), ...(note.trim() ? { note: note.trim() } : {}) });
            setSaved(`1 ${next.from} = ${next.rate} ${next.to} from now on.`);
            setRate("");
            setNote("");
            void load(history);
        } catch (err) {
            if (err instanceof UnauthorizedError) return unauthorized();
            setError(err instanceof Error ? err.message : "The rate wasn’t saved.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6 text-[13px]">
            <Notice>A product priced in one currency is also buyable in another when there’s a rate for the pair (or a fixed price you enter). Without either, buyers can’t choose that currency. Changing a rate affects new orders only.</Notice>

            <form onSubmit={submit} noValidate className="space-y-3">
                <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-black/50">Set a rate</p>
                <div className="grid grid-cols-[1fr_auto_1fr_1.2fr] items-end gap-2">
                    <label className="block"><span className="mb-1 block text-[11px] text-black/50">1 unit of</span><input value={from} maxLength={3} aria-label="From currency" onChange={(e) => setFrom(e.target.value)} className={`${inputCls} uppercase`} /></label>
                    <span className="pb-2 text-black/40">=</span>
                    <label className="block"><span className="mb-1 block text-[11px] text-black/50">buys (in)</span><input value={to} maxLength={3} placeholder="GHS" aria-label="To currency" onChange={(e) => setTo(e.target.value)} className={`${inputCls} uppercase`} /></label>
                    <label className="block"><span className="mb-1 block text-[11px] text-black/50">Rate</span><input value={rate} inputMode="decimal" placeholder="12.4" aria-label="Rate" aria-invalid={!!rate.trim() && !validRate(rate)} onChange={(e) => setRate(e.target.value)} className={inputCls} /></label>
                </div>
                <label className="block"><span className="mb-1 block text-[11px] text-black/50">Note (optional)</span><input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={inputCls} /></label>
                {saved && <Notice>{saved}</Notice>}
                {error && <Notice tone="error">{error}</Notice>}
                <button className={btnSolid} disabled={!valid || busy}>{busy ? "Saving..." : "Set rate"}</button>
            </form>

            <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-black/50">{history ? "Every rate ever set" : "Rates in force now"}</p>
                    <button type="button" className={btn} onClick={() => setHistory((h) => !h)}>{history ? "Show current only" : "Show history"}</button>
                </div>
                {loadError ? <Notice tone="error">{loadError}</Notice> : !rates ? <p className="m-0 py-6 text-center text-black/45">Loading…</p> : rates.length ? (
                    <div className="overflow-x-auto border border-[var(--a-border-soft)]">
                        <table className="w-full border-collapse">
                            <thead><tr><Th>Pair</Th><Th right>Rate</Th><Th>From</Th><Th>{history ? "Until" : "Note"}</Th></tr></thead>
                            <tbody>{rates.map((r) => (
                                <tr key={r.id} className="border-t border-[var(--a-border-soft)]">
                                    <Td className="font-medium">{r.from} → {r.to}</Td><Td right>{r.rate}</Td><Td>{day(r.effectiveFrom)}</Td>
                                    <Td className="text-black/60">{history ? (r.effectiveTo ? day(r.effectiveTo) : "In force") : (r.note ?? "—")}</Td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : <p className="m-0 py-6 text-center text-black/45">No exchange rates are set yet.</p>}
            </section>
        </div>
    );
}
