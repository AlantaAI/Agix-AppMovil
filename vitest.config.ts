import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Solo se prueban los módulos puros (dominio y mapeos), que no importan React Native.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
