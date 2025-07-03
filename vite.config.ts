import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // это позволит писать `import … from '@/components/…'`
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
