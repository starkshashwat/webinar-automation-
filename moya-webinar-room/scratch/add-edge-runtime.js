const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');

const targetPages = [
  'app/admin/settings/page.tsx',
  'app/admin/webinars/[id]/edit/page.tsx',
  'app/admin/webinars/[id]/report/page.tsx',
  'app/admin/webinars/[id]/settings/page.tsx',
  'app/admin/webinars/[id]/page.tsx',
  'app/admin/webinars/page.tsx',
  'app/admin/page.tsx',
  'app/webinar/[slug]/page.tsx'
];

function addEdgeRuntime(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("runtime = 'edge'") || content.includes('runtime = "edge"')) {
    return;
  }
  
  if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
    const firstLineEnd = content.indexOf('\n');
    content = content.slice(0, firstLineEnd + 1) + "export const runtime = 'edge';\n" + content.slice(firstLineEnd + 1);
  } else {
    content = "export const runtime = 'edge';\n" + content;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Added edge runtime to:', path.relative(baseDir, filePath));
}

// 1. Process target pages
targetPages.forEach(rel => {
  const full = path.join(baseDir, rel);
  if (fs.existsSync(full)) {
    addEdgeRuntime(full);
  }
});

// 2. Process all route.ts files
function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      walk(fullPath);
    } else if (file === 'route.ts') {
      addEdgeRuntime(fullPath);
    }
  });
}

walk(path.join(baseDir, 'app/api'));
console.log('Done adding edge runtime export to all routes and pages.');
