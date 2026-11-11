/**
 * Best guess at the visitor's country, as an ISO code, or undefined when nothing is conclusive.
 *
 * Today this reads the browser. To use real IP geolocation later, have the host or an edge function
 * put the country in the page (<meta name="ometsey-country" content="GH">) and nothing else changes:
 * that tag is checked first.
 */
export function detectCountry(): string | undefined {
    if (typeof document === "undefined") return undefined;

    const injected = document.querySelector('meta[name="ometsey-country"]')?.getAttribute("content")?.trim();
    if (injected) return injected.toUpperCase();

    // A device clock set to Accra is a strong signal, stronger than a browser left on en-US.
    try {
        if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Accra") return "GH";
    } catch { /* an unusual browser: fall through to the language */ }

    for (const lang of navigator.languages ?? [navigator.language]) {
        try {
            const region = new Intl.Locale(lang).region;
            if (region) return region.toUpperCase();
        } catch { /* malformed tag: try the next one */ }
    }
    return undefined;
}
