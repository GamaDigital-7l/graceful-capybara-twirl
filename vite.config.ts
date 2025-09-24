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
    },
  },
  optimizeDeps: {
    include: ['date-fns'], // Manter date-fns incluído
    exclude: ['date-fns-tz'], // Excluir date-fns-tz da otimização
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