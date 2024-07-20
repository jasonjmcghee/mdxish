import { CustomMDXProcessor } from './processor.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import { program } from 'commander';
import crypto from 'crypto';

const processor = new CustomMDXProcessor();

program
  .option('-i, --input <path>', 'Input file or directory')
  .option('-o, --output <path>', 'Output directory')
  .option('-r, --recursive', 'Process directories recursively')
  .parse(process.argv);

const options = program.opts();
const inputPath = options.input;
const outputPath = options.output || 'output';
const isRecursive = options.recursive || false;

if (!inputPath) {
  console.error('Please provide an input file or directory using the -i or --input option.');
  process.exit(1);
}

let latestHtml = '';
let latestContent = '';

let lastFileHash = '';

function hashFile(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

const watcherJs = `<script type="application/javascript">
const ws = new WebSocket('ws://' + location.host);
let lastState = null;

window.mdxishState = localStorage['mdxishState'] ? JSON.parse(localStorage['mdxishState']) : {
  startTime: new Date(),
};

ws.onmessage = (event) => {
  localStorage['mdxishState'] = JSON.stringify(window.mdxishState);
  window.location.reload();
  window.requestAnimationFrame(() => {
    window.mdxishState = localStorage['mdxishState'] ? JSON.parse(localStorage['mdxishState']) : {
      startTime: new Date(),
    };
  });
};</script>`

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(latestHtml);
  } else {
    // Serve static files
    try {
      const filePath = path.join("./", req.url as any);
      const data = await fsPromises.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = getContentType(ext);

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    }
  }

  function getContentType(extension: string) {
    switch (extension) {
      case '.html':
        return 'text/html';
      case '.css':
        return 'text/css';
      case '.js':
        return 'text/javascript';
      case '.json':
        return 'application/json';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      default:
        return 'text/plain';
    }
  }
});

const wss = new WebSocketServer({ server });

async function processFile(filePath: string) {
  const content = await fsPromises.readFile(filePath, 'utf-8');
  const currentHash = hashFile(content);

  if (currentHash === lastFileHash) {
    throw new Error(`File didn't change change.`);
  }

  lastFileHash = currentHash;
  const { frontmatter, markdown } = extractFrontmatter(content);
  const config = await loadConfig(frontmatter, path.dirname(filePath));
  config.head ||= '';
  config.head += watcherJs;
  latestContent = await processor.process(markdown, config);
  latestHtml = await processor.wrapHtml(latestContent);
}

async function watchAndProcess(watchPath: string) {
  const stats = await fsPromises.stat(watchPath);

  if (stats.isDirectory()) {
    const files = await fsPromises.readdir(watchPath);
    for (const file of files) {
      const fullPath = path.join(watchPath, file);
      const fileStats = await fsPromises.stat(fullPath);
      if (fileStats.isDirectory() && isRecursive) {
        await watchAndProcess(fullPath);
      } else if (path.extname(file) === '.md') {
        watchFile(fullPath);
      }
    }
  } else if (stats.isFile() && path.extname(watchPath) === '.md') {
    watchFile(watchPath);
  } else {
    console.error(`${watchPath} is neither a directory nor a Markdown file.`);
  }
}

function watchFile(filePath: string) {
  console.log(`Watching file: ${filePath}`);
  fs.watch(filePath, async (eventType) => {
    if (eventType === 'change') {
      try {
        await processFile(filePath);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(latestHtml);
          }
        });
        console.log(`Updated: ${filePath}`);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
  });
}

function extractFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match) {
    return {
      frontmatter: yaml.load(match[1]) as Record<string, any>,
      markdown: match[2],
    };
  }
  return { frontmatter: {}, markdown: content };
}

async function loadConfig(frontmatter: Record<string, any>, inputDir: string) {
  let config: Record<string, any> = {};
  const configPath = path.join(inputDir, 'config.yml');
  if (await fsPromises.access(configPath).then(() => true).catch(() => false)) {
    const globalConfig = yaml.load(await fsPromises.readFile(configPath, 'utf-8')) as Record<string, any>;
    config = { ...globalConfig, ...frontmatter };
  } else {
    config = frontmatter;
  }
  return config;
}

async function main() {
  // Initial processing
  if ((await fsPromises.stat(inputPath)).isDirectory()) {
    const files = await fsPromises.readdir(inputPath);
    for (const file of files) {
      if (path.extname(file) === '.md') {
        await processFile(path.join(inputPath, file));
        break; // Process only the first Markdown file found
      }
    }
  } else {
    await processFile(inputPath);
  }

  // Start watching for changes
  await watchAndProcess(inputPath);

  server.listen(8080, () => {
    console.log('Server running on http://localhost:8080');
  });
}

main().catch(console.error);