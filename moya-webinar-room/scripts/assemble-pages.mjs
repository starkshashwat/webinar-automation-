import fs from 'fs';
import path from 'path';

/**
 * Assembles the Cloudflare Pages output directory from the OpenNext build.
 * 
 * Structure:
 *   .open-next/pages-output/
 *     _worker.js/           ← directory (Pages Advanced Mode)
 *       index.js            ← the worker entry point
 *       cloudflare/         ← worker dependencies
 *       middleware/          ← middleware handler
 *       server-functions/   ← server function handlers  
 *       .build/             ← durable objects
 *       cache/              ← cache assets
 *     _next/                ← static assets (JS/CSS chunks)
 *     favicon.ico           ← static files
 *     ...
 */

const OPEN_NEXT = '.open-next';
const OUTPUT = path.join(OPEN_NEXT, 'pages-output');

// Clean previous output
if (fs.existsSync(OUTPUT)) {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT, { recursive: true });

// 1. Copy static assets into the output root
const assetsDir = path.join(OPEN_NEXT, 'assets');
if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, OUTPUT, { recursive: true });
  console.log('✓ Copied static assets');
}

// 2. Create _worker.js directory for Pages Advanced Mode
const workerDir = path.join(OUTPUT, '_worker.js');
fs.mkdirSync(workerDir, { recursive: true });

// 3. Copy worker.js as the entry point (index.js)
fs.copyFileSync(
  path.join(OPEN_NEXT, 'worker.js'),
  path.join(workerDir, 'index.js')
);
console.log('✓ Copied worker entry point as _worker.js/index.js');

// 4. Copy all worker dependency directories
const workerDeps = ['cloudflare', 'middleware', 'server-functions', '.build', 'cache', 'cloudflare-templates', 'dynamodb-provider'];

for (const dep of workerDeps) {
  const src = path.join(OPEN_NEXT, dep);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(workerDir, dep), { recursive: true });
    console.log(`✓ Copied ${dep}/`);
  }
}

console.log('\n✅ Pages output assembled at:', OUTPUT);
