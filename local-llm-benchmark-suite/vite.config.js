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
    build: {
      rollupOptions: {
        external: ['@tauri-apps/api/tauri', '@tauri-apps/api'],
        onwarn(warning, warn) {
          // Suppress eval warnings from ResourceMonitor.jsx
          if (warning.code === 'EVAL' && warning.message.includes('ResourceMonitor.jsx')) {
            return;
          }
          warn(warning);
        }
      }
    }
  };
});
