const fs = require('fs');
const path = require('path');
const siteDir = __dirname;

// Fix remaining mojibake sequences
const fixes = [
  // â†' bullet (c3 a2 e2 80 a0 e2 80 99) -> checkmark
  [Buffer.from([0xc3,0xa2,0xe2,0x80,0xa0,0xe2,0x80,0x99]), '&#10003;'],
  // Ã— (c3 83 e2 80 94) -> &times; (multiplication/dimensions)
  [Buffer.from([0xc3,0x83,0xe2,0x80,0x94]), '&times;'],
];

function replaceBytes(buf, search, replace) {
  const results = [];
  let i = 0;
  const replBuf = Buffer.from(replace, 'utf8');
  while (i <= buf.length - search.length) {
    let match = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i+j] !== search[j]) { match = false; break; }
    }
    if (match) {
      results.push(replBuf);
      i += search.length;
    } else {
      results.push(buf.slice(i, i+1));
      i++;
    }
  }
  if (i < buf.length) results.push(buf.slice(i));
  return Buffer.concat(results);
}

function fixFile(filePath) {
  let buf = fs.readFileSync(filePath);
  let changed = false;
  for (const [search, replace] of fixes) {
    const before = buf;
    buf = replaceBytes(buf, search, replace);
    if (!buf.equals(before)) changed = true;
  }
  if (changed) {
    fs.writeFileSync(filePath, buf);
    console.log('FIXED: ' + filePath.replace(siteDir, ''));
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.html')) {
      fixFile(fullPath);
    }
  }
}

walkDir(siteDir);
console.log('Done.');
