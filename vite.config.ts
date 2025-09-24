import { defineConfig } from "vite";
import dyadTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Removido 'date-fns-tz': 'date-fns-tz/dist/index.js',
    },
  },
  optimizeDeps: {
    include: ['date-fns'],
    exclude: ['date-fns-tz'], // Manter para evitar pré-bundling problemático
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      // Removido 'date-fns-tz' de external
    },
  },
}));