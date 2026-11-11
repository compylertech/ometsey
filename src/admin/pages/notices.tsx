// local imports
import { useAdminData } from "../data";
import { Notice } from "../ui";

/** Load failures and the partial-data warning, shown above whichever page is affected. */
export function DataNotices({ of }: { of: ("orders" | "products" | "links")[] }) {
    const { errors, truncated, orders, retrying } = useAdminData();
    const label = { orders: "orders", products: "products", links: "discount links" } as const;
    return (
        <>
            {retrying > 0 && (
                <div className="mb-5"><Notice tone="info">The server is still warming up. Trying again (attempt {retrying + 1})…</Notice></div>
            )}
            {of.map((k) => errors[k] && (
                <div key={k} className="mb-5"><Notice tone="error">Couldn’t load {label[k]}: {errors[k]}</Notice></div>
            ))}
            {of.includes("orders") && truncated && (
                <div className="mb-5"><Notice tone="warn">The server returned only the latest {orders.length} orders, so these figures cover recent orders, not everything.</Notice></div>
            )}
        </>
    );
}
