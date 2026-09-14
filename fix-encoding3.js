const fs = require('fs');
const path = require('path');
const siteDir = __dirname;

// After fix-encoding2.js, we still have mismatched quote entities used as dashes.
// Pattern analysis:
//   &rdquo; in prose between words = em-dash (—)
//   &ldquo; in ranges (1-2, $200-$500, dimensions) = en-dash (–)
//   Ã— = times/multiplication sign (×)
//   â†' = right arrow (→) used as checkmark bullet

function fixContent(content) {
  return content
    // &rdquo; used as dash between words/phrases -> em-dash
    // (all current occurrences are dashes, not actual closing quotes)
    .replace(/\s&rdquo;\s/g, '&mdash;')
    // &ldquo; used as dash in ranges -> en-dash  
    // (all current occurrences are ranges, not actual opening quotes)
    .replace(/(\d|")\s*&ldquo;\s*(\d|"|\$)/g, (m, a, b) => a + '&ndash;' + b)
    .replace(/\$&ldquo;\s*/g, '$&ndash;')
    // Any remaining &ldquo; and &rdquo; in dash contexts
    .replace(/&ldquo;(\d)/g, '&ndash;$1')
    // Ã— = mojibake for × (multiplication)
    .replace(/\u00c3\u00d7/g, '&times;')
    .replace(/Ã×/g, '&times;')
    // â†' = mojibake for → (right arrow) used as bullet
    .replace(/â†'/g, '&#10003;');
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
