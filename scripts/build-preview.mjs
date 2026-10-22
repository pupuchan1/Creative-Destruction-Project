import { createHash } from 'node:crypto';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = resolve(root, 'apps/web');
const output = resolve(web, 'dist-preview');

await build({
  root: web,
  configFile: resolve(web, 'vite.config.ts'),
  mode: 'standalone',
  base: './',
  build: {
    outDir: output,
    modulePreload: false,
    cssCodeSplit: false,
  },
});

let html = await readFile(resolve(output, 'index.html'), 'utf8');
const scriptTag = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const styleTag = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!scriptTag || !styleTag) throw new Error('Expected one entry script and stylesheet');

const script = (await readFile(resolve(output, scriptTag[1]), 'utf8')).replace(
  /<\/script/gi,
  '<\\/script',
);
const style = (await readFile(resolve(output, styleTag[1]), 'utf8')).replace(
  /<\/style/gi,
  '<\\/style',
);
const icon = await readFile(resolve(web, 'public/favicon.svg'), 'base64');
const hash = (value) => `'sha256-${createHash('sha256').update(value).digest('base64')}'`;

// Only these exact inline assets may execute; all external connections stay blocked.
const csp = `default-src 'none'; script-src ${hash(script)}; style-src ${hash(style)}; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'`;
html = html
  .replace(scriptTag[0], () => `<script type="module">${script}</script>`)
  .replace(styleTag[0], () => `<style>${style}</style>`)
  .replace(
    /<link\b[^>]*rel="icon"[^>]*>/,
    () => `<link rel="icon" href="data:image/svg+xml;base64,${icon}">`,
  )
  .replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`);

await writeFile(resolve(root, 'preview.html'), html);
await rm(output, { recursive: true });
console.log('Standalone preview created: preview.html (no server or network connection needed)');
