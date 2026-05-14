import { defineConfig } from "vite";
  import react from "@vitejs/plugin-react";
  import tailwindcss from "@tailwindcss/vite";
  import path from "path";

  const isProduction = process.env.NODE_ENV === "production";

  const port = Number(process.env.PORT ?? 5173);
  const basePath = process.env.BASE_PATH ?? "/";

  // In dev (non-production), warn if vars are missing but don't crash the build
  if (!isProduction) {
    if (!process.env.PORT) console.warn("PORT not set, defaulting to 5173");
    if (!process.env.BASE_PATH) console.warn("BASE_PATH not set, defaulting to /");
  }

  export default defineConfig({
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      ...(!isProduction && process.env.REPL_ID !== undefined
        ? [
            (await import("@replit/vite-plugin-runtime-error-modal")).default(),
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
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
  