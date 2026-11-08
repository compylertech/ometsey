import { useState } from "react"
import { COLLECTION_TITLES, money } from "@/data/catalog"
import { useProducts } from "@/store/catalog"
import { useAdmin } from "../store"
import type { DiscountType } from "../types"
import { Card, Empty, Notice, PageHead, Td, Th, btn, btnSolid, fmtDate, inputCls, linkBtn } from "../ui"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () => "OM-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join("");

export const discountLink = (code: string, scope: string) =>
    `${window.location.origin}${scope === "ALL" ? "/" : `/products/${scope}`}?discount=${encodeURIComponent(code)}`;

export function Discounts() {
    const { discounts, addDiscount, toggleDiscount, removeDiscount } = useAdmin();
    const products = useProducts({ includeHidden: true });
    const [f, setF] = useState({ code: makeCode(), type: "PERCENTAGE" as DiscountType, value: "10", scope: "ALL", note: "", expiresAt: "" });
    const [error, setError] = useState("");
    const [copied, setCopied] = useState<string | null>(null);
    const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = f.code.trim().toUpperCase();
        const value = Number(f.value);
        if (!/^[A-Z0-9-]{3,24}$/.test(code)) return setError("Codes are 3–24 letters, numbers or dashes.");
        if (discounts.some((d) => d.code === code)) return setError("That code already exists.");
        if (!(value > 0)) return setError("Enter a value above zero.");
        if (f.type === "PERCENTAGE" && value > 100) return setError("A percentage can’t exceed 100.");
        setError("");
        addDiscount({ code, type: f.type, value, scope: f.scope, note: f.note, expiresAt: f.expiresAt || undefined });
        setF({ code: makeCode(), type: f.type, value: f.value, scope: "ALL", note: "", expiresAt: "" });
    };

    const copy = async (id: string, text: string) => {
        try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { window.prompt("Copy this link", text); }
    };

    return (
        <>
            <PageHead title="Discounts" />
            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <Card title="New discount link">
                    <form onSubmit={submit} className="space-y-3 text-[13px]">
                        <div className="flex gap-2">
                            <input value={f.code} onChange={(e) => set("code", e.target.value)} className={`${inputCls} uppercase`} aria-label="Code" />
                            <button type="button" className={btn} onClick={() => set("code", makeCode())}>New</button>
                        </div>
                        <div className="flex gap-2">
                            <select value={f.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                                <option value="PERCENTAGE">Percentage off</option><option value="FIXED_AMOUNT">Fixed amount off (₵)</option>
                            </select>
                            <input type="number" min={1} value={f.value} onChange={(e) => set("value", e.target.value)} className={`${inputCls} w-24`} aria-label="Value" />
                        </div>
                        <select value={f.scope} onChange={(e) => set("scope", e.target.value)} className={inputCls}>
                            <option value="ALL">Whole store</option>
                            {products.map((p) => <option key={p.handle} value={p.handle}>{p.title}</option>)}
                        </select>
                        <input type="date" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={inputCls} aria-label="Expires" />
                        <input placeholder="Note (who is this for?)" value={f.note} onChange={(e) => set("note", e.target.value)} className={inputCls} />
                        {error && <p className="text-[12px] text-red-700">{error}</p>}
                        <button className={`${btnSolid} w-full`}>Create link</button>
                    </form>
                </Card>

                <div className="min-w-0 space-y-4">
                    <Notice tone="warn">
                        Links are generated and tracked here, but the storefront can’t redeem a code yet: that needs the backend to check it, so customers can’t simply edit the link to give themselves a bigger discount.
                    </Notice>
                    <Card flush>
                        {discounts.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px]">
                                    <thead><tr><Th>Code</Th><Th>Discount</Th><Th>Applies to</Th><Th>Expires</Th><Th>Status</Th><Th /></tr></thead>
                                    <tbody>{discounts.map((d) => {
                                        const link = discountLink(d.code, d.scope);
                                        const expired = d.expiresAt && new Date(d.expiresAt) < new Date();
                                        return (
                                            <tr key={d.id} className="border-t border-[var(--a-border-soft)] align-top">
                                                <Td><span className="font-medium">{d.code}</span>{d.sample && <span className="ml-2 text-[10px] text-black/40">SAMPLE</span>}{d.note && <span className="block text-[12px] text-black/50">{d.note}</span>}</Td>
                                                <Td>{d.type === "PERCENTAGE" ? `${d.value}%` : money(d.value)}</Td>
                                                <Td>{d.scope === "ALL" ? "Whole store" : products.find((p) => p.handle === d.scope)?.title ?? COLLECTION_TITLES[d.scope] ?? d.scope}</Td>
                                                <Td>{d.expiresAt ? fmtDate(d.expiresAt) : "Never"}</Td>
                                                <Td><button onClick={() => toggleDiscount(d.id)} className={linkBtn}>{expired ? "Expired" : d.active ? "Active" : "Paused"}</button></Td>
                                                <Td right>
                                                    <button onClick={() => copy(d.id, link)} className={linkBtn}>{copied === d.id ? "Copied" : "Copy link"}</button>
                                                    <button onClick={() => { if (confirm(`Delete ${d.code}?`)) removeDiscount(d.id); }} className={`${linkBtn} ml-4 text-black/50`}>Delete</button>
                                                </Td>
                                            </tr>
                                        );
                                    })}</tbody>
                                </table>
                            </div>
                        ) : <Empty>No discount links yet.</Empty>}
                    </Card>
                </div>
            </div>
        </>
    );
}
