import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'date-fns-tz': 'date-fns-tz/dist/index.js', // Força a versão CommonJS
    },
  },
  optimizeDeps: {
    include: ['date-fns', 'date-fns-tz'], // Inclui date-fns-tz para otimização
    exclude: [],
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