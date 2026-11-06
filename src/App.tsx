import { useEffect } from "react"
import { Route, Routes, useLocation } from "react-router-dom"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { CartDrawer } from "@/components/CartDrawer"
import { Home } from "@/pages/Home"
import { Collection } from "@/pages/Collection"
import { Product } from "@/pages/Product"
import { Page } from "@/pages/Page"

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

export default function App() {
    return (
        <>
            <ScrollToTop />
            <Header />
            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/collections/:handle" element={<Collection />} />
                    <Route path="/products/:handle" element={<Product />} />
                    <Route path="/pages/:slug" element={<Page />} />
                    <Route path="*" element={<Page />} />
                </Routes>
            </main>
            <Footer />
            <CartDrawer />
        </>
    )
}
