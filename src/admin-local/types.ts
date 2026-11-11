export type OrderStatus = "AWAITING_PAYMENT" | "AWAITING_FULFILMENT" | "COMPLETED" | "CANCELLED";
export type OrderSource = "website" | "whatsapp" | "in-store" | "bespoke";

export interface OrderItem {
    handle: string;
    title: string;
    size: string;
    qty: number;
    /** Unit price in GHS at the time of the order. */
    price: number;
}

export interface Order {
    id: string;
    number: string;
    placedAt: string;
    status: OrderStatus;
    source: OrderSource;
    customer: { name: string; email: string; phone: string };
    shipTo: string;
    items: OrderItem[];
    shipping: number;
    discountCode?: string;
    /** Amount taken off the item subtotal, in GHS. */
    discount: number;
    notes?: string;
    paidAt?: string;
    trackingNumber?: string;
    /** Marks demo records so they can be removed without touching real ones. */
    sample?: boolean;
}

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface DiscountLink {
    id: string;
    code: string;
    type: DiscountType;
    value: number;
    /** A product handle, or "ALL". */
    scope: string;
    note: string;
    active: boolean;
    createdAt: string;
    expiresAt?: string;
    sample?: boolean;
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
}

export type AutomationTrigger = "ORDER_PLACED" | "ORDER_PAID" | "ORDER_SHIPPED";

export interface Automation {
    id: string;
    trigger: AutomationTrigger;
    templateId: string;
    enabled: boolean;
}

export type EmailStatus = "QUEUED" | "DRAFTED" | "SENT";

export interface QueuedEmail {
    id: string;
    templateId: string;
    to: string;
    name: string;
    subject: string;
    body: string;
    reason: string;
    status: EmailStatus;
    createdAt: string;
    sample?: boolean;
}

export interface NewOrder {
    source: OrderSource;
    customer: { name: string; email: string; phone: string };
    shipTo: string;
    items: OrderItem[];
    shipping: number;
    discountCode?: string;
    discount: number;
    notes?: string;
    paid: boolean;
}
