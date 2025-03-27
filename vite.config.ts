import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    base: "/",
    build: {
        outDir: "dist",
        sourcemap: true,
        minify: "terser",
        rollupOptions: {
            input: path.resolve(__dirname, "index.html"),
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3000,
    },
});