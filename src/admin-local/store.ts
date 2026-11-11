import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DEFAULT_AUTOMATIONS, DEFAULT_TEMPLATES } from "./defaults"
import { fill, mergeVars } from "./email"
import { sampleData } from "./seed"
import type {
    Automation, AutomationTrigger, DiscountLink, EmailStatus, EmailTemplate, NewOrder, Order, QueuedEmail,
} from "./types"

/**
 * Admin data lives in this browser only (localStorage). Every mutation goes through these actions,
 * so moving to the project-x backend later means replacing this file, not the pages.
 */
interface AdminState {
    orders: Order[];
    discounts: DiscountLink[];
    templates: EmailTemplate[];
    automations: Automation[];
    queue: QueuedEmail[];

    addOrder: (input: NewOrder) => Order;
    markPaid: (id: string) => void;
    markShipped: (id: string, trackingNumber: string) => void;
    cancelOrder: (id: string) => void;

    addDiscount: (d: Omit<DiscountLink, "id" | "createdAt" | "active">) => void;
    toggleDiscount: (id: string) => void;
    removeDiscount: (id: string) => void;

    saveTemplate: (t: EmailTemplate) => void;
    removeTemplate: (id: string) => void;
    setAutomation: (id: string, patch: Partial<Automation>) => void;

    enqueue: (e: Omit<QueuedEmail, "id" | "createdAt" | "status"> & { status?: EmailStatus }) => void;
    setEmailStatus: (id: string, status: EmailStatus) => void;
    removeEmail: (id: string) => void;

    loadSample: () => void;
    clearSample: () => void;
    resetAll: () => void;
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Queues an email for each enabled automation on this trigger, rendered for this order. */
function fire(state: Pick<AdminState, "automations" | "templates" | "queue">, trigger: AutomationTrigger, order: Order): QueuedEmail[] {
    const made: QueuedEmail[] = [];
    for (const a of state.automations.filter((x) => x.enabled && x.trigger === trigger)) {
        const t = state.templates.find((x) => x.id === a.templateId);
        if (!t || !order.customer.email) continue;
        const vars = mergeVars(order);
        made.push({
            id: uid(), templateId: t.id, to: order.customer.email, name: order.customer.name,
            subject: fill(t.subject, vars), body: fill(t.body, vars),
            reason: `${order.number} · ${trigger.replace("ORDER_", "").toLowerCase()}`,
            status: "QUEUED", createdAt: now(), sample: order.sample,
        });
    }
    return made;
}

const nextNumber = (orders: Order[]) =>
    orders.reduce((n, o) => Math.max(n, Number(o.number.replace(/\D/g, "")) || 0), 1000) + 1;

export const useAdmin = create<AdminState>()(persist((set, get) => ({
    orders: [],
    discounts: [],
    templates: DEFAULT_TEMPLATES,
    automations: DEFAULT_AUTOMATIONS,
    queue: [],

    addOrder: (input) => {
        const s = get();
        const { paid, ...rest } = input;
        const order: Order = {
            ...rest, id: uid(), number: `OM-${nextNumber(s.orders)}`, placedAt: now(),
            status: paid ? "AWAITING_FULFILMENT" : "AWAITING_PAYMENT", paidAt: paid ? now() : undefined,
        };
        const emails = [...fire(s, "ORDER_PLACED", order), ...(paid ? fire(s, "ORDER_PAID", order) : [])];
        set({ orders: [order, ...s.orders], queue: [...emails, ...s.queue] });
        return order;
    },
    markPaid: (id) => {
        const s = get();
        const o = s.orders.find((x) => x.id === id);
        if (!o || o.status !== "AWAITING_PAYMENT") return;
        const next: Order = { ...o, status: "AWAITING_FULFILMENT", paidAt: now() };
        set({ orders: s.orders.map((x) => (x.id === id ? next : x)), queue: [...fire(s, "ORDER_PAID", next), ...s.queue] });
    },
    markShipped: (id, trackingNumber) => {
        const s = get();
        const o = s.orders.find((x) => x.id === id);
        if (!o || o.status !== "AWAITING_FULFILMENT") return;
        const next: Order = { ...o, status: "COMPLETED", trackingNumber };
        set({ orders: s.orders.map((x) => (x.id === id ? next : x)), queue: [...fire(s, "ORDER_SHIPPED", next), ...s.queue] });
    },
    cancelOrder: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: "CANCELLED" } : o)) })),

    addDiscount: (d) => set((s) => ({ discounts: [{ ...d, id: uid(), createdAt: now(), active: true }, ...s.discounts] })),
    toggleDiscount: (id) => set((s) => ({ discounts: s.discounts.map((d) => (d.id === id ? { ...d, active: !d.active } : d)) })),
    removeDiscount: (id) => set((s) => ({ discounts: s.discounts.filter((d) => d.id !== id) })),

    saveTemplate: (t) => set((s) => ({
        templates: s.templates.some((x) => x.id === t.id) ? s.templates.map((x) => (x.id === t.id ? t : x)) : [...s.templates, t],
    })),
    removeTemplate: (id) => set((s) => ({
        templates: s.templates.filter((t) => t.id !== id),
        automations: s.automations.map((a) => (a.templateId === id ? { ...a, enabled: false } : a)),
    })),
    setAutomation: (id, patch) => set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

    enqueue: (e) => set((s) => ({ queue: [{ ...e, id: uid(), createdAt: now(), status: e.status ?? "QUEUED" }, ...s.queue] })),
    setEmailStatus: (id, status) => set((s) => ({ queue: s.queue.map((q) => (q.id === id ? { ...q, status } : q)) })),
    removeEmail: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),

    loadSample: () => set((s) => {
        if (s.orders.some((o) => o.sample)) return s;
        const d = sampleData(nextNumber(s.orders));
        return { orders: [...d.orders, ...s.orders], discounts: [...d.discounts, ...s.discounts] };
    }),
    clearSample: () => set((s) => ({
        orders: s.orders.filter((o) => !o.sample),
        discounts: s.discounts.filter((d) => !d.sample),
        queue: s.queue.filter((q) => !q.sample),
    })),
    resetAll: () => set({ orders: [], discounts: [], templates: DEFAULT_TEMPLATES, automations: DEFAULT_AUTOMATIONS, queue: [] }),
}), { name: "ometsey-admin" }))

