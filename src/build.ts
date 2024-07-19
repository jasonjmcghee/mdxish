import { CustomMDXProcessor } from './processor.js';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

async function buildDocs(input: string, outputDir: string) {
  const processor = new CustomMDXProcessor();

  const stats = await fs.stat(input);

  if (stats.isDirectory()) {
    const files = await fs.readdir(input);
    for (const file of files) {
      if (path.extname(file) === '.md') {
        await processAndSaveFile(path.join(input, file), outputDir, processor);
      }
    }
  } else if (stats.isFile() && path.extname(input) === '.md') {
    await processAndSaveFile(input, outputDir, processor);
  } else {
    console.error(`${input} is neither a directory nor a Markdown file.`);
  }
}

async function processAndSaveFile(filePath: string, outputDir: string, processor: CustomMDXProcessor) {
  const content = await fs.readFile(filePath, 'utf-8');
  const { frontmatter, markdown } = extractFrontmatter(content);
  const config = await loadConfig(frontmatter, path.dirname(filePath));
  let html = await processor.wrapHtml(
    await processor.process(markdown, config)
  );

  const outputPath = path.join(outputDir, `${path.basename(filePath, '.md')}.html`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html);
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
  if (await fs.access(configPath).then(() => true).catch(() => false)) {
    const globalConfig = yaml.load(await fs.readFile(configPath, 'utf-8')) as Record<string, any>;
    config = { ...globalConfig, ...frontmatter };
  } else {
    config = frontmatter;
  }
  return config;
}

export { buildDocs };
