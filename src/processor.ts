import { marked, TokenizerAndRendererExtension, TokenizerThis } from 'marked';
import { v4 as uuidv4 } from 'uuid';
import { JSDOM } from 'jsdom';

interface Config {
  title?: string;
  font?: string;
  styles?: string;
  scripts?: string[];
  head?: string;
  body?: string;
  tokenizeWords?: boolean;
}

export class CustomMDXProcessor {
  customReferences: { [key: string]: string } = {};
  runCodeBlocks: { [key: string]: string } = {};
  config: Config = {};

  constructor() {
    this.setupMarked();
  }

  private setupMarked() {
    const processor = this;

    const customReferenceExtension: TokenizerAndRendererExtension = {
      name: 'customReference',
      level: 'inline',
      start(src) { return src.match(/^.*\?\[/)?.index; },
      tokenizer(src: string) {
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

    const runCodeExtension: TokenizerAndRendererExtension = {
      name: 'runCode',
      level: 'block',
      start(src) { return src.match(/^```[^\n]*\n[\s]*\/\/[\s]*@run/)?.index; },
      tokenizer(src: string) {
        const rule = /^```[^\n]*\n([\s]*\/\/[\s]*@run(([ ][\w]+[=]"[^"]*")*)[\s\S]*?)\n```/;
        const match = rule.exec(src);

        if (match) {
          const [raw, code, attributes] = match;
          const id = uuidv4();
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
        return `<script data-run-id="${token.id}" ${token.attributes}>
          ${token.code}
        </script>`;
      }
    };

    // Add custom properties to the Lexer prototype
    (marked.Lexer as any).prototype.customReferences = this.customReferences;
    (marked.Lexer as any).prototype.runCodeBlocks = this.runCodeBlocks;

    marked.use({ extensions: [customReferenceExtension, runCodeExtension] });
  }

  public async process(markdown: string, config: Config): Promise<string> {
    this.config = config;

    const html = await marked.parse(markdown, {
      async: true
    });
    return this.config.tokenizeWords ? this.tokenizeWords(html) : html;
  }

  private tokenizeWords(content: string): string {
    const dom = new JSDOM();
    const Node = dom.window.Node;
    const doc = dom.window.document;

    function tokenizeElement(element: Node) {
      if (element.nodeType === Node.TEXT_NODE && element.textContent) {
        const tokenizedText = element.textContent.replace(/(\S+)/g, '<span class="token">$1</span>');
        const span = document.createElement('span');
        span.innerHTML = tokenizedText;
        element.parentNode!.replaceChild(span, element);
      } else if (element.nodeType === Node.ELEMENT_NODE) {
        const el = element as Element;
        if (el.tagName.toLowerCase() !== 'pre' && el.tagName.toLowerCase() !== 'code') {
          Array.from(el.childNodes).forEach(tokenizeElement);
        }
      }
    }

    tokenizeElement(doc.body);

    return doc.body.innerHTML;
  }

  async wrapHtml(content: string | Promise<string>): Promise<string> {
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
