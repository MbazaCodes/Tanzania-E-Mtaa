import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const srcPath = path.resolve(__dirname, './src');

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/node_modules/')) {
            const packagePath = normalizedId.split('/node_modules/')[1];
            const packageSegments = packagePath.split('/');
            const packageName = packageSegments[0].startsWith('@')
              ? `${packageSegments[0]}/${packageSegments[1]}`
              : packageSegments[0];

            if (['react', 'react-dom', 'scheduler', '@tanstack/react-query'].includes(packageName)) {
              return 'framework';
            }

            if (
              [
                '@react-pdf/renderer',
                'qrcode.react',
                'buffer',
              ].includes(packageName)
            ) {
              return 'pdf-vendor';
            }

            if (['framer-motion', 'lucide-react'].includes(packageName)) {
              return 'ui-vendor';
            }

            if (packageName === '@supabase/supabase-js') {
              return 'supabase-vendor';
            }

            if (packageName === 'react-hook-form' || packageName === '@hookform/resolvers' || packageName === 'zod') {
              return 'forms-vendor';
            }

            if (packageName === 'react-phone-number-input' || packageName === 'libphonenumber-js') {
              return 'phone-vendor';
            }
          }

          if (
            normalizedId.includes('/src/components/documents/') ||
            normalizedId.includes('/src/components/DocumentRenderer.tsx') ||
            normalizedId.includes('/src/components/DocumentPDF.tsx') ||
            normalizedId.includes('/src/components/ReceiptPDF.tsx')
          ) {
            return 'pdf-documents';
          }

          if (
            normalizedId.includes('/src/pages/admin/') ||
            normalizedId.includes('/src/pages/staff/') ||
            normalizedId.includes('/src/components/StaffManagement.tsx') ||
            normalizedId.includes('/src/components/ApplicationReview.tsx')
          ) {
            return 'admin-staff';
          }
        },
      },
    },
  },
  resolve: {
    alias: [
      { find: '@/src', replacement: srcPath },
      { find: '@', replacement: srcPath },
      { find: 'buffer', replacement: 'buffer' },
    ],
  },
  define: {
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', '@react-pdf/renderer'],
  },
  server: {
    port: 3000,
    open: true,
  },
});