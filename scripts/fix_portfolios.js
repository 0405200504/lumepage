const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = '/Users/luiseduardofariafilho/Downloads/lume_portfolios';

// Fix Page 1 (Next.js)
const page1Dir = path.join(baseDir, 'page-1-portf-lio-');
const page1Components = ['Hero.tsx', 'Contact.tsx', 'Header.tsx', 'WhatsAppFloat.tsx', 'About.tsx'];
for (const comp of page1Components) {
  const file = path.join(page1Dir, 'components', comp);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/href=\{WHATSAPP_LINK\}/g, 'href="#" data-lume-agendar');
    fs.writeFileSync(file, content);
  }
}

// Add script to page-1 layout.tsx
const layout1 = path.join(page1Dir, 'app', 'layout.tsx');
if (fs.existsSync(layout1)) {
  let content = fs.readFileSync(layout1, 'utf8');
  if (!content.includes('embed.js')) {
    content = content.replace('</body>', '  <script src="http://localhost:3000/embed.js" data-lume-slug="page-1" defer></script>\n      </body>');
    fs.writeFileSync(layout1, content);
  }
}

// Fix Pages 2, 3, 4, 5 (HTML)
const pages = [
  { dir: 'page-2-portf-lio', slug: 'page-2' },
  { dir: 'page-3-portf-lio', slug: 'page-3' },
  { dir: 'page-4-portfolio', slug: 'page-4' },
  { dir: 'page-5-portfolio', slug: 'page-5' }
];

for (const page of pages) {
  const htmlFile = path.join(baseDir, page.dir, 'index.html');
  if (fs.existsSync(htmlFile)) {
    let content = fs.readFileSync(htmlFile, 'utf8');
    
    // Replace the href
    const regex = new RegExp(`href="http://localhost:3000/agendar/${page.slug}"`, 'g');
    content = content.replace(regex, 'href="#" data-lume-agendar');
    
    // Add the script before </body>
    if (!content.includes('embed.js')) {
      content = content.replace('</body>', `  <script src="http://localhost:3000/embed.js" data-lume-slug="${page.slug}" defer></script>\n</body>`);
    }
    
    fs.writeFileSync(htmlFile, content);
  }
}

// Commit and push all
const dirs = ['page-1-portf-lio-', 'page-2-portf-lio', 'page-3-portf-lio', 'page-4-portfolio', 'page-5-portfolio'];
for (const dir of dirs) {
  const repoPath = path.join(baseDir, dir);
  console.log(`Pushing ${dir}...`);
  execSync('git add . && git commit -m "Alterar botoes para abrir popup (widget)" && git push', { cwd: repoPath, stdio: 'inherit' });
}
