import { STORE } from "@/data/catalog"

/** Forms with no backend yet open the visitor's email app, addressed to the store. */
export function mailto(subject: string, fields: Record<string, string>) {
    const body = Object.entries(fields).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
    window.location.href = `mailto:${STORE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Reads a form into a { label: value } record, using each control's placeholder or aria-label. */
export function readForm(form: HTMLFormElement): Record<string, string> {
    const out: Record<string, string> = {};
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((el) => {
        const label = el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name;
        if (label && el.type !== "submit") out[label] = el.value;
    });
    return out;
}
