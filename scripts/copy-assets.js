#!/usr/bin/env node
'use strict';

/**
 * Copies the vendor front-end libraries (markdown-it, Prism.js, Split.js) from
 * node_modules into src/renderer/vendor so the renderer can load them with
 * stable, relative <script>/<link> paths both in development and inside the
 * packaged app.asar. Running it is idempotent and safe to re-run.
 *
 * Prism is emitted as a single concatenated bundle (core + a curated set of
 * language grammars) so the renderer only needs one <script> tag and the load
 * order of interdependent grammars is guaranteed.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nodeModules = path.join(root, 'node_modules');
const vendorDir = path.join(root, 'src', 'renderer', 'vendor');
const prismDir = path.join(vendorDir, 'prism');

// Order matters: grammars that extend others must appear after their base.
const PRISM_LANGUAGES = [
  'markup',
  'css',
  'clike',
  'javascript',
  'markup-templating',
  'typescript',
  'jsx',
  'tsx',
  'json',
  'bash',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
  'sql',
  'yaml',
  'markdown',
  'diff',
  'docker',
  'graphql'
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readVendor(relPath) {
  const from = path.join(nodeModules, relPath);
  if (!fs.existsSync(from)) {
    throw new Error(`Missing vendor source: ${relPath}. Did "npm install" run?`);
  }
  return fs.readFileSync(from, 'utf8');
}

function copyFile(relPath, to) {
  ensureDir(path.dirname(to));
  fs.writeFileSync(to, readVendor(relPath));
  return to;
}

function main() {
  ensureDir(vendorDir);
  ensureDir(prismDir);
  const emitted = [];

  // markdown-it (UMD build exposes window.markdownit)
  emitted.push(copyFile('markdown-it/dist/markdown-it.min.js', path.join(vendorDir, 'markdown-it.min.js')));

  // Split.js (UMD build exposes window.Split)
  emitted.push(copyFile('split.js/dist/split.min.js', path.join(vendorDir, 'split.min.js')));

  // Prism theme
  emitted.push(copyFile('prismjs/themes/prism-tomorrow.css', path.join(prismDir, 'prism-tomorrow.css')));

  // Prism bundle = core + curated grammars, concatenated in dependency order.
  const parts = [readVendor('prismjs/prism.js')];
  for (const lang of PRISM_LANGUAGES) {
    parts.push(`\n/* prism language: ${lang} */\n`);
    parts.push(readVendor(`prismjs/components/prism-${lang}.min.js`));
  }
  const bundlePath = path.join(prismDir, 'prism-bundle.js');
  fs.writeFileSync(bundlePath, parts.join('\n'));
  emitted.push(bundlePath);

  console.log(
    `[copy-assets] Wrote ${emitted.length} vendor files (Prism grammars: ${PRISM_LANGUAGES.length}) to ${path.relative(root, vendorDir)}`
  );
}

main();
