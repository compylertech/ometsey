import path from 'path'
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(), tailwindcss(),
    ],
    server: {
        // The backend only allows a few origins for CORS, so in development the admin calls it
        // through this dev server (same origin). Point it elsewhere with VITE_DEV_API_TARGET.
        // The browser's Origin header is dropped too, or the backend would still apply its CORS list.
        proxy: {
            "/api": {
                target: process.env.VITE_DEV_API_TARGET ?? "http://localhost:8083",
                changeOrigin: true,
                configure: (proxy) => { proxy.on("proxyReq", (req) => req.removeHeader("origin")); },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})
