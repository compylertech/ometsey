/** Everything tenant-specific in one place; the rest of the admin reads from here. */
export const BRAND = {
    name: "Ometsey",
    tenantId: import.meta.env.VITE_TENANT_ID ?? "ometsey",
    logo: "/images/brand/logo.png",
    supportEmail: "info@ometsey.com",
    defaultCurrency: "GHS",
    currencies: ["GHS", "USD"],
};

/**
 * In development the empty base sends requests to this origin, where the Vite proxy forwards
 * them to the local backend. Builds use the deployed API. Override with VITE_API_BASE_URL.
 */
export const API_BASE_URL: string =
    import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "" : "https://projectx-api-prod.compyler.io");
