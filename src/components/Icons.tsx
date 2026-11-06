const base = { width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 1.2, viewBox: "0 0 24 24" } as const;

export const SearchIcon = () => <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></svg>;
export const UserIcon = () => <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>;
export const BagIcon = () => <svg {...base}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></svg>;
export const MenuIcon = () => <svg {...base} width={22} height={22}><path d="M3 7h18M3 12h18M3 17h18" /></svg>;
export const CloseIcon = () => <svg {...base}><path d="M5 5l14 14M19 5L5 19" /></svg>;
