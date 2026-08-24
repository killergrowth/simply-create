/**
 * Simply Create KC — gen-sitemap.js
 * Generates sitemap.xml from the page list.
 * Run: node gen-sitemap.js
 * Output: dist/sitemap.xml
 */

const fs = require('fs');
const path = require('path');

const BASE = 'https://simplycreatekc.com';
const TODAY = new Date().toISOString().split('T')[0];
const DIST = path.join(__dirname, 'dist');

// Pages to include (noindex pages excluded)
const pages = [
  { loc: '/',                         priority: '1.0' },
  { loc: '/classes/',                 priority: '0.9' },
  { loc: '/gallery/',                 priority: '0.8' },
  { loc: '/shop/',                    priority: '0.8' },
  { loc: '/private-events/',          priority: '0.9' },
  { loc: '/custom-piece/',            priority: '0.8' },
  { loc: '/artist-partnership/',      priority: '0.7' },
  { loc: '/about/',                   priority: '0.7' },
  { loc: '/contact/',                 priority: '0.8' },
  // privacy-policy excluded (noindex)
];

const urls = pages.map(({ loc, priority }) => `  <url>
    <loc>${BASE}${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml, 'utf8');
console.log('✅ sitemap.xml written to dist/');
