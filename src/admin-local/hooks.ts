import { useEffect, useMemo, useRef, useState } from "react"

export type SortDir = "asc" | "desc";
export interface SortState { key: string; dir: SortDir }

/** Click a header to sort ascending, again for descending, a third time to go back to the natural order. */
export function useSort<T>(rows: T[], accessors: Record<string, (r: T) => string | number>, initial: SortState | null = null) {
    const [sort, setSort] = useState<SortState | null>(initial);
    const acc = useRef(accessors);
    acc.current = accessors;

    const sorted = useMemo(() => {
        const get = sort && acc.current[sort.key];
        if (!sort || !get) return rows;
        const m = sort.dir === "asc" ? 1 : -1;
        return [...rows].sort((a, b) => {
            const x = get(a), y = get(b);
            const d = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
            return d * m;
        });
    }, [rows, sort]);

    const toggle = (key: string) => setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
    return { sorted, sort, toggle };
}

/** Pages a list. `resetKey` should change whenever the filters or sort do, which sends it back to page 1. */
export function usePaged<T>(rows: T[], resetKey: string, initialSize = 10) {
    const [page, setPage] = useState(1);
    const [size, setSizeState] = useState(initialSize);
    const last = useRef(resetKey);
    useEffect(() => {
        if (last.current === resetKey) return;
        last.current = resetKey;
        setPage(1);
    }, [resetKey]);

    const pages = Math.max(1, Math.ceil(rows.length / size));
    const current = Math.min(page, pages);
    const slice = useMemo(() => rows.slice((current - 1) * size, current * size), [rows, current, size]);
    return { rows: slice, page: current, pages, size, total: rows.length, setPage, setSize: (n: number) => { setSizeState(n); setPage(1); } };
}

export type Paged = ReturnType<typeof usePaged>;
