/**
 * Delivery destinations, as ISO 3166-1 alpha-2 codes. The backend validates the code
 * against the full ISO list, so extending this list needs no backend change — but the
 * shipping rate comes from the product's `attributes.shipping.rates`, and any
 * country without its own rate falls back to the product's default.
 */
export interface Country {
    code: string;
    name: string;
}

export const COUNTRIES: Country[] = [
    { code: "GH", name: "Ghana" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "NG", name: "Nigeria" },
    { code: "ZA", name: "South Africa" },
    { code: "KE", name: "Kenya" },
    { code: "CI", name: "Côte d'Ivoire" },
    { code: "TG", name: "Togo" },
    { code: "BJ", name: "Benin" },
    { code: "SN", name: "Senegal" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "AU", name: "Australia" },
    { code: "BE", name: "Belgium" },
    { code: "DE", name: "Germany" },
    { code: "DK", name: "Denmark" },
    { code: "ES", name: "Spain" },
    { code: "FR", name: "France" },
    { code: "IE", name: "Ireland" },
    { code: "IT", name: "Italy" },
    { code: "NL", name: "Netherlands" },
    { code: "NO", name: "Norway" },
    { code: "SE", name: "Sweden" },
    { code: "CH", name: "Switzerland" },
];
