import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AdminTheme = "mono" | "brand";

export const THEMES: { id: AdminTheme; label: string; note: string }[] = [
    { id: "mono", label: "Black & white", note: "Plain monochrome. The default." },
    { id: "brand", label: "Ometsey brown", note: "Warm brown accents from the storefront." },
];

/** Applies to the admin only; the storefront is unaffected. */
export const useAdminTheme = create<{ theme: AdminTheme; setTheme: (t: AdminTheme) => void }>()(persist(
    (set) => ({ theme: "mono", setTheme: (theme) => set({ theme }) }),
    { name: "ometsey-admin-theme" },
));

/** Whether the desktop sidebar is the narrow icon rail. Remembered across visits. */
export const useAdminLayout = create<{ collapsed: boolean; toggle: () => void }>()(persist(
    (set) => ({ collapsed: false, toggle: () => set((s) => ({ collapsed: !s.collapsed })) }),
    { name: "ometsey-admin-layout" },
));
