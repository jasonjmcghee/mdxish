#!/usr/bin/env node
import { Command } from 'commander';
import { buildDocs } from './build.js';
import { live } from './server.js';
import path from 'path';
import fs from 'fs';

const program = new Command();

program
  .description('Write high-quality, interactive blog posts in markdown, live.');

program
  .command('convert')
  .description('Convert MDX-like files to HTML')
  .argument('<path>', 'Input file or directory')
  .option('-o, --output <path>', 'Output directory')
  .option('-r, --recursive', 'Process directories recursively')
  .option('-w, --watch', 'Watch for file changes')
  .action((file, options) => {
    const inputPath = file;
    const outputPath = options.output || '.';
    const isRecursive = options.recursive || false;
    const watchMode = options.watch || false;

    const isFile = fs.existsSync(inputPath) && fs.statSync(inputPath).isFile();
    const inputDir = isFile ? path.dirname(inputPath) : inputPath;
    const outputDir = path.resolve(outputPath);

    const build = () => {
      console.log('Building docs...');
      if (isFile) {
        buildDocs(inputPath, outputDir).catch(console.error);
      } else {
        buildDocs(inputDir, outputDir).catch(console.error);
      }
    };

    build();

    if (watchMode) {
      const watchPath = isFile ? inputPath : inputDir;
      const watchOptions = { recursive: isRecursive };

      console.log(`Watching for changes in ${watchPath}${isRecursive ? ' and its subdirectories' : ''}...`);

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
  });

program
  .command('live')
  .description('Start live server for a single md file')
  .argument('<file>', 'Input md file')
  .action((file, options) => {
    const inputPath = path.resolve(file);

    if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
      console.error('Input must be a valid file');
      process.exit(1);
    }

    console.log(`Starting live server for ${inputPath}`);
    live(inputPath);
  });

program.parse(process.argv);