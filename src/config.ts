/** Where the site talks to the project-x backend, and as which tenant. Shared by the storefront and the admin. */
export const TENANT_ID: string = import.meta.env.VITE_TENANT_ID ?? "ometsey";

/**
 * In development the empty base sends requests to this origin, where the Vite proxy forwards
 * them to the local backend. Builds use the deployed API. Override with VITE_API_BASE_URL.
 */
export const API_BASE_URL: string =
    import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "" : "https://projectx-api-prod.compyler.io");
