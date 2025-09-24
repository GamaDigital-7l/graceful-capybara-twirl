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
      // Removido 'date-fns-tz' alias
    },
  },
  optimizeDeps: {
    include: ['date-fns', 'date-fns-tz'], // Incluído 'date-fns-tz' para otimização
    // Removido 'exclude: ['date-fns-tz']'
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      // Removido 'esmExternals: true'
    },
    rollupOptions: {
      // Removido 'date-fns-tz' de external
    },
  },
}));