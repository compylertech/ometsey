import { create } from "zustand"
import { persist } from "zustand/middleware"

interface WishlistState {
    handles: string[];
    toggle: (handle: string) => void;
}

export const useWishlist = create<WishlistState>()(persist((set) => ({
    handles: [],
    toggle: (handle) => set((s) => ({
        handles: s.handles.includes(handle) ? s.handles.filter((h) => h !== handle) : [...s.handles, handle],
    })),
}), { name: "ometsey-wishlist" }))
