// Seeds the OMETSEY tenant in project-x from src/data/catalog.ts: collections, then products as drafts.
//
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node --experimental-strip-types --no-warnings scripts/seed-backend.mjs [--apply] [--limit N]
//
// Without --apply it only prints what it would do. Safe to re-run: existing collections and
// product codes are skipped. Nothing is made live; products stay drafts until switched on in the admin.
// Env: API_BASE_URL (default http://localhost:8083), TENANT_ID (default ometsey).

import { BASE_PRODUCTS, COLLECTION_TITLES, SIZES } from "../src/data/catalog.ts";

const API = process.env.API_BASE_URL ?? "http://localhost:8083";
const TENANT = process.env.TENANT_ID ?? "ometsey";
const apply = process.argv.includes("--apply");
const limitAt = process.argv.indexOf("--limit");
const limit = limitAt > -1 ? Number(process.argv[limitAt + 1]) : Infinity;

let token = "";

async function call(method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Tenant-Id": TENANT,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error page */ }
    if (!res.ok) {
        const err = new Error(`${method} ${path} -> ${res.status} ${json?.error?.code ?? ""} ${json?.error?.message ?? text.slice(0, 120)}`);
        err.code = json?.error?.code;
        throw err;
    }
    return json?.data ?? json;
}

async function login() {
    const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
    if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
    token = (await call("POST", "/api/v1/auth/login", { email, password })).accessToken;
}

const page = (r) => (Array.isArray(r) ? r : r?.content ?? []);

// "all" is the shop itself and "new-in" is the New tag, so neither is a collection.
const COLLECTIONS = Object.entries(COLLECTION_TITLES).filter(([slug]) => slug !== "all" && slug !== "new-in");
const productCode = (handle) => handle.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 50);

const products = BASE_PRODUCTS.slice(0, limit);
console.log(`${apply ? "APPLY" : "DRY RUN"} -> ${API} as tenant "${TENANT}": ${COLLECTIONS.length} collections, ${products.length} products x ${SIZES.length} sizes, all drafts.`);
if (!apply) {
    for (const p of products) console.log(`  ${productCode(p.handle)}  ${p.title}  GHS ${p.price}  [${p.collections.join(", ")}]`);
    process.exit(0);
}

await login();

// Collections are catalog categories underneath.
const existingCats = page(await call("GET", "/api/v1/catalog/categories?size=200"));
const catId = new Map(existingCats.map((c) => [c.slug, c.id]));
let order = 0;
for (const [slug, name] of COLLECTIONS) {
    order++;
    if (catId.has(slug)) continue;
    const made = await call("POST", "/api/v1/catalog/categories", {
        code: slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), name, slug, sortOrder: order, active: true,
    });
    catId.set(slug, made.id);
    console.log(`collection created: ${name}`);
}

const have = new Set((await call("GET", "/api/v1/admin/storefront/products?includeHidden=true")).map((p) => p.code));
let created = 0, skipped = 0;
for (const p of products) {
    const code = productCode(p.handle);
    if (have.has(code)) { skipped++; continue; }
    const made = await call("POST", "/api/v1/admin/storefront/products", {
        code, name: p.title, slug: p.handle, brand: "Ometsey",
        shortDescription: p.description, description: p.description,
        primaryImageId: p.images[0],
        currency: "GHS", price: p.price, visible: false,
        variants: SIZES.map((size) => ({
            sku: `${code}-${size}`.slice(0, 60), name: `${p.title}, ${size}`,
            optionValues: { size }, price: p.price,
        })),
    });
    // Images, tags and collections are set through the catalog edit, which leaves status and price alone.
    await call("PUT", `/api/v1/catalog/products/${made.id}`, {
        primaryImageId: p.images[0],
        imageIds: [...new Set(p.images)],
        tags: p.tags.includes("new-in") ? ["New"] : [],
        categoryIds: [...new Set([p.category, ...p.collections])].map((c) => catId.get(c)).filter(Boolean),
    });
    created++;
    console.log(`product created (draft): ${p.title}`);
}
console.log(`done: ${created} created, ${skipped} already present.`);
