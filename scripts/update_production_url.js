const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = '/Users/luiseduardofariafilho/Downloads/lume_portfolios';

// Fix Page 1 (Next.js)
const layout1 = path.join(baseDir, 'page-1-portf-lio-', 'app', 'layout.tsx');
if (fs.existsSync(layout1)) {
  let content = fs.readFileSync(layout1, 'utf8');
  content = content.replace(/http:\/\/localhost:3000/g, 'https://lume.vercel.app');
  fs.writeFileSync(layout1, content);
}

// Fix Pages 2, 3, 4, 5 (HTML)
const pages = [
  'page-2-portf-lio',
  'page-3-portf-lio',
  'page-4-portfolio',
  'page-5-portfolio'
];

for (const dir of pages) {
  const htmlFile = path.join(baseDir, dir, 'index.html');
  if (fs.existsSync(htmlFile)) {
    let content = fs.readFileSync(htmlFile, 'utf8');
    content = content.replace(/http:\/\/localhost:3000/g, 'https://lume.vercel.app');
    fs.writeFileSync(htmlFile, content);
  }
}

// Commit and push all
const dirs = ['page-1-portf-lio-', 'page-2-portf-lio', 'page-3-portf-lio', 'page-4-portfolio', 'page-5-portfolio'];
for (const dir of dirs) {
  const repoPath = path.join(baseDir, dir);
  console.log(`Pushing ${dir}...`);
  execSync('git add . && git commit -m "Atualizar url do script do widget para URL de producao" && git push', { cwd: repoPath, stdio: 'inherit' });
}
