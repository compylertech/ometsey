import { CURRENCIES, type Currency } from "@/lib/money"
import { useMarket, useMoney } from "@/store/market"

/**
 * Pick a currency. Where the visitor is decides the starting one; this just lets them change it,
 * and the choice is remembered.
 */
export function CurrencySelect({ className = "" }: { className?: string }) {
    const { currency } = useMoney();
    const setCurrency = useMarket((s) => s.setCurrency);
    return (
        <label className={className}>
            <span className="sr-only">Currency</span>
            <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="cursor-pointer border-0 bg-transparent py-0.5 pr-1 text-[13px] outline-none"
                style={{ color: "inherit" }}
            >
                {(Object.keys(CURRENCIES) as Currency[]).map((c) => <option key={c} value={c} className="text-black">{CURRENCIES[c].label}</option>)}
            </select>
        </label>
    );
}
