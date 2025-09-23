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
    // Excluir date-fns-tz da otimização para forçar o Vite a processá-lo como um módulo normal
    exclude: ['date-fns-tz'], 
    include: [], // Limpar includes se não houver outras dependências problemáticas
  },
  build: {
    commonjsOptions: {
      // Incluir node_modules para garantir que módulos CommonJS sejam transformados
      include: [/node_modules/],
    },
  },
}));