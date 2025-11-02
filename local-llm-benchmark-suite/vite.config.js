import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      port: 1420,
      strictPort: true,
      hmr: {
        overlay: false
      }
    },
  };
});
