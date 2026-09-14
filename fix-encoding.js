const fs = require('fs');
const path = require('path');
const siteDir = __dirname;

function fixContent(content) {
  return content
    // en-dash mojibake -> &ndash;
    .replace(/\u00e2\u0080\u0093/g, '&ndash;')
    // em-dash mojibake -> &mdash;
    .replace(/\u00e2\u0080\u0094/g, '&mdash;')
    // left double quote mojibake -> &ldquo;
    .replace(/\u00e2\u0080\u009c/g, '&ldquo;')
    // right double quote mojibake -> &rdquo;
    .replace(/\u00e2\u0080\u009d/g, '&rdquo;')
    // right single quote/apostrophe mojibake -> &rsquo;
    .replace(/\u00e2\u0080\u0099/g, '&rsquo;')
    // left single quote mojibake -> &lsquo;
    .replace(/\u00e2\u0080\u0098/g, '&lsquo;')
    // checkmark bullet mojibake -> checkmark
    .replace(/\u00e2\u0080\u0098\+/g, '&#10003;')
    // multiplication sign mojibake -> &times;
    .replace(/\u00c3\u00d7/g, '&times;')
    // ellipsis mojibake -> &hellip;
    .replace(/\u00e2\u0080\u00a6/g, '&hellip;')
    // non-breaking space mojibake -> &nbsp;
    .replace(/\u00c2\u00a0/g, '&nbsp;');
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.html')) {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const fixed = fixContent(raw);
      if (fixed !== raw) {
        fs.writeFileSync(fullPath, fixed, 'utf8');
        console.log('FIXED: ' + fullPath.replace(siteDir, ''));
      }
    }
  }
}

walkDir(siteDir);
console.log('Done.');
