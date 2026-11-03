import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const secretsFile = fileURLToPath(new URL('../secrets/web.env.local', import.meta.url));
if (existsSync(secretsFile)) {
    loadEnvFile(secretsFile);
}

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
