import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // This ensures your static public files are copied directly to the build output
  publicDir: 'public' 
});

