import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/pages/LotteryPage.tsx",
        "./src/pages/CreateLotteryPage.tsx",
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "vendor";
            }
            if (id.includes("lucide-react")) {
              return "lucide";
            }
            if (
              id.includes("@radix-ui") ||
              id.includes("vaul") ||
              id.includes("cmdk") ||
              id.includes("sonner")
            ) {
              return "ui-lib";
            }
            if (id.includes("date-fns")) {
              return "date-fns";
            }
            if (id.includes("framer-motion")) {
              return "framer-motion";
            }
            if (id.includes("zod") || id.includes("hookform")) {
              return "forms";
            }
            return "vendor-core";
          }
        },
      },
    },
  },
});
