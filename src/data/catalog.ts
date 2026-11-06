/**
 * The shape of the site, in one place. Header, homepage, footer and collection pages all read
 * from here; swap these arrays for backend calls when the API is wired in.
 * Menu, footer and product names mirror what ometsey.com carries today.
 */

export interface NavLink { label: string; to: string }
export interface NavItem {
    label: string;
    to: string;
    /** Dropdown links shown under the item in the menu drawer. */
    links?: NavLink[];
}

export const PROMO = { text: "Worldwide Shipping", to: "/collections/all" };

export const NAV: NavItem[] = [
    { label: "Home", to: "/" },
    { label: "Shop", to: "/collections/all" },
    { label: "New In", to: "/collections/new-in" },
    {
        label: "Collections", to: "/collections/all",
        links: [
            { label: "Refined Basics", to: "/collections/refined-basics" },
            { label: "2024 Capsule Collection", to: "/collections/capsule-collection" },
            { label: "SiSo – 2023 Holiday Edit", to: "/collections/siso" },
            { label: "2023 Capsule Collection", to: "/collections/2023-capsule-collection" },
            { label: "Modern Retro II", to: "/collections/modern-retro-2" },
        ],
    },
    { label: "Gift Card", to: "/pages/gift-card" },
    {
        label: "About", to: "/pages/about-us",
        links: [
            { label: "About Us", to: "/pages/about-us" },
            { label: "Book An Appointment", to: "/pages/book-an-appointment" },
            { label: "FAQs", to: "/pages/faq" },
            { label: "Store Location", to: "/pages/store-location" },
        ],
    },
    {
        label: "Bespoke", to: "/pages/gallery",
        links: [
            { label: "Gallery", to: "/pages/gallery" },
            { label: "Contact Us", to: "/pages/contact-us" },
        ],
    },
];

/** Utility links the live header carries beside the cart. */
export const ACCOUNT_LINKS: NavLink[] = [
    { label: "Order Tracking", to: "/pages/order-tracking" },
    { label: "Sign In", to: "/pages/my-account" },
    { label: "Wishlist", to: "/pages/wishlist" },
];

export const CATEGORIES: NavLink[] = [
    { label: "Dresses", to: "/collections/dress" },
    { label: "Long Dresses", to: "/collections/long-dress" },
    { label: "Corset Dresses", to: "/collections/corset-dress" },
    { label: "Mini Dresses", to: "/collections/mini-dress" },
    { label: "Maxi Dresses", to: "/collections/maxi-dress" },
    { label: "Skirts", to: "/collections/skirts" },
    { label: "Two Piece", to: "/collections/two-piece" },
    { label: "Sets", to: "/collections/sets" },
    { label: "Pants", to: "/collections/pants" },
    { label: "Accessories", to: "/collections/accessories" },
];

export const FOOTER_GROUPS: { heading: string; links: NavLink[] }[] = [
    { heading: "About Ometsey", links: [
        { label: "About Us", to: "/pages/about-us" },
        { label: "The Bespoke Process", to: "/pages/gallery" },
        { label: "Book An Appointment", to: "/pages/book-an-appointment" },
        { label: "FAQs", to: "/pages/faq" },
        { label: "Blog", to: "/pages/blog" },
        { label: "Contact Us", to: "/pages/contact-us" },
    ] },
    { heading: "Shopping", links: [
        { label: "Shop Now", to: "/collections/all" },
        { label: "New In", to: "/collections/new-in" },
        { label: "2024 Capsule Collection", to: "/collections/capsule-collection" },
        { label: "SiSo 2023 Holiday Edit", to: "/collections/siso" },
        { label: "2023 Capsule Collection", to: "/collections/2023-capsule-collection" },
        { label: "Track Your Order", to: "/pages/order-tracking" },
    ] },
];

export const STORE = {
    phone: "+233 54 382 1846",
    address: "Commandos, Adenta, Adenta Municipality, Accra, Ghana",
    email: "sales@ometsey.com",
};

export interface Product {
    handle: string;
    title: string;
    /** Price in Ghana cedis, as listed on ometsey.com. */
    price: number;
    /** WooCommerce product-category slug. */
    category: string;
    tags: string[];
    /** Named collections it belongs to, per the filter on ometsey.com/shop. */
    collections: string[];
    /** Front shot first, then the hover shot, as served from public/images/products. */
    images: string[];
    description: string;
}

/** Most photos are .jpg; the exceptions are listed here. */
const EXT: Record<string, { front: string; hover: string }> = {
    "sena-mini": { front: "png", hover: "png" },
    "sage-seyi-set": { front: "png", hover: "png" },
    "baaba-nude": { front: "png", hover: "jpeg" },
};
const imagesFor = (handle: string) => {
    const e = EXT[handle] ?? { front: "jpg", hover: "jpg" };
    return [`/images/products/${handle}-front.${e.front}`, `/images/products/${handle}-hover.${e.hover}`];
};
const blurb = "Made to order in Accra. Full details, fabric and care notes to come.";

const RAW_PRODUCTS: Omit<Product, "images" | "collections">[] = [
    { handle: "sena-mini", title: "Sena-Mini", price: 1500, category: "refined-basics-ii", tags: ["new-in", "two-piece"], description: blurb },
    { handle: "anna-trouser-set", title: "Anna Trouser Set", price: 1450, category: "refined-basics-ii", tags: ["new-in", "two-piece"], description: blurb },
    { handle: "araba-beige", title: "Araba-Beige", price: 1850, category: "refined-basics-ii", tags: ["new-in", "two-piece"], description: blurb },
    { handle: "shannon", title: "Shannon", price: 1350, category: "dress", tags: ["new-in"], description: blurb },
    { handle: "june-set-black", title: "June Set-Black", price: 1700, category: "corset-dress", tags: ["two-piece"], description: blurb },
    { handle: "june-set-denim-blue", title: "June Set-Denim Blue", price: 1700, category: "corset-dress", tags: [], description: blurb },
    { handle: "june-set", title: "June Set-Burgundy", price: 1700, category: "corset-dress", tags: [], description: blurb },
    { handle: "enyo-pant", title: "Enyo Pant", price: 1200, category: "pants", tags: [], description: blurb },
    { handle: "aba-shorts-set", title: "Aba Shorts Set", price: 1300, category: "refined-basics", tags: ["two-piece"], description: blurb },
    { handle: "aba-trouser-set", title: "Aba Trouser Set", price: 1500, category: "refined-basics", tags: ["two-piece"], description: blurb },
    { handle: "red-afriyie", title: "Afriyie", price: 1500, category: "dress", tags: [], description: blurb },
    { handle: "amal-short-set", title: "Amal Short Set", price: 650, category: "sets", tags: [], description: blurb },
    { handle: "baaba-nude", title: "Baaba-Tan", price: 2000, category: "long-dress", tags: [], description: blurb },
    { handle: "ohemaa-burnt-orange", title: "Ohemaa-Burnt Orange", price: 1750, category: "sets", tags: ["two-piece"], description: blurb },
    { handle: "ohemaa-olive", title: "Ohemaa-Olive", price: 1750, category: "sets", tags: ["two-piece"], description: blurb },
    { handle: "ivy-pant-set", title: "Ivy Pant Set", price: 1750, category: "refined-basics", tags: ["sets"], description: blurb },
    { handle: "sage-seyi-set", title: "Seyi-Sage", price: 1200, category: "sets", tags: [], description: blurb },
    { handle: "olive-shika-shorts-set", title: "Shika Shorts Set", price: 1000, category: "sets", tags: [], description: blurb },
    { handle: "anna", title: "Anna", price: 1200, category: "refined-basics", tags: [], description: blurb },
    { handle: "dede", title: "Dede", price: 1000, category: "refined-basics", tags: [], description: blurb },
    { handle: "ivy-top", title: "Ivy Top", price: 750, category: "refined-basics", tags: [], description: blurb },
    { handle: "mirekua-black", title: "Mirekua-Black", price: 1750, category: "dress", tags: [], description: blurb },
    { handle: "mirekua-olive", title: "Mirekua-Olive", price: 1750, category: "dress", tags: [], description: blurb },
    { handle: "ohemaa-mustard", title: "Ohemaa-Mustard", price: 1750, category: "two-piece", tags: ["two-piece"], description: blurb },
    { handle: "otubea-neutral", title: "Otubea-Neutral", price: 1300, category: "dress", tags: [], description: blurb },
    { handle: "rena-beige", title: "Rena-Beige", price: 1000, category: "mini-dress", tags: [], description: blurb },
    { handle: "rena-black", title: "Rena-Black", price: 1000, category: "dress", tags: [], description: blurb },
    { handle: "riwah", title: "Riwah", price: 1450, category: "dress", tags: [], description: blurb },
    { handle: "riwah-black", title: "Riwah-Black", price: 1450, category: "maxi-dress", tags: [], description: blurb },
    { handle: "ivy-sage", title: "Ivy-Sage", price: 1200, category: "dress", tags: [], description: blurb },
    { handle: "ivy-black", title: "Ivy-Black", price: 1200, category: "dress", tags: [], description: blurb },
    { handle: "zeina-set-marble-print", title: "Zeina – Marble Print", price: 1200, category: "two-piece", tags: ["two-piece"], description: blurb },
    { handle: "luna-corset-skirt", title: "Luna Corset Skirt", price: 1000, category: "skirts", tags: [], description: blurb },
    { handle: "amal-trouser-set", title: "Amal Trouser Set", price: 800, category: "sets", tags: [], description: blurb },
    { handle: "solace-dress", title: "Solace", price: 1000, category: "dress", tags: [], description: blurb },
    { handle: "zayda-dress", title: "Zayda", price: 1200, category: "dress", tags: [], description: blurb },
];

const COLLECTION_MEMBERS: Record<string, string[]> = {
    "aba-shorts-set": ["refined-basics"],
    "aba-trouser-set": ["refined-basics"],
    "anna": ["refined-basics"],
    "dede": ["refined-basics"],
    "ivy-pant-set": ["refined-basics"],
    "ivy-top": ["refined-basics"],
    "mirekua-black": ["refined-basics"],
    "mirekua-olive": ["refined-basics"],
    "ohemaa-mustard": ["refined-basics"],
    "otubea-neutral": ["refined-basics"],
    "rena-beige": ["refined-basics"],
    "rena-black": ["refined-basics"],
    "riwah": ["refined-basics"],
    "riwah-black": ["refined-basics"],
    "ivy-sage": ["capsule-collection"],
    "ivy-black": ["capsule-collection"],
    "zeina-set-marble-print": ["capsule-collection"],
    "red-afriyie": ["siso"],
    "luna-corset-skirt": ["siso"],
    "olive-shika-shorts-set": ["siso"],
    "amal-short-set": ["2023-capsule-collection"],
    "amal-trouser-set": ["2023-capsule-collection"],
    "solace-dress": ["2023-capsule-collection"],
    "zayda-dress": ["modern-retro-2"],
    "sena-mini": ["refined-basics-ii"],
    "anna-trouser-set": ["refined-basics-ii"],
    "araba-beige": ["refined-basics-ii"],
    "shannon": ["refined-basics-ii"],
};

export const PRODUCTS: Product[] = RAW_PRODUCTS.map((p) => ({
    ...p,
    collections: COLLECTION_MEMBERS[p.handle] ?? [],
    images: imagesFor(p.handle),
}));

export const COLLECTION_TITLES: Record<string, string> = {
    all: "Shop", "new-in": "New In",
    "refined-basics": "Refined Basics", "capsule-collection": "2024 Capsule Collection",
    siso: "SiSo – 2023 Holiday Edit", "2023-capsule-collection": "2023 Capsule Collection",
    "modern-retro-2": "Modern Retro II", "refined-basics-ii": "Refined Basics II",
    skirts: "Skirts", "mini-dress": "Mini Dresses", "maxi-dress": "Maxi Dresses",
    dress: "Dresses", "long-dress": "Long Dresses", "corset-dress": "Corset Dresses",
    "two-piece": "Two Piece", sets: "Sets", pants: "Pants", accessories: "Accessories",
};

export function productsFor(handle: string): Product[] {
    if (handle === "all") return PRODUCTS;
    return PRODUCTS.filter((p) => p.collections.includes(handle) || p.category === handle || p.tags.includes(handle));
}

/** Ometsey prices in Ghana cedis. */
export const money = (n: number) => `₵ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

/** Homepage imagery, all from ometsey.com. */
export const HERO_SLIDES = [
    "/images/hero/slide-1.jpeg",
    "/images/hero/slide-2.jpeg",
    "/images/hero/slide-3.jpeg",
];

export const COLLECTION_TILES = [
    { title: "SiSo – 2023 Holiday Edit", to: "/collections/siso", image: "/images/collections/IMG_0080-scaled.jpg" },
    { title: "Modern Retro II", to: "/collections/modern-retro-2", image: "/images/collections/0F7A5210-scaled.jpg" },
    { title: "2023 Capsule Collection", to: "/collections/2023-capsule-collection", image: "/images/collections/IMG_9777-scaled.jpg" },
];

export const BEST_SELLERS = [
    { title: "Ivy Dress", to: "/products/ivy-pant-set", image: "/images/collections/ometsey19-scaled.jpg" },
    { title: "Shika Set", to: "/products/olive-shika-shorts-set", image: "/images/collections/0F0A9941-scaled.jpg" },
    { title: "Henewa Dress", to: "/collections/all", image: "/images/collections/henewa-front-view.png" },
];

/** Filter facets for collection pages. Colour is only set where the photo makes it unambiguous. */
export const SIZES = ["XS", "S", "M", "L", "XL"];

export const COLOR_SWATCH: Record<string, string> = {
    Beige: "#d9c7a8", Black: "#111", Blue: "#4d79b8", Burgundy: "#6e1f2e", Olive: "#6b6a35",
    Mustard: "#c9a227", Orange: "#bf5a1f", Red: "#a3281e", Sage: "#8da08a", Tan: "#b99672",
};

const COLOR_OF: Record<string, string> = {
    "sena-mini": "Olive", "anna-trouser-set": "Olive", "araba-beige": "Beige", shannon: "Blue",
    "june-set-black": "Black", "june-set-denim-blue": "Blue", "june-set": "Burgundy", "red-afriyie": "Red",
    "baaba-nude": "Tan", "ohemaa-burnt-orange": "Orange", "ohemaa-olive": "Olive",
    "sage-seyi-set": "Sage", "olive-shika-shorts-set": "Olive",
    "mirekua-black": "Black", "mirekua-olive": "Olive", "rena-black": "Black", "riwah-black": "Black", "ivy-black": "Black",
    "rena-beige": "Beige", "ivy-sage": "Sage", "ohemaa-mustard": "Mustard",
};
export const colorOf = (handle: string): string | undefined => COLOR_OF[handle];
