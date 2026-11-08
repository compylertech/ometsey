import type { Automation, EmailTemplate } from "./types"

/** Starter copy. Everything here is editable from the Emails > Templates tab. */
export const DEFAULT_TEMPLATES: EmailTemplate[] = [
    {
        id: "order-received",
        name: "Order received",
        subject: "We’ve received your order {{order_number}}",
        body: `Hi {{first_name}},

Thank you for your order {{order_number}}. Your pieces are made to order in Accra, so they take 6–10 working days to ship once payment is confirmed.

Order total: {{total}}

If you need to share measurements or change anything, just reply to this email or WhatsApp us on {{store_phone}}.

With thanks,
OMETSEY`,
    },
    {
        id: "payment-received",
        name: "Payment received",
        subject: "Payment received for {{order_number}}",
        body: `Hi {{first_name}},

We’ve received your payment of {{total}} for order {{order_number}}. Your order is now in production and we’ll let you know as soon as it ships.

With thanks,
OMETSEY`,
    },
    {
        id: "order-shipped",
        name: "Order shipped",
        subject: "Your OMETSEY order {{order_number}} is on its way",
        body: `Hi {{first_name}},

Good news: your order {{order_number}} has shipped.

Tracking number: {{tracking_number}}

Please allow extra time for customs if you are outside Ghana. If anything is wrong when it arrives, tell us early and we’ll make minor adjustments.

With thanks,
OMETSEY`,
    },
    {
        id: "bespoke-consultation",
        name: "Bespoke consultation",
        subject: "Your OMETSEY bespoke consultation",
        body: `Hi {{first_name}},

Thank you for your interest in a bespoke piece. The next step is a one-on-one consultation with our Creative Director, Darkwaa Edna, in person or virtually.

The consultation fee is GHS 300.00. It is non-refundable but is deducted from the final cost of your garment once the design is confirmed. Please reply with a few times that suit you.

With thanks,
OMETSEY`,
    },
    {
        id: "discount-offer",
        name: "Discount offer",
        subject: "A little something from OMETSEY",
        body: `Hi {{first_name}},

We’d like to offer you a discount on your next order. Use this link and it will be applied for you:

{{discount_link}}

Or enter the code {{discount_code}} at checkout.

With thanks,
OMETSEY`,
    },
    {
        id: "welcome",
        name: "Welcome",
        subject: "Welcome to OMETSEY",
        body: `Hi {{first_name}},

Welcome to OMETSEY, a contemporary women’s fashion brand proudly made in Ghana. We’ll keep you posted on new collections, events and bespoke openings.

With thanks,
OMETSEY`,
    },
];

export const DEFAULT_AUTOMATIONS: Automation[] = [
    { id: "auto-placed", trigger: "ORDER_PLACED", templateId: "order-received", enabled: true },
    { id: "auto-paid", trigger: "ORDER_PAID", templateId: "payment-received", enabled: true },
    { id: "auto-shipped", trigger: "ORDER_SHIPPED", templateId: "order-shipped", enabled: true },
];

export const TRIGGER_LABEL = {
    ORDER_PLACED: "Order placed",
    ORDER_PAID: "Payment received",
    ORDER_SHIPPED: "Order shipped",
} as const;
