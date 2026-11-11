# Building the admin portal: a handoff plan

This documents how the Ometsey `/admin` portal was built, in enough detail for another agent to build the
same thing in a different project. The reference implementation is this repo
(`github.com/compylertech/ometsey`, admin introduced in commit `a038f78`). Read the code for exact
behaviour; read this for the reasoning, the order of work, the contracts, and the traps.

Treat it as a pattern, not a template to copy blindly. Section 16 lists what to change per project.

---

## 0. Kickoff brief (paste this to the receiving agent)

> Build a minimalist admin portal at `/admin` inside an existing React + Vite + Tailwind storefront.
> Screens: Overview (sales dashboard), Orders, Products (full add/edit/hide/remove), Customers, Emails
> (automations, templates, composer), Discounts (shareable discount links), Settings. It must be
> local-first (browser storage) behind a single data-layer file so a real backend can replace it later,
> gated by a client-side passcode, themeable (black-and-white default plus one brand theme), with a
> collapsible sidebar, and with square-cornered, thin-bordered styling that matches the storefront. Every
> list needs filters, sortable columns and pagination. Follow `docs/admin-build-plan.md` phase by phase and
> verify each phase in a real browser before moving on.

---

## 1. Scope

### Built
| Area | Capabilities |
|---|---|
| Shell | Gate, sidebar (collapsible), themes, responsive top bar on mobile, `noindex` |
| Overview | KPI cards with change vs previous period, revenue chart (hover tooltip, table view), orders-by-status bar, top products, recent orders, empty state with sample data |
| Orders | Status tabs, search + filters, sortable columns, pagination, detail drawer, status actions, manual order entry |
| Products | Add / edit / hide / remove / restore, filters, sortable columns, pagination, image upload |
| Customers | Derived from orders, sortable, paginated, "Email" shortcut |
| Emails | Automations (event to template), template editor with merge tags and live preview, composer, send queue |
| Discounts | Code generator, percentage or fixed amount, scope, expiry, copyable links, pause/delete |
| Settings | Theme, exchange rate, data location, sample data, export JSON, reset |

### Deliberately not built (say so to the user rather than faking them)
- **No backend.** All data lives in `localStorage`. Nothing is shared between browsers or devices.
- **No automatic email sending.** Automations draft and queue; sending opens the user's mail client
  (`mailto:`, plain text only). Real sending needs a server-side email service.
- **No discount redemption.** Links are generated and tracked; the storefront cannot honour them without
  a server to validate codes (a URL-embedded value is forgeable).
- **No real authentication.** The passcode ships in the client bundle; it only keeps casual visitors out.
- **No stock, size, or variant editing**, no order refunds, no roles, no audit log.

Be explicit about these in the UI copy and in your final report. The reference does (banners, Settings text).

---

## 2. Stack and constraints

- Vite 6, React 19, TypeScript strict (`noUnusedLocals`, `noUnusedParameters` on: unused code fails the
  build, which is useful), Tailwind CSS 4 via `@tailwindcss/vite`, `react-router-dom` 7, `zustand` 5 with
  `persist`. **No other runtime dependencies.** Icons are inline SVG; the chart is hand-rolled SVG.
- Font: Montserrat (storefront's), loaded in `index.html`.
- Path alias `@/` to `src/`.
- **Node 22 is required** for Vite. On the reference machine the shell defaults to Node 16, which fails with
  `does not provide an export named 'constants'`. Always `source ~/.nvm/nvm.sh && nvm use 22` first.
- Dev server env override for testing the gate: a shell variable beats `.env.local`, so
  `VITE_ADMIN_PASSCODE= npx vite --port 5199 --strictPort` runs an open admin without touching the real
  passcode file. Never read or commit `.env.local`.

---

## 3. Architecture principles

1. **One data layer.** Every read and write goes through `src/admin/store.ts` (zustand + persist) and, for
   products, `src/store/catalog.ts`. Pages never touch `localStorage` directly. Replacing these two files
   with API clients is the whole backend migration (section 15).
2. **Admin is isolated.** It mounts at `/admin/*`, renders its own shell, and the storefront header, footer
   and cart drawer are not rendered there. In `App.tsx` an early return handles `pathname.startsWith("/admin")`.
3. **Admin edits flow to the storefront** through the shared catalog store, so the user sees products they
   add, edit, hide or remove on the real storefront.
4. **Theming through CSS variables**, not component props. All admin colours are `var(--a-*)`.
5. **Shared UI kit + shared hooks** so every page behaves identically (sort, filter, paginate).
6. **Honesty about limits**, in the UI itself.

---

## 4. File layout

```
src/
  admin/
    AdminApp.tsx        gate, shell (sidebar), theme wrapper, nested routes
    ui.tsx              design tokens (class strings), Card, Stat, Tabs, Drawer, badges, SortTh,
                        FilterField, Pagination, Notice, Empty, Icons
    hooks.ts            useSort, usePaged
    store.ts            orders, discounts, templates, automations, queue; actions; automation firing
    types.ts            Order, OrderItem, DiscountLink, EmailTemplate, Automation, QueuedEmail, NewOrder
    defaults.ts         starter templates + default automations + trigger labels
    email.ts            merge tags, fill(), toHtml(), mailtoLink(), order totals
    seed.ts             deterministic sample orders/discounts (flagged `sample`)
    theme.ts            theme store + sidebar-collapsed store
    pages/ Overview.tsx Orders.tsx Products.tsx Customers.tsx Emails.tsx Discounts.tsx Settings.tsx
  store/catalog.ts      product overlay (added / edited / removed) + useProducts()
  store/market.ts       currency + exchange rate store, useMoney()
  lib/money.ts geo.ts   price formatting/conversion, country detection
  index.css             Tailwind import, @theme tokens, .admin theme variables
```

`App.tsx` additions: `import { AdminApp }` and the early-return route. `index.css` additions: the
`.admin` and `.admin[data-admin-theme="brand"]` variable blocks.

---

## 5. Build order (do these phases in order; verify each in a browser)

| Phase | Deliverable | Verify before moving on |
|---|---|---|
| 1 | Types, `store.ts` skeleton, `ui.tsx` kit, `hooks.ts` | `tsc -b` clean |
| 2 | `AdminApp` shell: gate, sidebar, nested routes, empty pages | `/admin` loads; passcode flow; mobile top bar |
| 3 | Theme variables + theme store | Both themes render; choice persists |
| 4 | Catalog overlay store, convert storefront to `useProducts()` | Storefront unchanged with empty overlay |
| 5 | Orders (list, drawer, actions, new-order form) + seed | Create order, pay it, ship it |
| 6 | Emails: templates, `fire()` automations, pipeline, composer | Each order action queues the right email |
| 7 | Overview dashboard + chart | Numbers reconcile with Orders |
| 8 | Products CRUD + image upload | Edits appear on the storefront |
| 9 | Discounts, Customers, Settings | Create/duplicate/validate a code |
| 10 | Filters, sorting, pagination everywhere (shared hooks) | Reset-to-page-1 on filter change |
| 11 | Polish: boxy styling, status colours, collapse, mobile | Screenshot every page in both themes |
| 12 | End-to-end browser test script | All checks pass, console clean |

Build the data layer and one vertical slice (Orders) first, then fan out. Do not start with visuals.

---

## 6. Data model

```ts
type OrderStatus = "AWAITING_PAYMENT" | "AWAITING_FULFILMENT" | "COMPLETED" | "CANCELLED";
type OrderSource = "website" | "whatsapp" | "in-store" | "bespoke";

interface OrderItem { handle: string; title: string; size: string; qty: number; price: number } // price = unit, at time of order
interface Order {
  id: string; number: string;              // number: "OM-1001", sequential
  placedAt: string;                         // ISO
  status: OrderStatus; source: OrderSource;
  customer: { name: string; email: string; phone: string };
  shipTo: string; items: OrderItem[];
  shipping: number; discount: number;       // discount = amount off the item subtotal
  discountCode?: string; notes?: string;
  paidAt?: string; trackingNumber?: string;
  sample?: boolean;                         // demo records, removable without touching real ones
}
type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
interface DiscountLink { id; code; type; value; scope: string /* product handle or "ALL" */; note; active; createdAt; expiresAt?; sample? }
interface EmailTemplate { id; name; subject; body }                // body = plain text with {{tags}}
type AutomationTrigger = "ORDER_PLACED" | "ORDER_PAID" | "ORDER_SHIPPED";
interface Automation { id; trigger; templateId; enabled }
type EmailStatus = "QUEUED" | "DRAFTED" | "SENT";
interface QueuedEmail { id; templateId; to; name; subject; body /* already rendered */; reason; status; createdAt; sample? }
```

Money rules: store amounts as plain numbers in the **base currency**. `orderSubtotal = Σ price × qty`;
`orderTotal = max(0, subtotal − discount) + shipping`.

Why `sample: true` instead of a separate demo mode: the dashboard is empty without data, the client wants to
see it populated, and the demo records must be removable with one click without risking real orders.

---

## 7. State layer (`store.ts`)

zustand store wrapped in `persist({ name: "ometsey-admin" })`. Actions (all pure state transitions):

`addOrder, markPaid, markShipped, cancelOrder, addDiscount, toggleDiscount, removeDiscount, saveTemplate,
removeTemplate, setAutomation, enqueue, setEmailStatus, removeEmail, loadSample, clearSample, resetAll`.

### Order state machine
```
addOrder(paid=false) -> AWAITING_PAYMENT
addOrder(paid=true)  -> AWAITING_FULFILMENT (paidAt = now)
markPaid:    only from AWAITING_PAYMENT     -> AWAITING_FULFILMENT, paidAt = now
markShipped: only from AWAITING_FULFILMENT  -> COMPLETED, trackingNumber set
cancelOrder: from AWAITING_PAYMENT or AWAITING_FULFILMENT -> CANCELLED
```
Guard each transition by current status (no-op otherwise). Order numbers: `OM-` + (max existing numeric
part, or 1000) + 1.

### Automations: `fire(state, trigger, order)`
For each enabled automation with that trigger: find its template, skip if missing or the order has no
customer email, render subject and body with `mergeVars(order)`, and return `QueuedEmail`s with
`status: "QUEUED"` and `reason: "OM-1037 · paid"`. Triggers fire from: `addOrder` (PLACED, and PAID if created
paid), `markPaid` (PAID), `markShipped` (SHIPPED). Deleting a template disables automations pointing at it.

### Sample data
`seed.ts`: a seeded PRNG (mulberry32, seed 2026) generates 36 orders across 60 days drawn from the base
catalog, with a realistic status mix by age (recent orders more likely unpaid; older ones completed), some
discounts, plus 2 discount links. All flagged `sample`. `loadSample` is idempotent; `clearSample` removes
sample orders, discounts and queued emails. The seeded RNG makes screenshots and tests reproducible. Ensure at
least one recent order is `AWAITING_PAYMENT` (an early version generated none, which broke a test).

### Catalog overlay (`src/store/catalog.ts`), the key trick for product editing
The storefront's products live in code (`BASE_PRODUCTS`). The admin must edit them without a backend. Store
only the **changes**:
```ts
interface Overlay { added: Product[]; edited: Record<handle, Partial<Product>>; removed: string[] }
resolveProducts(o, { includeHidden, includeRemoved }) =
  BASE.filter(not removed unless includeRemoved).map(p => ({...p, ...o.edited[p.handle]})).concat(o.added)
  then drop p.hidden unless includeHidden
```
`useProducts(opts)` memoises that from three separate zustand selectors (never return a fresh object from a
selector: it loops). Storefront calls `useProducts()` (hidden/removed excluded); admin calls
`useProducts({ includeHidden: true, includeRemoved: true })`. Remove on a base product pushes its handle to
`removed` (restorable); remove on an added product deletes it. **Why an overlay and not a full copy:** code
stays the source of truth, so products added to the code catalog later still appear.

Required refactor: every storefront file that imported the product array directly (cart, drawer, header
search, product page, wishlist, gallery, home, collection) switches to the hook, and `productsFor(products,
handle)` takes the list as an argument. Rename the old export to `BASE_PRODUCTS` so the compiler finds every
missed usage.

---

## 8. Shell, gate, routing (`AdminApp.tsx`)

- **Gate** (`PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE`):
  - passcode set: show a passcode card until entered; remember in `sessionStorage` (`…-admin-session = "1"`);
  - not set: **open in dev, disabled in a production build** (safe default).
  - Comment honestly that this is not security.
- **Routes** (nested under `/admin/*`): index = Overview; `orders`, `products`, `customers`, `emails`,
  `discounts`, `settings`; anything else redirects to `/admin`.
- **Document head:** set `document.title = "Ometsey Admin"` (exact casing: the user asked) and append
  `<meta name="robots" content="noindex">`; remove both on unmount.
- **Root wrapper:** `<div className="admin" data-admin-theme={theme}>` wraps **both** the gate and the shell so
  the passcode screen is themed too.
- **Sidebar:** dark column, logo, icon + label nav (`NavLink`, active state highlighted with the theme's
  `--a-side-accent`), footer note about local data, "View storefront" link, **Collapse** button.
  - Expanded 236px, collapsed 72px (icon rail). Grid `md:grid-cols-[236px_1fr]` / `[72px_1fr]` with a width
    transition. Collapsed state: labels hidden (`md:hidden`), tooltips via `title`, monogram only (crop the
    wide logo to its left 36px), toggle shows only the chevron (rotated).
  - Collapse state persists (`…-admin-layout`). Labels hide **only at `md+`**; on mobile the sidebar is a top
    bar with a horizontally scrolling nav and is unaffected by the collapsed flag.
- Main area: `max-w-[1180px]` centred, `px-5 md:px-10`.

---

## 9. Design system

### Style rules (match the host storefront; the user was firm about this)
- **Square corners everywhere. No `rounded-*`. No shadows. No blur. No soft focus glow.** Thin 1px borders
  carry all structure. An early version used rounded cards and pills and the user rejected it: it must look
  like the storefront's size boxes and outlined buttons.
- Focus = a crisp border-colour change only.
- Sentence-case text in the admin (it is a dense tool), small sizes (13px body, 11px uppercase table headers
  with `tracking-wider`, 22px page titles).

### Theme variables (`.admin` = black & white default; `[data-admin-theme="brand"]` overrides)
| Variable | B&W | Brand |
|---|---|---|
| `--a-accent` / `-hover` | `#000` / `#2b2b2b` | `#76410f` / `#5e3309` |
| `--a-bg` | `#f6f6f6` | `#f5f2ea` |
| `--a-surface-alt`, `--a-subtle` | `#fff`, `#fafafa` | `#fbf9f4`, `#faf8f3` |
| `--a-border`, `--a-border-soft` | `#e4e4e4`, `#eee` | `#e8e2d6`, `#efe9dd` |
| `--a-side`, `--a-side-accent` | `#0a0a0a`, `#fff` | `#1b1410`, `#e0a96a` |
| `--a-logo-on-dark` / `-on-light` | `brightness(0) invert(1)` / `brightness(0)` | `none` |
| `--a-warn-bg/-border/-ink` | greys | amber |
| `--a-up`, `--a-down` | `#047857`, `#b91c1c` (both themes) | same |
| `--a-st-pay/-ful/-done/-can` | `#c98a14` `#2f6f9f` `#3f8a5a` `#b91c1c` (**both themes**) | same |

**Status colours are semantic and stay coloured in every theme** (amber awaiting payment, blue awaiting
fulfilment, green completed, **red cancelled**). An early build greyed them out in the B&W theme because "black
and white" was read too literally; the user rejected that. "Black and white" applies to chrome and accents,
not to meaning-bearing colour.

Use Tailwind arbitrary values with variables: `bg-[var(--a-accent)]`, `border-[var(--a-border)]`,
`ring-[var(--a-accent)]/15` (Tailwind 4 turns the `/15` into `color-mix`, which works with variables). The
logo recolours via `style={{ filter: "var(--a-logo-on-dark)" }}`.

### Status pill formula (single value to theme everything)
```ts
const tint = (c) => ({
  background: `color-mix(in srgb, ${c} 10%, white)`,
  color:      `color-mix(in srgb, ${c} 62%, black)`,     // darkened for contrast
  boxShadow:  `inset 0 0 0 1px color-mix(in srgb, ${c} 28%, white)`,
});
```
A square dot in the state colour precedes the label. The same colour variables feed the stacked status bar
and its legend so they cannot disagree.

### Component kit (`ui.tsx`)
Class-string constants: `inputCls`, `btn`, `btnSolid`, `linkBtn`. Components: `PageHead` (title, subtitle,
actions), `Card` (title, action, `flush` for tables), `Stat` (icon chip, value, ▲/▼ % delta, hint), `Notice`
(`info`/`warn`), `Empty`, `Tabs` (generic over id type, underline style, optional count chips), `Drawer`
(right-hand, click-outside closes, ESC not required), `OrderBadge`/`EmailBadge`, `Th`/`Td`, `SortTh`,
`FilterField`, `Pagination`, `Icons`.

---

## 10. Shared hooks

### `useSort(rows, accessors, initial?)`
Click a header: ascending, click again: descending, third click: back to natural order. Compares numbers
numerically and strings with `localeCompare(…, { numeric: true, sensitivity: "base" })`. Keep `accessors` in a
ref so callers can pass a fresh object each render without recomputing. `SortTh` renders a button with ▲/▼
(active) or a faint ↕, plus `aria-sort`.

### `usePaged(rows, resetKey, initialSize = 10)`
Returns the page slice plus `page, pages, size, total, setPage, setSize`. **`resetKey` is a string that
changes whenever filters or sort change; the hook returns to page 1 when it does.** Implement the reset by
comparing against the previous key in a ref:

```ts
const last = useRef(resetKey);
useEffect(() => { if (last.current === resetKey) return; last.current = resetKey; setPage(1); }, [resetKey]);
```
Do **not** implement it as "skip the first run" with a boolean: React StrictMode runs effects twice in dev
and the second run resets a deep-linked page. (This exact bug appeared on the storefront's `?page=2`.)
Callers pass `JSON.stringify([filters…, sort])`. Clamp `page` to `pages` so shrinking results never strands
the user.

### `Pagination`
Hidden when `total <= 10`. Shows "Showing a–b of N", a rows-per-page select (10/25/50), and square numbered
buttons: window = `{1, last, current−1, current, current+1}` with `…` where there are gaps; current page is
solid accent; prev/next disabled at the ends.

### Filter conventions
A row of `FilterField` (small label above each control) above the table: search, selects, date range, min–max
number pair. Show a **Clear filters** link only when something is set. Empty-result state offers the same link.
Filtering happens in a `useMemo` before sorting, sorting before paging.

---

## 11. Page specifications

### Overview
- **Range picker:** 7 / 30 / 90 days (segmented control).
- **Definitions** (state them in code comments; they must reconcile with Orders):
  - *Window* = orders whose `placedAt` falls in the last N days; *previous window* = the N days before.
  - *Revenue* = Σ `orderTotal` of orders in the window that have `paidAt` and are not `CANCELLED`.
  - *Orders* = count placed in the window; *Paid* = those counted for revenue; *AOV* = revenue ÷ paid.
  - Deltas = percent change vs the previous window; `null` (no arrow) when the previous value is 0.
- **KPI cards:** Revenue, Orders, Average order, Active discounts (no delta).
- **Chart** (single series, hand-rolled SVG, `viewBox 720×250`, paddings L52 R14 T14 B28):
  - one brand-coloured 2px line over a 22%→0 gradient fill (`useId` for the gradient id);
  - y max rounded up to a 1/2/5 step (`niceCeil`), 5 gridlines, recessive (`#000` at 7% opacity, baseline 18%);
  - x labels at start/middle/end only; compact y labels (`₵2.5k`);
  - **hover:** nearest-point crosshair, 5px marker with white ring, HTML tooltip (date, revenue, paid-order
    count) clamped to 12–88% of width;
  - **"View as table"** toggle: days with revenue, newest first. (Every chart needs a non-visual equivalent.)
  - Zero days stay as zeros: the line is honest and therefore spiky for sparse data.
- **Orders by status:** segmented bar with 2px gaps + legend with counts + "₵X is waiting on payment".
- **Top products** (paid, in window): name, units, revenue, proportional bar. **Recent orders:** latest 6.
- **Empty state:** when there are no orders, a card with "Go to orders" and "Load sample data". Show a warning
  banner while sample data is present.

### Orders
- **Tabs:** All / Awaiting payment / Awaiting fulfilment / Completed / Cancelled, with counts.
- **Filters:** search (number, name, email), source, payment (paid/unpaid), placed-between (two dates),
  total min–max. Sortable: Order (numeric part), Date, Customer, Source, Status, Total. Paginated.
- **Row click** opens a right drawer: status badge, date and source, customer block, items with line totals,
  subtotal / discount / shipping / total, notes, tracking. **Actions by state:** awaiting payment → "Mark as
  paid"; awaiting fulfilment → tracking input + "Mark shipped" (disabled until a tracking number is typed);
  cancel (confirm) for the two open states; "Email customer" deep-links to Compose with the order preselected.
  A footnote says status changes queue emails.
- **New order form** (drawer): customer name/email/phone, source, ship-to, repeating item rows
  (product, size, qty), shipping, discount code, notes, "Already paid" checkbox, live total.
  - Item row **must be a CSS grid**: `grid-cols-[minmax(0,1fr)_72px_64px_24px]`. (A flex row with `w-20`/`w-16`
    failed because the shared input class set `w-full`; see gotchas.)
  - **Discount application:** match an *active* code, case-insensitively; percentage =
    `round(subtotal × value) / 100`, fixed = `min(value, subtotal)`; show "Applies 10% off" or "No active
    discount with that code".
  - Products come from `useProducts({ includeHidden: true })` so admin can sell hidden items.

### Products
- **Toolbar:** "Add product". **Filters:** search, category, collection, status (Live = Active+Hidden, or
  Active / Hidden / Removed), price min–max. **Sortable:** Product, Category, Price, Sold, Revenue, Status.
  Paginated. "Sold"/"Revenue" come from paid, non-cancelled orders.
- **Row actions:** Edit, Hide/Show, Remove; removed rows show only Restore. Confirm text differs: base
  product ("You can restore it later from the Removed filter") vs added product ("Delete permanently?").
- **Form** (drawer, used for add and edit): name, price, optional US price (placeholder shows the automatic
  conversion), category (`<datalist>` of existing; stored slugified), description, optional colour, collection
  checkboxes, front image, optional hover image, "Show in New In" (adds/removes the `new-in` tag, preserving
  other tags), "Hide from storefront".
  - **Handle:** `slugify(title)`, made unique with `-2`, `-3`…; **fixed after creation** (orders and links
    reference it). Show it read-only when editing.
  - **Validation:** name required, price > 0, front image required. Hover defaults to front.
  - **Image field:** thumbnail, URL/path input, Upload button. Uploads are decoded with `createImageBitmap`,
    scaled to max 1000px, re-encoded to JPEG at q 0.82 and stepped down (to 0.4) until the data URL is under
    ~300k characters, so a few photos do not exhaust `localStorage`. Reject non-images.
- Footnote: changes show on the storefront in this browser only.

### Customers
Derived, never stored: group orders by lower-cased email → name, phone, order count, **spent** (paid,
non-cancelled), last order date. Sortable, paginated, search. "Email" link opens Compose with `to`/`name`
query params.

### Emails (three tabs via `?tab=`)
- **Pipeline:** warning banner stating the sending limitation; **Automations** (checkbox + template select per
  trigger); queue filtered by status tabs; row actions Preview (drawer with iframe), **Open in email**
  (`mailto:` + marks `DRAFTED`), Mark sent, Remove. Status flow `QUEUED → DRAFTED → SENT` is user-driven
  because the app cannot know whether a mail client actually sent anything.
- **Templates:** list + editor (name, subject, body) with a live preview and clickable merge-tag chips that
  append to the body; Save is disabled until dirty; built-ins have "Restore original", custom ones "Delete".
  Six starters: order received, payment received, order shipped, bespoke consultation, discount offer, welcome.
- **Compose:** To/name, template, order, discount-link selects, subject, body, preview. Picking an order fills
  the recipient; picking a template/order/discount refills subject and body. Two actions: "Open in email app"
  (records as DRAFTED) and "Add to pipeline" (QUEUED).
  - **Do not put `name` in the refill effect's dependency list** (typing a name would overwrite the user's
    edited draft). Read it, but leave it out of the deps, with a comment.
- **Merge tags:** `first_name, name, order_number, total, tracking_number, discount_code, discount_link,
  store_phone`. `fill()` replaces `{{ tag }}` and renders unknown/empty tags as empty strings, never as raw
  braces.
- **HTML rendering:** `toHtml(body)`: escape, blank lines → `<p>`, URLs → links, wrap in a small branded
  layout. Preview in `<iframe sandbox="" srcDoc>` so template content can never run script in the admin.
  Customer-facing email HTML keeps the brand colours regardless of admin theme.

### Discounts
- **Form:** code (auto-generated `OM-` + 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, i.e. no 0/O/1/I,
  with a "New" button; `crypto.getRandomValues`), type, value, scope (whole store or one product), optional
  expiry, note.
- **Validation:** `/^[A-Z0-9-]{3,24}$/` after uppercasing; unique; value > 0; percentage ≤ 100.
- **Table:** code (+note, SAMPLE tag), discount, applies-to, expiry, status button (Active / Paused / Expired),
  **Copy link** (falls back to `window.prompt` if the clipboard API is blocked), Delete.
- **Link format:** `${origin}/?discount=CODE` or `${origin}/products/{handle}?discount=CODE`.
- Permanent banner: links cannot be redeemed until a backend validates codes.

### Settings
Appearance (two theme cards with miniature previews, `aria-pressed`), currency (exchange rate, example
conversion, reset), "where this data lives" with counts, sample data load/remove, Export JSON (orders,
discounts, templates, automations, queue, catalog overlay), Reset everything (confirm; also resets the catalog
overlay), store details.

---

## 12. Storefront pieces the admin depends on

- `useProducts()` everywhere (section 7); `Product` gains optional `hidden`, `color`, `prices`.
- **Currency** (admin has a US-price field and an exchange-rate setting):
  - `lib/geo.ts`: `detectCountry()` checks an injected `<meta name="ometsey-country">` first, then the
    `Africa/Accra` time zone, then the browser language region. Real IP geolocation later = inject that meta.
  - `lib/money.ts`: `priceFor(product, currency, rate)`: base currency is the stored price; the other currency
    uses `product.prices.USD` if set, else `round(price / rate)` (min 1). `formatMoney`.
  - `store/market.ts`: persisted `{ chosen: Currency | null, rate }`; `useMoney()` returns the active currency,
    `fmt`, `fmtProduct`, `priceOf`.
  - **Selector has exactly two options** (the two currencies). An earlier "Automatic" option was removed at the
    user's request because it was confusing; detection just picks the starting value.
  - The admin itself always works in the base currency.

---

## 13. Verification: drive a real browser, do not eyeball it

Use `puppeteer-core` (install in a scratch folder, not the project) with the system Chrome
(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, `headless: "new"`). Run the app with the
passcode override from section 2.

Helpers worth writing once:
```js
// React controlled inputs ignore plain `el.value = x`; use the native setter, then fire the event.
const setVal = (sel, v) => page.$eval(sel, (el, v) => {
  const proto = el.tagName === "SELECT" ? HTMLSelectElement : el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, v);
  el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
}, v);
const clickText = (t, sel = "button,a") => /* find first element whose text startsWith t, click, wait ~350ms */;
```
Start each run with `localStorage.clear()` and collect `pageerror` and `console.error` events; the test fails
on any console error (that is how duplicate-key and loop bugs were caught).

### Acceptance checklist (all passed in the reference)
1. Sidebar collapses to ≈72px, persists across navigation, expands back.
2. Status dots are coloured and distinct (amber/red/blue/green).
3. Orders: 10 rows/page; page 2 works; sorting by Total desc returns to page 1 and orders correctly;
   source filter, total-range filter, and Clear filters behave.
4. Creating an order queues "placed"; marking paid queues "paid"; marking shipped queues "shipped" with the
   tracking number (exact counts and subjects asserted).
5. Discounts: create; duplicate code rejected with a message; Compose with template + discount merges the
   link and code into the body.
6. Products: add → appears in admin list, on the category page, and at its own `/products/handle`; edit price →
   storefront updates; hide → storefront "not found"; remove an added product → gone; remove a base product →
   gone from storefront, listed under Removed, **Restore** brings it back; sort by price; price filter.
7. Currency: Accra visitor sees ₵; US visitor sees $; UK defaults to $; injected country overrides; selector
   change persists across reload; cart and filters re-price; hand-set US price wins; changing the rate
   re-converts the rest.
8. No console errors in any run. `tsc -b && vite build` is clean.

Also screenshot every page in both themes and mobile width (390px) and look at them.

---

## 14. Gotchas and lessons learned (each cost real time)

1. **Tailwind utilities that conflict.** `w-full` (in a shared `inputCls`) and `w-20` on the same element:
   whichever is later *in the generated CSS* wins, not later in the class list. Do not combine them. Use a
   grid with fixed tracks, or `!` modifiers (`!px-2`) for deliberate overrides.
2. **Unlayered global resets beat utilities.** `button { border: 0 }` outside `@layer base` made `border`
   classes on buttons do nothing. Put element resets inside `@layer base { … }`.
3. **StrictMode double effects** (see `usePaged`). Never rely on a "first run" boolean.
4. **zustand selectors must return stable values.** Select primitives/arrays individually and derive with
   `useMemo`. Returning a new object/array from a selector re-renders forever.
5. **Effect dependencies that overwrite user input** (Compose's `name`): leave them out deliberately and say why.
6. **Duplicate React keys** when two images are identical (front = hover default). Dedupe with `new Set`.
7. **Regex-driven bulk edits** (removing `rounded-*`) leave stray double spaces and can touch non-class
   strings. Review the diff; collapse spaces afterwards.
8. **macOS `sed -i` needs an empty suffix argument** (`sed -i ''`) and chokes on `|` delimiters mixed with
   alternation; do multi-line edits with a small Python script and `assert old in text` before replacing.
9. **`100vh` in headless screenshots:** a tall viewport makes full-height heroes huge. Use a realistic
   viewport for layout checks.
10. **A dev server started without Node 22 dies silently** in the background. Check its log before testing.
11. **Dashboard data must be believable but honest:** deterministic seed, `sample` flag, visible banner.
12. **Don't mix currencies in one number.** Orders carry one currency; sum per currency (the reference
    admin works in the base currency only, which is a known limitation).
13. **Never fake integrations.** If sending, redemption, auth or checkout are not real, say so in the UI.

---

## 15. Replacing local storage with a real backend

The seam is `store.ts` (admin) and `store/catalog.ts` (products). Keep the action names and component code;
swap the bodies for API calls plus a query cache. Suggested contract:

| Concern | Endpoint sketch |
|---|---|
| Auth | `POST /auth/login` → token; replace `Gate` with a real session; role claim `admin` |
| Orders | `GET /admin/orders?status&q&source&from&to&min&max&sort&page&size`, `PATCH /admin/orders/:id/status`, `POST /admin/orders` |
| Products | `GET/POST/PATCH/DELETE /admin/products`, image upload → object storage (store URLs, not data URLs) |
| Discounts | `GET/POST /admin/discount-links`, `PATCH …/:id {active}`; **public** `POST /storefront/discounts/validate` |
| Emails | `GET/PUT /admin/email-templates`; queue worker sends via an email provider; webhooks update `SENT/FAILED` |
| Money | orders store `currency`; checkout computes price **server-side** from the customer's market |

Move filtering, sorting and pagination server-side once lists grow (the hooks already isolate them). Keep the
UI honest about anything still not wired. If the new project shares the Compyler `project-x` backend, the
older OWUS admin (`OWUS/frontend/src/features/otema/admin/api.ts`) shows its conventions: base URL +
`X-Tenant-Id` header, `{ success, data }` envelope, `/api/v1/admin/storefront/...` routes. The Ometsey admin
does **not** call it. Never point a new admin at a production tenant for testing or send real email from it.

---

## 16. Adapting this to a different project (do these first)

Ask the user, or decide and state it:
1. **Brand tokens:** accent colour, sidebar colour, logo (needs a variant that survives `brightness()`
   filters, or provide light and dark logos). Replace the `brand` theme values.
2. **Currency model:** one currency or several; base currency symbol and `formatMoney`.
3. **Order lifecycle:** are `AWAITING_PAYMENT → AWAITING_FULFILMENT → COMPLETED` right? Add/remove states
   (e.g. refunded, partially fulfilled) and update the state machine, badges, tabs, and dashboard definitions.
4. **Order sources, product fields, collections, sizes:** `OrderSource`, the product form, `COLLECTION_IDS`.
5. **Email content:** starter templates, merge tags, the HTML wrapper's branding and footer.
6. **Discount semantics:** per-product vs per-collection scope, stacking, usage limits, minimum spend.
7. **Where the catalog lives:** if products already come from an API, skip the overlay store and call the API.
8. **Storefront integration:** routes the admin should bypass, existing header/footer, any pre-existing
   `PRODUCTS` imports to convert.
9. **Hosting:** whether `/admin` can be served from the same origin; how the passcode (or real auth) is provided.

Finish by reporting, in plain language: what works, what is local-only, what is deliberately not wired, and
which decisions you made on the user's behalf.
