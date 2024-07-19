function uuid() {
  // oversimplified uuid v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class CustomMDXProcessor {
  customReferences = {};
  runCodeBlocks = {};
  config = {};

  constructor() {
    this.setupMarked();
  }

  setupMarked() {
    const processor = this;

    const customReferenceExtension = {
      name: 'customReference',
      level: 'inline',
      start(src) { return src.match(/^.*\?\[/)?.index; },
      tokenizer(src) {
        const rule = /^\?\[(.*?)\]\((.*?)\)/;
        const match = rule.exec(src);
        if (match) {
          const [raw, text, reference] = match;
          processor.customReferences[reference] = text;
          return {
            type: 'customReference',
            raw,
            id: reference,
            text,
          };
        }
        return undefined;
      },
      renderer(token) {
        return `<span class="custom-reference" data-id="${token.id}">${token.text}</span>`;
      }
    };

    const runCodeExtension = {
      name: 'runCode',
      level: 'block',
      start(src) { return src.match(/^```[^\n]*\n[\s]*\/\/[\s]*@run/)?.index; },
      tokenizer(src) {
        const rule = /^```[^\n]*\n([\s]*\/\/[\s]*@run(([ ][\w]+[=]"[^"]*")*)[\s\S]*?)\n```/;
        const match = rule.exec(src);

        if (match) {
          const [raw, code, attributes] = match;
          const id = uuid();
          processor.runCodeBlocks[id] = code;
          return {
            type: 'runCode',
            raw,
            id,
            code,
            attributes
          };
        }
        return undefined;
      },
      renderer(token) {
        return `<script data-run-id="${token.id}" ${token.attributes}>${token.code}</script>`;
      }
    };

    marked.use({ extensions: [customReferenceExtension, runCodeExtension] });
  }

  async process(markdown, config) {
    this.config = config;

    let html = await marked.parse(markdown, {
      async: true
    });
    html = this.config.tokenizeWords ? this.tokenizeWords(html) : html;
    return html;
  }

  replaceFileReferences(html) {
    for (const filename in this.config.gistFiles) {
      if (filename === 'index.md') continue;
      console.log(filename);
      const blob = new Blob([this.config.gistFiles[filename].content], { type: this.config.gistFiles[filename].type });
      html = html.replace(new RegExp(`"${filename}"`, 'g'), `"${URL.createObjectURL(blob)}"`);
    }
    return html;
  }

  tokenizeWords(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    function tokenizeElement(element) {
      if (element.nodeType === Node.TEXT_NODE && element.textContent) {
        const tokenizedText = element.textContent.replace(/(\S+)/g, '<span class="token">$1</span>');
        const span = document.createElement('span');
        span.innerHTML = tokenizedText;
        element.parentNode.replaceChild(span, element);
      } else if (element.nodeType === Node.ELEMENT_NODE) {
        const el = element;
        if (el.tagName.toLowerCase() !== 'pre' && el.tagName.toLowerCase() !== 'code') {
          Array.from(el.childNodes).forEach(tokenizeElement);
        }
      }
    }

    tokenizeElement(doc.body);

    return doc.body.innerHTML;
  }

  async wrapHtml(content) {
    const resolvedContent = await content;
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.config.title || 'Interactive Document'}</title>
          ${this.config.font ? `<link href="${this.config.font}" rel="stylesheet">` : ''}
          ${this.config.scripts?.map(script => `<script src="${script}"></script>`).join('\n') || ''}
          <style>
              ${this.config.styles || ''}
          </style>
          ${this.config.head || ''}
      </head>
      <body>
          ${this.config.body || ''}
          <div id="content">${resolvedContent}</div>
      </body>
      </html>
  `;
  }
}

async function renderGistMdx(gistId) {
  const processor = new CustomMDXProcessor();
  const gistFiles = await fetchGistContent(gistId);
  const { frontmatter, markdown } = extractFrontmatter(gistFiles['index.md'].content);
  const config = { ...frontmatter, gistFiles };

  let html = await processor.wrapHtml(
    await processor.process(markdown, config)
  );

  html = processor.replaceFileReferences(html);

  return html;
}

async function fetchGistContent(gistId) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch gist: ${response.statusText}`);
  }

  const gist = await response.json();
  const files = {};

  for (const [filename, fileData] of Object.entries(gist.files)) {
    files[filename] = fileData;
  }

  if (!files['index.md']) {
    throw new Error('No index.md file found in the gist');
  }

  return files;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match) {
    return {
      frontmatter: jsyaml.load(match[1]),
      markdown: match[2],
    };
  }
  return { frontmatter: {}, markdown: content };
}

function loadConfig(frontmatter) {
  return frontmatter;
}

async function main() {
  const path = window.location.pathname.split('/');
  const gistId = path[path.length - 1];

  if (!gistId) {
    console.error('No gist ID provided in the URL');
    document.body.innerHTML = '<h1>Error: No gist ID provided</h1>';
    return;
  }

  try {
    const html = await renderGistMdx(gistId);
    document.open();
    document.write(html);
    document.close();

    // Re-execute any scripts in the new content
    Array.from(document.getElementsByTagName('script')).forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  } catch (error) {
    console.error('Error rendering gist:', error);
    document.body.innerHTML = `<h1>Error rendering gist</h1><p>${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await main();
});