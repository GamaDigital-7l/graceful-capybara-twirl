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
      // Removido o alias explícito para "date-fns-tz"
    },
  },
  optimizeDeps: {
    include: ['date-fns', 'date-fns-tz'], // Incluído "date-fns-tz" para forçar o pré-empacotamento
    exclude: [], // Removido "date-fns-tz" da exclusão
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      esmExternals: true,
    },
    rollupOptions: {
      // Nenhuma alteração necessária aqui
    },
  },
}));