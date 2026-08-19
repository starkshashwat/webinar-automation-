import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const out = 'pages-dist';

console.log('Preparing Pages distribution directory...');
if (fs.existsSync(out)) {
  fs.rmSync(out, { recursive: true, force: true });
}
fs.mkdirSync(out);

if (fs.existsSync('.open-next/assets')) {
  fs.cpSync('.open-next/assets', out, { recursive: true });
}

fs.copyFileSync('.open-next/worker.js', path.join(out, '_worker.js'));

console.log('Deploying to Cloudflare Pages...');
try {
  execSync('npx wrangler pages deploy pages-dist --project-name webinar-automation', { stdio: 'inherit' });
  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error);
  process.exit(1);
}
