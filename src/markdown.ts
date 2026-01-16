import MarkdownIt from "markdown-it";

export interface MarkdownConvertOptions {
  convertWikiLinks: boolean;
  handleEmbedsAsText: boolean;
}

const DEFAULT_OPTIONS: MarkdownConvertOptions = {
  convertWikiLinks: true,
  handleEmbedsAsText: true
};

export function convertMarkdownToConfluence(
  markdown: string,
  options?: Partial<MarkdownConvertOptions>
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let source = markdown;

  if (opts.handleEmbedsAsText) {
    source = source.replace(/!\[\[([^\]]+)\]\]/g, (_match, inner) => {
      const target = String(inner).split("|")[0].trim();
      return `Embedded content not synced: ${target}`;
    });
  }

  if (opts.convertWikiLinks) {
    source = source.replace(/\[\[([^\]]+)\]\]/g, (_match, inner) => {
      const parts = String(inner).split("|");
      const link = parts[0].trim();
      const label = (parts[1] || link).trim();
      return `[${label}](${link})`;
    });
  }

  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false
  });

  return md.render(source);
}
