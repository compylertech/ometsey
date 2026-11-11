// ---------- storefront catalog ----------

export interface StorefrontVariant {
    sku: string;
    name: string | null;
    optionValues: Record<string, string> | null;
    price: number | null;
    compareAtPrice: number | null;
    currency: string;
    available: boolean;
    primaryImageId: string | null;
    imageIds: string[] | null;
}

export interface StorefrontProductOption {
    name: string;
    values: string[];
}

/** A colourway's three shots, as seeded on the product's attributes. */
export interface Colourway {
    hero: string;
    detail: string;
    swatch: string;
}

export interface SpecRow {
    label: string;
    value: string;
}

/**
 * Everything on the product page that is not a price or a variant is seeded onto the
 * catalog product's `attributes`, so copy changes do not need a frontend deploy.
 */
export interface StorefrontAttributes {
    collection?: string;
    tagline?: string;
    /** Absent or true shows the "Pre-order" chip; explicitly false hides it. */
    preOrder?: boolean;
    madeToMeasureNote?: string;
    colourways?: Record<string, Colourway>;
    details?: SpecRow[];
    shipment?: SpecRow[];
    shipping?: { rates?: Record<string, number>; default?: number };
}

// ---------- discount links ----------

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

/** What a buyer following a discount link is told, before they've chosen anything to buy. */
export interface StorefrontDiscount {
    code: string;
    productSlug: string;
    productName: string;
    discountType: DiscountType;
    discountValue: number;
    currency: string;
}

export interface StorefrontProduct {
    code: string;
    slug: string;
    name: string;
    brand: string | null;
    description: string | null;
    shortDescription: string | null;
    currency: string;
    /** The currency the product itself is priced in; `currency` follows the one asked for. */
    nativeCurrency?: string;
    /** Currencies that can be asked for: the product's own, any with a fixed price, any with a rate. */
    availableCurrencies?: string[];
    /** True when the prices were derived with an exchange rate. */
    converted?: boolean;
    exchangeRate?: number | null;
    price: number | null;
    compareAtPrice: number | null;
    primaryImageId: string | null;
    imageIds: string[] | null;
    attributes: StorefrontAttributes | null;
    options: StorefrontProductOption[];
    variants: StorefrontVariant[];
}

// ---------- checkout ----------

export interface CheckoutCustomer {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

export interface CheckoutShippingAddress {
    recipientName: string;
    recipientPhone: string;
    address1: string;
    address2: string;
    city: string;
    region: string;
    postalCode: string;
    /** ISO 3166-1 alpha-2. */
    country: string;
}

export type CheckoutBillingAddress = Omit<CheckoutShippingAddress, "recipientName" | "recipientPhone">;

export interface CheckoutLineItem {
    sku: string;
    quantity: number;
    customisation?: Record<string, string>;
}

export interface CheckoutRequest {
    items: CheckoutLineItem[];
    customer: CheckoutCustomer;
    shippingAddress: CheckoutShippingAddress;
    billingAddress?: CheckoutBillingAddress | null;
    notes?: string;
    callbackUrl?: string;
    /** The code from a discount link's query string, when the basket came from one. */
    discountCode?: string;
    /** The shopper's currency; send the same one to the quote and the checkout. */
    currency?: string;
}

export interface QuoteRequest {
    items: CheckoutLineItem[];
    /** ISO 3166-1 alpha-2. */
    country: string;
    /** Optional: without it the quote shows standard shipping. */
    email?: string;
    discountCode?: string;
    currency?: string;
}

export interface Quote {
    currency: string;
    subtotal: number;
    /** Zero when no discount code was sent, or it didn't match anything in the basket. */
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    grandTotal: number;
    /** True when a free-shipping entitlement applies to the supplied email. */
    shippingWaived: boolean;
    settlementCurrency: string | null;
    settlementAmount: number | null;
}

export interface CheckoutResponse {
    orderNumber: string;
    reference: string;
    authorizationUrl: string;
    /** Currency the order is priced and displayed in. */
    currency: string;
    subtotal: number;
    /** Zero when no discount code was sent, or it didn't match anything in the basket. */
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    grandTotal: number;
    /** What the buyer is actually charged, when the provider cannot settle `currency`. */
    settlementCurrency: string;
    settlementAmount: number;
    exchangeRate: number;
    /** True when a free-shipping campaign entitlement was applied. */
    shippingWaived: boolean;
}

export type OrderStatus = "PLACED" | "PROCESSING" | "FULFILLING" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export type PaymentStatus =
    | "PENDING" | "PROCESSING" | "AUTHORIZED" | "COMPLETED" | "FAILED"
    | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "DISPUTED" | "RECONCILIATION_NEEDED";

export interface OrderStatusItem {
    sku: string;
    name: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface OrderStatusResponse {
    orderNumber: string;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    paid: boolean;
    customerEmail: string | null;
    currency: string;
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    grandTotal: number;
    settlementCurrency: string | null;
    settlementAmount: number | null;
    placedAt: string | null;
    items: OrderStatusItem[];
}

/** One chosen variant in the basket. Prices here are for display only; the server prices the order. */
export interface BasketLine {
    sku: string;
    /** The product's web address, so the line can be priced again when the currency changes. */
    productSlug?: string;
    quantity: number;
    productName: string;
    colourway: string;
    size: string;
    /** Only set on a product sold by the piece, like Xorla (Set/Top/Long Skirt/Short Skirt). */
    piece?: string;
    unitPrice: number;
    currency: string;
    image: string;
    /** Set when this line was added under a discount link; the server re-applies it at
     *  checkout rather than trusting unitPrice, but carrying it lets the basket show the
     *  discount is active and a "was" price next to it. */
    discountCode?: string;
    /** The pre-discount unit price, only set alongside discountCode. */
    listUnitPrice?: number;
}

// ---------- shop grid and batch prices ----------

export interface GridColourway {
    name: string;
    hero: string | null;
    swatch: string | null;
}

/** One live product as a card. `currency` is the one the price is in; read it from here, never assume the one asked for. */
export interface GridItem {
    id: string;
    slug: string;
    name: string;
    primaryImage: string | null;
    currency: string;
    nativeCurrency: string;
    price: number | null;
    compareAtPrice: number | null;
    converted: boolean;
    exchangeRate: number | null;
    prices: { label: string; price: number }[];
    colourways: GridColourway[];
    sizes: string[];
    availableCurrencies: string[];
    /** The collections the product is in, in display order. */
    categories: { code: string; name: string; slug: string }[];
    /** Plain labels with their original capitalisation ("New"); compare case-insensitively. */
    tags: string[];
    /** False when the asked-for currency can't be used: the card is then in the product's own currency. */
    priced: boolean;
}

export interface GridResponse {
    page: number;
    size: number;
    total: number;
    items: GridItem[];
}

export interface PriceRequest {
    currency: string;
    slugs?: string[];
    ids?: string[];
    skus?: string[];
}

export interface VariantPrice {
    sku: string;
    currency: string;
    price: number | null;
    converted: boolean;
    /** False for an unknown or no-longer-sold SKU, or a currency that can't be used. */
    priced: boolean;
}

export interface PricesResponse {
    products: Pick<GridItem, "id" | "slug" | "currency" | "nativeCurrency" | "price" | "prices" | "converted" | "priced">[];
    /** One per SKU asked for, in the order sent. */
    variants: VariantPrice[];
}

export interface StorefrontCollection {
    code: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    icon: string | null;
    sortOrder: number;
    /** Live products in it; a collection with none is not returned at all. */
    productCount: number;
}
