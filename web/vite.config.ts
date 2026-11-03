import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/data/': {
                target: 'http://localhost:8000',
                rewrite: path => path.replace(/^\/data/, ''),
            },
        },
    },
});
