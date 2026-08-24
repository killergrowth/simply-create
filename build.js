/**
 * Simply Create KC — build.js
 * Assembles pages from source HTML + _partials/ into dist/
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const PARTIALS = path.join(ROOT, '_partials');

// ── Utility ────────────────────────────────────────────────────────
function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c, 'utf8'); }

function processHead(source) {
  // Extract per-page meta from comment markers in source
  const title     = (source.match(/<!--\s*PAGE_TITLE:\s*(.*?)\s*-->/))?.[1] ?? 'Simply Create KC';
  const desc      = (source.match(/<!--\s*PAGE_DESC:\s*(.*?)\s*-->/))?.[1] ?? '';
  const canonical = (source.match(/<!--\s*PAGE_CANONICAL:\s*(.*?)\s*-->/))?.[1] ?? 'https://simplycreatekc.com/';
  const ogTitle   = (source.match(/<!--\s*PAGE_OG_TITLE:\s*(.*?)\s*-->/))?.[1] ?? title;
  const ogDesc    = (source.match(/<!--\s*PAGE_OG_DESC:\s*(.*?)\s*-->/))?.[1] ?? desc;

  // Extract schema block (between PAGE_SCHEMA: and next --> closer)
  const schemaMatch = source.match(/<!--\s*PAGE_SCHEMA:([\s\S]*?)-->/);
  const schema = schemaMatch ? schemaMatch[1].trim() : '';

  let head = readFile(path.join(PARTIALS, 'head.html'));
  head = head
    .replace('<!-- PAGE_TITLE -->', title)
    .replace('<!-- PAGE_DESC -->', desc)
    .replace(/<!-- PAGE_CANONICAL -->/g, canonical)
    .replace('<!-- PAGE_OG_TITLE -->', ogTitle)
    .replace('<!-- PAGE_OG_DESC -->', ogDesc)
    .replace('<!-- PAGE_SCHEMA -->', schema);

  return head;
}

function buildPage(sourcePath, outputPath) {
  let source = readFile(sourcePath);
  const head = processHead(source);
  const header = readFile(path.join(PARTIALS, 'header.html'));
  const footer = readFile(path.join(PARTIALS, 'footer.html'));

  // Strip comment markers from source
  let body = source
    .replace(/<head>[\s\S]*?<\/head>/m, '') // strip entire <head> block
    .replace(/<!--\s*INJECT:HEAD\s*-->/g, '')
    .replace(/<!--\s*PAGE_TITLE:.*?-->/g, '')
    .replace(/<!--\s*PAGE_DESC:.*?-->/g, '')
    .replace(/<!--\s*PAGE_CANONICAL:.*?-->/g, '')
    .replace(/<!--\s*PAGE_OG_TITLE:.*?-->/g, '')
    .replace(/<!--\s*PAGE_OG_DESC:.*?-->/g, '')
    .replace(/<!--\s*PAGE_SCHEMA:[\s\S]*?-->/g, '');

  // Inject partials
  body = body
    .replace(/<!--\s*INJECT:HEADER\s*-->/g, header)
    .replace(/<!--\s*INJECT:FOOTER\s*-->/g, footer);

  // Reconstruct full page
  const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n${head}\n</head>\n${body.replace(/^<!DOCTYPE html>\s*<html[^>]*>/m, '').trim()}\n</html>`;

  writeFile(outputPath, html);
  console.log(`  built: ${outputPath.replace(DIST, 'dist')}`);
}

// ── Pages to build ─────────────────────────────────────────────────
const pages = [
  { src: 'index.html',                            out: 'index.html' },
  { src: 'classes/index.html',                    out: 'classes/index.html' },
  { src: 'gallery/index.html',                    out: 'gallery/index.html' },
  { src: 'shop/index.html',                       out: 'shop/index.html' },
  { src: 'private-events/index.html',             out: 'private-events/index.html' },
  { src: 'custom-piece/index.html',               out: 'custom-piece/index.html' },
  { src: 'artist-partnership/index.html',         out: 'artist-partnership/index.html' },
  { src: 'about/index.html',                      out: 'about/index.html' },
  { src: 'contact/index.html',                    out: 'contact/index.html' },
  { src: 'privacy-policy/index.html',             out: 'privacy-policy/index.html' },
];

// ── Build ──────────────────────────────────────────────────────────
console.log('\n🔨 Simply Create KC — Build\n');

// Clean dist (preserve images/)
if (fs.existsSync(DIST)) {
  for (const entry of fs.readdirSync(DIST)) {
    if (entry === 'images') continue; // keep images
    const full = path.join(DIST, entry);
    fs.rmSync(full, { recursive: true, force: true });
  }
}
fs.mkdirSync(DIST, { recursive: true });

// Copy static assets
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(path.join(ROOT, 'css'), path.join(DIST, 'css'));
copyDir(path.join(ROOT, 'js'), path.join(DIST, 'js'));
// Note: images/ in dist is NOT wiped — preserved above

// Copy root static files
for (const f of ['robots.txt', '_redirects', '404.html']) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, f));
}

// Build pages
for (const { src, out } of pages) {
  buildPage(path.join(ROOT, src), path.join(DIST, out));
}

console.log('\n✅ Build complete → dist/\n');
