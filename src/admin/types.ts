import type { CheckoutRequest } from "@/lib/storefront-types";

export interface AdminSession {
    token: string;
    email: string;
    name: string;
}

export type AdminOrderStatus = "PLACED" | "PROCESSING" | "FULFILLING" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export interface AdminOrderItem {
    sku: string;
    name: string | null;
    quantity: number;
    totalPrice: number;
    colourway: string | null;
    size: string | null;
}

export interface AdminOrder {
    orderNumber: string;
    orderStatus: AdminOrderStatus;
    placedAt: string | null;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    /** The CRM client behind the order, when one is linked; the Customers page opens on it. */
    clientId?: string | null;
    currency: string;
    subtotal: number;
    shippingTotal: number;
    grandTotal: number;
    shippingWaived: boolean;
    settlementCurrency: string | null;
    settlementAmount: number | null;
    paymentStatus: string | null;
    paid: boolean;
    paidAt: string | null;
    providerTransactionId: string | null;
    shipToName: string | null;
    shipToPhone: string | null;
    shipToAddress: string | null;
    shipToAddress2: string | null;
    shipToCity: string | null;
    shipToRegion: string | null;
    shipToPostalCode: string | null;
    shipToCountry: string | null;
    notes: string | null;
    items: AdminOrderItem[];
    /*
     * Added by the order-actions backend work. Optional so the portal still works against a
     * server that does not send them yet.
     */
    discountTotal?: number | null;
    source?: string | null;
    fulfillmentStatus?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    shippedAt?: string | null;
}

/** Where a manual order came from; the server reports "storefront" for website orders. */
export type ManualOrderSource = "WHATSAPP" | "IN_STORE" | "PHONE" | "OTHER";

/** Offline ways to be paid. Card methods are rejected by the server. */
export type ManualPaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CHECK" | "OTHER";

export interface ShipOrderRequest {
    trackingNumber: string;
    trackingUrl?: string;
}

export interface MarkPaidRequest {
    method: ManualPaymentMethod;
    reference?: string;
    note?: string;
}

export interface CreateOrderRequest {
    /** Exactly the storefront checkout request; the server prices it. */
    order: CheckoutRequest;
    source: ManualOrderSource;
    alreadyPaid: boolean;
    paymentMethod?: ManualPaymentMethod;
    paymentReference?: string;
}

export interface CreateOrderResult {
    order: AdminOrder;
    /** The Paystack link to send the customer. Null when the order was recorded as paid. */
    paymentLink: string | null;
}

export interface AdminOrdersView {
    awaitingFulfilment: AdminOrder[];
    /** Shipped with tracking, not yet delivered. Absent on a server that predates the Shipped stage. */
    shipped?: AdminOrder[];
    shippedCount?: number;
    awaitingPayment: AdminOrder[];
    closed: AdminOrder[];
    awaitingFulfilmentCount: number;
    awaitingPaymentCount: number;
    closedCount: number;
    currency: string | null;
    awaitingFulfilmentValue: number;
    settlementCurrency: string | null;
    collectedValue: number;
}

// ---------- discount links ----------

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

/** One sellable price point on a product — one row per "piece" for a multi-piece product,
 *  or a single "Standard price" row for a simple product. */
export interface AdminProductPrice {
    label: string;
    price: number;
}

/** What one other currency shows for a piece: a price entered for it (`fixed`) or the main price converted. */
export interface CurrencyPriceRow {
    label: string;
    price: number | null;
    fixed: boolean;
}

export interface ProductCurrencyPrices {
    currency: string;
    /** The conversion rate in force, or null when none is stored. */
    rate: number | null;
    prices: CurrencyPriceRow[];
}

export interface RevenueByCurrency {
    currency: string;
    units: number;
    amount: number;
}

export interface AdminProductSummary {
    id: string;
    code: string;
    name: string;
    slug: string;
    /** The primary image as a URL the browser can load; null when the product has none. */
    imageUrl?: string | null;
    currency: string;
    /** The cheapest price point — what a fixed-amount discount's 50% floor is checked against. */
    minPrice: number | null;
    prices: AdminProductPrice[];
    /*
     * Added by the products admin API. Optional so the page still works against a server that does
     * not send them: a product with no `visible` is treated as live, and no `sold` shows a dash.
     */
    status?: ProductStatus;
    /** Each other currency's price per piece; empty when the product sells in `currency` only. */
    currencyPrices?: ProductCurrencyPrices[];
    /** Money is never added across currencies: one figure per currency. */
    revenueByCurrency?: RevenueByCurrency[];
    active?: boolean;
    /** On the storefront right now: active and ACTIVE. The "Live / Hidden" badge reads this. */
    visible?: boolean;
    sold?: number;
    revenue?: number;
}

export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

// ---------- product content (the catalog endpoints) ----------

export interface LabelValue {
    label: string;
    value: string;
}

export interface ProductColourway {
    hero?: string;
    detail?: string;
    swatch?: string;
    [key: string]: unknown;
}

/**
 * Storefront content that lives on the product's `attributes`. The server replaces `attributes`
 * as a whole, so anything this portal does not edit (the index signature) must be sent back as it
 * came, or it is lost.
 */
export interface ProductAttributes {
    collection?: string;
    tagline?: string;
    preOrder?: boolean;
    madeToMeasureNote?: string;
    colourways?: Record<string, ProductColourway>;
    details?: LabelValue[];
    shipment?: LabelValue[];
    shipping?: { rates?: Record<string, number>; default?: number; [key: string]: unknown };
    [key: string]: unknown;
}

export interface ProductDetail {
    id: string;
    code: string;
    name: string;
    slug: string;
    brand: string | null;
    description: string | null;
    shortDescription: string | null;
    status: ProductStatus;
    currency: string;
    basePrice: number | null;
    primaryImageId: string | null;
    imageIds: string[] | null;
    tags: string[] | null;
    attributes: ProductAttributes | null;
}

export interface ProductVariant {
    id: string;
    sku: string;
    name: string | null;
    optionValues: Record<string, string> | null;
    priceOverride: number | null;
    currency: string;
    active: boolean;
}

/** A partial variant update. Never `priceOverride` or `currency`: prices go through the prices endpoint. */
export interface UpdateVariantRequest {
    name?: string;
    /** Replaced as a whole: send every option, not just the one that changed. */
    optionValues?: Record<string, string>;
    active?: boolean;
}

/** A partial update: what is omitted is left alone. Never `status`, `active`, `slug` or prices. */
export interface UpdateProductContent {
    brand?: string;
    shortDescription?: string;
    description?: string;
    attributes?: ProductAttributes;
}

export interface UploadedImage {
    secureUrl: string;
    url?: string;
}

export interface ProductPriceChange {
    /** One of the product's `prices[].label`. */
    label: string;
    /** Null with a `currency` removes that currency's fixed price. A main price is never null. */
    price: number | null;
    /** Leave out (or the product's own currency) for the main price; otherwise a fixed price in that currency. */
    currency?: string;
}

export interface ExchangeRate {
    id: string;
    from: string;
    to: string;
    /** 1 `from` buys this many `to`. */
    rate: number;
    active: boolean;
    effectiveFrom: string;
    effectiveTo: string | null;
    note: string | null;
}

export interface SetExchangeRateRequest {
    from: string;
    to: string;
    rate: number;
    note?: string;
}

export interface CreateProductVariant {
    sku: string;
    name?: string;
    optionValues?: Record<string, string>;
    price?: number;
    primaryImageId?: string;
}

export interface CreateProductRequest {
    code: string;
    name: string;
    slug?: string;
    brand?: string;
    shortDescription?: string;
    description?: string;
    /** A path the storefront serves, 50 characters at most. The API does not upload files. */
    primaryImageId?: string;
    currency: string;
    price?: number;
    /** Saved as a draft unless true. */
    visible?: boolean;
    variants?: CreateProductVariant[];
}

export interface AdminDiscountLink {
    id: string;
    productId: string;
    productName: string;
    productSlug: string | null;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    currency: string | null;
    active: boolean;
    note: string | null;
    createdAt: string;
}

export interface CreateDiscountLinkRequest {
    productId: string;
    discountType: DiscountType;
    discountValue: number;
    code?: string;
    note?: string;
}

// ---------- customers ----------

export interface CustomerMoney {
    currency: string;
    amount: number;
}

/** A CRM client who has placed storefront orders. Amounts are never added across currencies. */
export interface AdminCustomer {
    clientId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    billingAccounts: { id: string; accountNumber: string }[];
    /** Orders that are not cancelled, including ones still waiting on payment. */
    orderCount: number;
    /** Orders that are paid and still stand. */
    paidOrderCount: number;
    totalSpent: CustomerMoney[];
    firstOrderAt: string | null;
    lastOrderAt: string | null;
}

export interface CustomerOrderRow {
    orderNumber: string;
    status: string;
    currency: string;
    grandTotal: number;
    placedAt: string | null;
}

export interface AdminCustomerDetail {
    customer: AdminCustomer;
    orders: CustomerOrderRow[];
}
