const fs = require('fs');
const path = require('path');
const siteDir = __dirname;

// Mojibake sequences (read as latin1 binary strings) -> correct HTML entities
// These are triple-encoded UTF-8 sequences from copy-pasted smart quotes/dashes
const fixes = [
  // en-dash (–)
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x80,0x93]), '&ndash;'],
  // em-dash (—)
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x80,0x94]), '&mdash;'],
  // left double quote (") 
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xc5,0x93]), '&ldquo;'],
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x80,0x9c]), '&ldquo;'],
  // right double quote (")
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x80,0x9d]), '&rdquo;'],
  // right single quote / apostrophe (')
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x80,0x99]), '&rsquo;'],
  // left single quote (') followed by + = checkmark bullet
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x80,0x98,0x2b]), '&#10003;'],
  // left single quote (')
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x80,0x98]), '&lsquo;'],
  // trademark (™)
  [Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x84,0xa2]), '&trade;'],
  // multiplication (×) via c3 97
  [Buffer.from([0xc3,0x97]), '&times;'],
  // BOM if any
  [Buffer.from([0xef,0xbb,0xbf]), ''],
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
  const original = buf;
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
    if (entry.name === 'node_modules' || entry.name === 'fix-encoding.js' || entry.name === 'fix-encoding2.js') continue;
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
