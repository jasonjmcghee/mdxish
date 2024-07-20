#!/usr/bin/env node
import { buildDocs } from './build.js';
import path from 'path';
import fs from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const recursiveMode = args.includes('--recursive');
const inputPath = args.find(arg => !arg.startsWith('--')) || '.';

// Determine if input is a file or directory
const isFile = fs.existsSync(inputPath) && fs.statSync(inputPath).isFile();
const inputDir = isFile ? path.dirname(inputPath) : inputPath;
const outputDir = path.join(inputDir, '.');

// Function to build docs
const build = () => {
  console.log('Building docs...');
  if (isFile) {
    buildDocs(inputPath, outputDir).catch(console.error);
  } else {
    buildDocs(inputDir, outputDir).catch(console.error);
  }
};

// Initial build
build();

// If watch mode is enabled, set up file watching
if (watchMode) {
  const watchPath = isFile ? inputPath : inputDir;
  const watchOptions = { recursive: recursiveMode };

  console.log(`Watching for changes in ${watchPath}${recursiveMode ? ' and its subdirectories' : ''}...`);

  fs.watch(watchPath, watchOptions, (eventType, filename) => {
    if (isFile && filename !== path.basename(inputPath)) return;

    if (filename) {
      console.log(`File ${filename} has been changed`);
      build();
    }
  });
} else {
  console.log('Build completed. Use --watch to enable watch mode.');
}

console.log('Options:');
console.log('  --watch      Watch for file changes');
console.log('  --recursive  Watch subdirectories (only applicable with --watch)');