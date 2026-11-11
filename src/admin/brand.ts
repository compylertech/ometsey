import { API_BASE_URL, TENANT_ID } from "@/config";

/** Everything tenant-specific in one place; the rest of the admin reads from here. */
export const BRAND = {
    name: "Ometsey",
    tenantId: TENANT_ID,
    logo: "/images/brand/logo.png",
    supportEmail: "info@ometsey.com",
    defaultCurrency: "GHS",
    currencies: ["GHS", "USD"],
};

export { API_BASE_URL };
