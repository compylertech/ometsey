// Uploads each seeded product's photos to the backend and points the product at the uploaded copies.
//
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node --experimental-strip-types --no-warnings scripts/seed-images.mjs [--apply] [--limit N]
//
// Run scripts/seed-backend.mjs first. Without --apply it only lists what it would upload. The
// backend de-duplicates identical files, so re-running does not create copies. Products whose
// images are already uploads (not /images/... paths) are skipped.
// Env: API_BASE_URL (default http://localhost:8083), TENANT_ID (default ometsey).

import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { BASE_PRODUCTS } from "../src/data/catalog.ts";

const API = process.env.API_BASE_URL ?? "http://localhost:8083";
const TENANT = process.env.TENANT_ID ?? "ometsey";
const apply = process.argv.includes("--apply");
const limitAt = process.argv.indexOf("--limit");
const limit = limitAt > -1 ? Number(process.argv[limitAt + 1]) : Infinity;
const PUBLIC = resolve(import.meta.dirname, "../public");

let token = "";
const headers = () => ({ Accept: "application/json", "X-Tenant-Id": TENANT, ...(token ? { Authorization: `Bearer ${token}` } : {}) });

async function json(method, path, body) {
    const res = await fetch(`${API}${path}`, { method, headers: { ...headers(), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const out = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${out?.error?.message ?? ""}`);
    return out?.data ?? out;
}

async function upload(file) {
    const form = new FormData();
    const type = file.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    form.append("file", new Blob([await readFile(resolve(PUBLIC, file.replace(/^\//, "")))], { type }), basename(file));
    const res = await fetch(`${API}/api/v1/admin/storefront/products/images`, { method: "POST", headers: headers(), body: form });
    const out = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`upload ${file} -> ${res.status} ${out?.error?.message ?? ""}`);
    return out.data.imageId;
}

const products = BASE_PRODUCTS.slice(0, limit);
const files = [...new Set(products.flatMap((p) => p.images))];
console.log(`${apply ? "APPLY" : "DRY RUN"} -> ${API} as "${TENANT}": ${files.length} images across ${products.length} products.`);
if (!apply) process.exit(0);

token = (await json("POST", "/api/v1/auth/login", { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).accessToken;

const list = await json("GET", "/api/v1/admin/storefront/products?includeHidden=true");
const byCode = new Map(list.map((p) => [p.code, p]));
const ids = new Map();
let done = 0;
for (const p of products) {
    const code = p.handle.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 50);
    const row = byCode.get(code);
    if (!row) { console.log(`skip (not seeded): ${p.title}`); continue; }
    const detail = await json("GET", `/api/v1/catalog/products/${row.id}`);
    if (detail.primaryImageId && !detail.primaryImageId.startsWith("/")) { console.log(`skip (has uploads): ${p.title}`); continue; }
    const uploaded = [];
    for (const f of [...new Set(p.images)]) {
        if (!ids.has(f)) ids.set(f, await upload(f));
        uploaded.push(ids.get(f));
    }
    await json("PUT", `/api/v1/catalog/products/${row.id}`, { primaryImageId: uploaded[0], imageIds: uploaded });
    done++;
    console.log(`images set: ${p.title} (${uploaded.length})`);
}
console.log(`done: ${done} products updated, ${ids.size} files uploaded.`);
