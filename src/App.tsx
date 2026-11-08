import { useEffect } from "react"
import { Route, Routes, useLocation } from "react-router-dom"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { CartDrawer } from "@/components/CartDrawer"
import { Home } from "@/pages/Home"
import { Collection } from "@/pages/Collection"
import { Product } from "@/pages/Product"
import { Page } from "@/pages/Page"
import { About } from "@/pages/About"
import { Faq } from "@/pages/Faq"
import { Contact } from "@/pages/Contact"
import { StoreLocation } from "@/pages/StoreLocation"
import { BookAppointment } from "@/pages/BookAppointment"
import { Gallery } from "@/pages/Gallery"
import { GiftCard } from "@/pages/GiftCard"
import { OrderTracking } from "@/pages/OrderTracking"
import { Account } from "@/pages/Account"
import { Wishlist } from "@/pages/Wishlist"
import { Blog } from "@/pages/Blog"
import { Cart } from "@/pages/Cart"
import { AdminApp } from "@/admin/AdminApp"

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

const ACCOUNT_PATH = "/pages/my-account";

export default function App() {
    // The account page is a full-screen split layout with its own way back, like the reference.
    const { pathname } = useLocation();
    const bare = pathname === ACCOUNT_PATH || pathname.startsWith("/admin");
    if (pathname.startsWith("/admin")) return <Routes><Route path="/admin/*" element={<AdminApp />} /></Routes>;
    return (
        <>
            <ScrollToTop />
            {!bare && <Header />}
            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/collections/:handle" element={<Collection />} />
                    <Route path="/products/:handle" element={<Product />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/pages/about-us" element={<About />} />
                    <Route path="/pages/faq" element={<Faq />} />
                    <Route path="/pages/contact-us" element={<Contact />} />
                    <Route path="/pages/store-location" element={<StoreLocation />} />
                    <Route path="/pages/book-an-appointment" element={<BookAppointment />} />
                    <Route path="/pages/gallery" element={<Gallery />} />
                    <Route path="/pages/gift-card" element={<GiftCard />} />
                    <Route path="/pages/order-tracking" element={<OrderTracking />} />
                    <Route path={ACCOUNT_PATH} element={<Account />} />
                    <Route path="/pages/wishlist" element={<Wishlist />} />
                    <Route path="/pages/blog" element={<Blog />} />
                    <Route path="/pages/:slug" element={<Page />} />
                    <Route path="*" element={<Page />} />
                </Routes>
            </main>
            {!bare && <Footer />}
            <CartDrawer />
        </>
    )
}
