import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const isProduction = process.env.NODE_ENV === "production";

const port = Number(process.env.PORT ?? 24925);

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Only active in production builds — avoids SW caching dev assets
      devOptions: { enabled: false },
      includeAssets: [
        "favicon.svg",
        "robots.txt",
        "apple-touch-icon.png",
        "icons/*.png",
      ],
      manifest: {
        name: "DC Lugazi",
        short_name: "DC Lugazi",
        description: "Deliverance Church Lugazi — Digital Church Management System",
        theme_color: "#6D1F3C",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        categories: ["productivity", "utilities"],
        lang: "en",
        icons: [
          { src: "icons/icon-72x72.png",            sizes: "72x72",   type: "image/png" },
          { src: "icons/icon-96x96.png",            sizes: "96x96",   type: "image/png" },
          { src: "icons/icon-128x128.png",          sizes: "128x128", type: "image/png" },
          { src: "icons/icon-144x144.png",          sizes: "144x144", type: "image/png" },
          { src: "icons/icon-152x152.png",          sizes: "152x152", type: "image/png" },
          { src: "icons/icon-192x192.png",          sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-384x384.png",          sizes: "384x384", type: "image/png" },
          { src: "icons/icon-512x512.png",          sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache all JS, CSS, HTML, images, and fonts
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // SPA: serve index.html for any unmatched navigation request
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Google Fonts stylesheet — cache for 1 year
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts files — cache for 1 year
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // API calls — network first, fall back to cached response for offline use
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-responses",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cloudinary videos — bypass service worker entirely so the browser
          // handles HTTP range requests natively (service worker interception
          // of 206 Partial Content breaks <video> in Chrome on Android).
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*\/(video|raw)\/upload\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
    ...(!isProduction && process.env.REPL_ID !== undefined
      ? [
          (await import("@replit/vite-plugin-runtime-error-modal")).default(),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
