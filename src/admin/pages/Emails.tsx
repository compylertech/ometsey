import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { fill, mailtoLink, mergeVars, toHtml, MERGE_TAGS } from "../email"
import { DEFAULT_TEMPLATES, TRIGGER_LABEL } from "../defaults"
import { useAdmin } from "../store"
import type { EmailStatus, EmailTemplate, QueuedEmail } from "../types"
import { discountLink } from "./Discounts"
import { Card, Drawer, EmailBadge, Empty, Notice, PageHead, Tabs, Td, Th, btn, btnSolid, fmtDateTime, inputCls, linkBtn } from "../ui"

type Tab = "pipeline" | "templates" | "compose";
const TABS: { id: Tab; label: string }[] = [{ id: "pipeline", label: "Pipeline" }, { id: "templates", label: "Templates" }, { id: "compose", label: "Compose" }];

/** Sandboxed so a template can never run script in the admin. */
const Preview = ({ body }: { body: string }) => <iframe title="Email preview" sandbox="" srcDoc={toHtml(body)} className="h-[420px] w-full border border-[var(--a-border-soft)] bg-white" />;

// ---------- pipeline ----------

function Pipeline() {
    const { queue, automations, templates, setAutomation, setEmailStatus, removeEmail } = useAdmin();
    const [filter, setFilter] = useState<"ALL" | EmailStatus>("ALL");
    const [view, setView] = useState<QueuedEmail | null>(null);
    const shown = queue.filter((q) => filter === "ALL" || q.status === filter);
    const count = (s: EmailStatus) => queue.filter((q) => q.status === s).length;

    const openInMail = (q: QueuedEmail) => {
        window.location.href = mailtoLink(q.to, q.subject, q.body);
        if (q.status === "QUEUED") setEmailStatus(q.id, "DRAFTED");
    };

    return (
        <div className="space-y-6">
            <Notice tone="warn">
                Emails are drafted and queued automatically when an order changes. Sending is one click per email, which opens it in your email app. Fully automatic sending needs the email service from the backend.
            </Notice>

            <Card title="Automations">
                <div className="space-y-3">
                    {automations.map((a) => (
                        <div key={a.id} className="flex flex-wrap items-center gap-4 text-[13px]">
                            <label className="flex w-52 items-center gap-2"><input type="checkbox" checked={a.enabled} onChange={(e) => setAutomation(a.id, { enabled: e.target.checked })} />When: {TRIGGER_LABEL[a.trigger]}</label>
                            <span className="text-black/40">queue</span>
                            <select value={a.templateId} onChange={(e) => setAutomation(a.id, { templateId: e.target.value })} className={`${inputCls} max-w-xs`}>
                                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </Card>

            <Tabs value={filter} onChange={setFilter} items={[
                { id: "ALL", label: "All", count: queue.length },
                { id: "QUEUED", label: "Queued", count: count("QUEUED") },
                { id: "DRAFTED", label: "Drafted", count: count("DRAFTED") },
                { id: "SENT", label: "Sent", count: count("SENT") },
            ]} />
            <Card flush>
                {shown.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px]">
                            <thead><tr><Th>To</Th><Th>Subject</Th><Th>Reason</Th><Th>Created</Th><Th>Status</Th><Th /></tr></thead>
                            <tbody>{shown.map((q) => (
                                <tr key={q.id} className="border-t border-[var(--a-border-soft)] align-top">
                                    <Td>{q.name}<span className="block text-[12px] text-black/50">{q.to}</span></Td>
                                    <Td>{q.subject}</Td><Td className="text-black/60">{q.reason}</Td><Td>{fmtDateTime(q.createdAt)}</Td><Td><EmailBadge status={q.status} /></Td>
                                    <Td right className="whitespace-nowrap">
                                        <button className={linkBtn} onClick={() => setView(q)}>Preview</button>
                                        <button className={`${linkBtn} ml-3`} onClick={() => openInMail(q)}>Open in email</button>
                                        {q.status !== "SENT" && <button className={`${linkBtn} ml-3`} onClick={() => setEmailStatus(q.id, "SENT")}>Mark sent</button>}
                                        <button className={`${linkBtn} ml-3 text-black/50`} onClick={() => removeEmail(q.id)}>Remove</button>
                                    </Td>
                                </tr>))}</tbody>
                        </table>
                    </div>
                ) : <Empty>{queue.length ? "Nothing in this view." : "No emails yet. Create an order, or compose one."}</Empty>}
            </Card>

            <Drawer open={view !== null} onClose={() => setView(null)} title={view?.subject ?? "Email"}>
                {view && <><p className="mb-3 text-[12px] text-black/60">To {view.to}</p><Preview body={view.body} /></>}
            </Drawer>
        </div>
    );
}

// ---------- templates ----------

const SAMPLE_VARS = { first_name: "Ama", name: "Ama Mensah", order_number: "OM-1042", total: "₵ 1,500.00", tracking_number: "TRACK123456", discount_code: "OM-ABC123", discount_link: "https://example.com/?discount=OM-ABC123" };

function Templates() {
    const { templates, saveTemplate, removeTemplate } = useAdmin();
    const [id, setId] = useState(templates[0]?.id ?? "");
    const current = templates.find((t) => t.id === id);
    const [draft, setDraft] = useState<EmailTemplate | undefined>(current);
    useEffect(() => setDraft(templates.find((t) => t.id === id)), [id, templates]);

    const create = () => {
        const t: EmailTemplate = { id: `custom-${crypto.randomUUID().slice(0, 8)}`, name: "New template", subject: "", body: "Hi {{first_name}},\n\n\n\nWith thanks,\nOMETSEY" };
        saveTemplate(t);
        setId(t.id);
    };
    const builtin = DEFAULT_TEMPLATES.some((t) => t.id === id);
    const dirty = draft && current && (draft.name !== current.name || draft.subject !== current.subject || draft.body !== current.body);

    return (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <div>
                <button className={`${btn} mb-4 w-full`} onClick={create}>New template</button>
                <ul className="space-y-1">{templates.map((t) => (
                    <li key={t.id}><button onClick={() => setId(t.id)} className={`w-full py-1.5 text-left text-[13px] ${t.id === id ? "font-medium underline underline-offset-4" : "text-black/60"}`}>{t.name}</button></li>
                ))}</ul>
            </div>
            {draft ? (
                <div className="grid min-w-0 gap-6 xl:grid-cols-2">
                    <div className="space-y-3">
                        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} aria-label="Template name" />
                        <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Subject" className={inputCls} />
                        <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={14} className={inputCls} aria-label="Body" />
                        <div className="flex flex-wrap gap-1.5">
                            {MERGE_TAGS.map((tag) => (
                                <button key={tag} onClick={() => setDraft({ ...draft, body: `${draft.body}{{${tag}}}` })} className="border border-[var(--a-border-soft)] bg-white px-2 py-1 text-[11px] hover:border-black">{`{{${tag}}}`}</button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <button className={btnSolid} disabled={!dirty} onClick={() => saveTemplate(draft)}>Save</button>
                            {builtin && <button className={linkBtn} onClick={() => { const d = DEFAULT_TEMPLATES.find((t) => t.id === id)!; setDraft(d); saveTemplate(d); }}>Restore original</button>}
                            {!builtin && <button className={`${linkBtn} text-black/50`} onClick={() => { if (confirm(`Delete “${draft.name}”?`)) { removeTemplate(draft.id); setId(templates.find((t) => t.id !== draft.id)?.id ?? ""); } }}>Delete</button>}
                        </div>
                    </div>
                    <div>
                        <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">Preview · {fill(draft.subject, { ...mergeVars(), ...SAMPLE_VARS }) || "No subject"}</p>
                        <Preview body={fill(draft.body, { ...mergeVars(), ...SAMPLE_VARS })} />
                    </div>
                </div>
            ) : <Empty>Create a template to get started.</Empty>}
        </div>
    );
}

// ---------- compose ----------

function Compose() {
    const [params] = useSearchParams();
    const { orders, templates, discounts, enqueue } = useAdmin();
    const [to, setTo] = useState(params.get("to") ?? "");
    const [name, setName] = useState(params.get("name") ?? "");
    const [orderId, setOrderId] = useState(params.get("order") ?? "");
    const [templateId, setTemplateId] = useState("");
    const [discountId, setDiscountId] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [done, setDone] = useState("");

    const order = orders.find((o) => o.id === orderId);
    const discount = discounts.find((d) => d.id === discountId);

    // Picking an order fills the recipient in; picking a template, order or discount refills the draft.
    useEffect(() => { if (order) { setTo(order.customer.email); setName(order.customer.name); } }, [order]);
    useEffect(() => {
        const t = templates.find((x) => x.id === templateId);
        if (!t) return;
        const vars = mergeVars(order, {
            ...(order ? {} : { name }),
            ...(discount ? { discount_code: discount.code, discount_link: discountLink(discount.code, discount.scope) } : {}),
        });
        setSubject(fill(t.subject, vars));
        setBody(fill(t.body, vars));
        // `name` is read but deliberately not a dependency: typing it must not overwrite an edited draft.
    }, [templateId, order, discount, templates]); // eslint-disable-line react-hooks/exhaustive-deps

    const ready = to.trim() && subject.trim() && body.trim();
    const make = (status: EmailStatus) => enqueue({ templateId, to: to.trim(), name: name || to, subject, body, reason: "Manual", status });

    return (
        <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3 text-[13px]">
                <div className="grid gap-3 sm:grid-cols-2">
                    <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To (email)" className={inputCls} />
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipient name" className={inputCls} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}><option value="">Template…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputCls}><option value="">Order…</option>{orders.slice(0, 100).map((o) => <option key={o.id} value={o.id}>{o.number} · {o.customer.name}</option>)}</select>
                    <select value={discountId} onChange={(e) => setDiscountId(e.target.value)} className={inputCls}><option value="">Discount link…</option>{discounts.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}</select>
                </div>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={inputCls} />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={13} placeholder="Write your message, or pick a template above." className={inputCls} />
                <div className="flex flex-wrap items-center gap-3">
                    <button className={btnSolid} disabled={!ready} onClick={() => { make("DRAFTED"); window.location.href = mailtoLink(to.trim(), subject, body); }}>Open in email app</button>
                    <button className={btn} disabled={!ready} onClick={() => { make("QUEUED"); setDone("Added to the pipeline."); }}>Add to pipeline</button>
                    {done && <span className="text-[12px] text-black/60">{done}</span>}
                </div>
                <p className="text-[11px] text-black/40">Your email app receives the plain-text version.</p>
            </div>
            <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-black/50">Preview</p>
                <Preview body={body || "Your message will appear here."} />
            </div>
        </div>
    );
}

export function Emails() {
    const [params, setParams] = useSearchParams();
    const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "pipeline") as Tab;
    return (
        <>
            <PageHead title="Emails" />
            <div className="mb-6"><Tabs value={tab} onChange={(t) => setParams(t === "pipeline" ? {} : { tab: t })} items={TABS} /></div>
            {tab === "pipeline" && <Pipeline />}
            {tab === "templates" && <Templates />}
            {tab === "compose" && <Compose />}
        </>
    );
}
