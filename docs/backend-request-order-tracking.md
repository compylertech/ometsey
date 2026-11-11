# Backend request: public order tracking

The storefront's Order Tracking page (`/pages/order-tracking`) asks for an **Order ID** and **billing email**. That is what a customer has on their receipt and confirmation email. The backend cannot answer it today.

## What exists

`GET /api/v1/storefront/orders/{reference}` (`StorefrontController.findOrderStatus`) takes the **payment reference**, an opaque UUID returned by checkout. It is right for the page the buyer lands on after paying, and the storefront already uses it there (`/order-status`). A customer coming back days later does not have that UUID. The response (`StorefrontOrderStatusDto`) also carries no tracking number or carrier.

## What is needed

```
POST /api/v1/storefront/orders/lookup        (tenant header only, like the other storefront calls)
{ "orderNumber": "OM-000042", "email": "ama@example.com" }
```

Answer `200` with the existing `StorefrontOrderStatusDto` plus:

| Field | Notes |
|---|---|
| `trackingNumber` | the value the admin enters when marking an order shipped; `null` until then |
| `carrier` | if the ship action records one; otherwise leave out |
| `shippedAt` | when it was marked shipped, if recorded |

Rules:

- Match the order number **and** the customer email (case-insensitive, trimmed). A wrong pair must answer the same `404` as an unknown order, so the endpoint cannot be used to discover which order numbers or emails exist.
- Rate-limit by connection and by email, as `POST /storefront/contact` does. A `429` is shown to the buyer as "try again later".
- Read-only. It must not verify or complete a payment (unlike `findOrderStatus`).
- Do not return the address, phone number or notes. Status, items, totals and tracking are enough.

## Frontend, once it exists

Replace the placeholder message in `src/pages/OrderTracking.tsx` with a call to this endpoint and show the order stage, items and tracking number. `lib/api.ts` already holds the other storefront calls, and `OrderStatus.tsx` has the layout to reuse.
