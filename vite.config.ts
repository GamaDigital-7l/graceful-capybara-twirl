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
      "date-fns-tz": "date-fns-tz/dist/index.js", // Adicionado alias para forçar a resolução
    },
  },
  optimizeDeps: {
    include: ['date-fns'],
    exclude: ['date-fns-tz'], // Excluir novamente para que o alias seja respeitado e não haja pré-bundling conflitante
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      esmExternals: true, // Manter esta opção para melhor interoperação CJS/ESM
    },
    rollupOptions: {
      // Removido 'date-fns-tz' de external
    },
  },
}));