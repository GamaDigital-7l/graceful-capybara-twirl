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
      'date-fns-tz': 'date-fns-tz/dist/esm/index.js', // Mantém o alias explícito
    },
  },
  optimizeDeps: {
    // Incluir date-fns-tz na otimização para garantir que seja pré-empacotado corretamente
    include: ['date-fns-tz'], 
    exclude: [], // Remove a exclusão para evitar conflitos
  },
  build: {
    commonjsOptions: {
      // Incluir node_modules para garantir que módulos CommonJS sejam transformados
      include: [/node_modules/],
    },
  },
}));