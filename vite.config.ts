import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths make the build work both at a custom domain
  // and at https://username.github.io/repository-name/.
  base: './',
  server: {
    host: true,
  },
});
