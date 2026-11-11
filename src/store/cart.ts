import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CartLine { handle: string; size: string; qty: number }

interface CartState {
    lines: CartLine[];
    open: boolean;
    add: (handle: string, size: string) => void;
    remove: (handle: string, size: string) => void;
    setQty: (handle: string, size: string, qty: number) => void;
    setOpen: (open: boolean) => void;
    clear: () => void;
}

export const useCart = create<CartState>()(persist((set) => ({
    lines: [],
    open: false,
    add: (handle, size) => set((s) => {
        const hit = s.lines.find((l) => l.handle === handle && l.size === size);
        const lines = hit
            ? s.lines.map((l) => (l === hit ? { ...l, qty: l.qty + 1 } : l))
            : [...s.lines, { handle, size, qty: 1 }];
        return { lines, open: true };
    }),
    remove: (handle, size) => set((s) => ({ lines: s.lines.filter((l) => !(l.handle === handle && l.size === size)) })),
    setQty: (handle, size, qty) => set((s) => ({
        lines: qty < 1
            ? s.lines.filter((l) => !(l.handle === handle && l.size === size))
            : s.lines.map((l) => (l.handle === handle && l.size === size ? { ...l, qty } : l)),
    })),
    setOpen: (open) => set({ open }),
    clear: () => set({ lines: [] }),
}), { name: "ometsey-cart", partialize: (s) => ({ lines: s.lines }) }))
