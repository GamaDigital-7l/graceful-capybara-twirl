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
    },
  },
  optimizeDeps: {
    // Incluir date-fns-tz para garantir que seja pré-empacotado e processado corretamente
    include: ['date-fns-tz'],
  },
  build: {
    commonjsOptions: {
      // Incluir node_modules para garantir que módulos CommonJS sejam transformados
      include: [/node_modules/],
    },
  },
}));