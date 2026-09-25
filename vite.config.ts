import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * Serves (dev) and copies (build) the binary resources pdf.js loads at runtime:
 * CJK character maps, the 14 standard fonts, the JPEG 2000 / colour-management
 * WebAssembly decoders, ICC profiles and annotation icons. Without them, JPX
 * images and non-embedded fonts (common in government XFA forms) render incorrectly.
 */
function pdfjsAssets(): Plugin {
  const pdfjsRoot = path.resolve(__dirname, 'node_modules/pdfjs-dist');
  // Public directory under /pdfjs/ → directory inside the pdfjs-dist package.
  const assetDirs: Record<string, string> = {
    cmaps: 'cmaps',
    standard_fonts: 'standard_fonts',
    wasm: 'wasm',
    iccs: 'iccs',
    images: 'web/images',
  };
  let outDir = 'dist';

  return {
    name: 'pdfjs-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use('/pdfjs', (req, res, next) => {
        const [publicDir, ...rest] = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '').split('/');
        const sourceDir = Object.hasOwn(assetDirs, publicDir) ? path.join(pdfjsRoot, assetDirs[publicDir]) : null;
        const file = sourceDir ? path.resolve(sourceDir, rest.join('/')) : '';
        if (!sourceDir || !file.startsWith(sourceDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          next();
          return;
        }
        const types: Record<string, string> = {'.wasm': 'application/wasm', '.svg': 'image/svg+xml'};
        res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
    writeBundle() {
      for (const [publicDir, sourceDir] of Object.entries(assetDirs)) {
        fs.cpSync(path.join(pdfjsRoot, sourceDir), path.join(outDir, 'pdfjs', publicDir), {recursive: true});
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), pdfjsAssets()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
