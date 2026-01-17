import { Notice, Plugin, TFile } from "obsidian";
import { ConfluenceClient } from "./confluence";
import { convertMarkdownToConfluence } from "./markdown";
import {
  ConfluenceSettingTab,
  ConfluenceSettings,
  DEFAULT_SETTINGS
} from "./settings";

export default class ObsidianToConfluencePlugin extends Plugin {
  settings: ConfluenceSettings;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new ConfluenceSettingTab(this.app, this));

    this.addCommand({
      id: "sync-active-note-to-confluence",
      name: "Sync active note to Confluence",
      callback: () => {
        void this.syncActiveNote();
      }
    });
  }

  private async syncActiveNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("No active note to sync.");
      return;
    }

    if (file.extension !== "md") {
      new Notice("Active file is not a Markdown note.");
      return;
    }

    const missing = this.getMissingSettings();
    if (missing.length) {
      new Notice(`Configure Confluence settings: ${missing.join(", ")}.`);
      return;
    }

    try {
      await this.syncFile(file);
      new Notice("Synced to Confluence.");
    } catch (error) {
      console.error("Confluence sync failed", error);
      new Notice("Confluence sync failed. Check console for details.");
    }
  }

  private async syncFile(file: TFile): Promise<void> {
    const content = await this.app.vault.read(file);
    const client = new ConfluenceClient(this.settings);
    const linkedContent = await this.resolveWikiLinks(content, file, client);
    const html = convertMarkdownToConfluence(linkedContent, {
      convertWikiLinks: false,
      handleEmbedsAsText: true
    });

    const title = this.getTitleForFile(file);

    const pageIdFromFrontmatter = this.getPageIdFromFrontmatter(file);
    let resolvedPageId: string | null = pageIdFromFrontmatter;

    if (pageIdFromFrontmatter) {
      const updated = await client.updatePageById(
        pageIdFromFrontmatter,
        title,
        html
      );
      resolvedPageId = updated.id;
    } else {
      const existing = await client.findPageByTitle(
        this.settings.spaceKey,
        title
      );
      if (existing) {
        const updated = await client.updatePageById(existing.id, title, html);
        resolvedPageId = updated.id;
      } else {
        const created = await client.createPage(
          this.settings.spaceKey,
          title,
          html,
          this.settings.parentPageId || undefined
        );
        resolvedPageId = created.id;
      }
    }

    const frontmatterKey = this.settings.pageIdFrontmatterKey.trim();
    if (resolvedPageId && frontmatterKey) {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[frontmatterKey] = resolvedPageId;
      });
    }
  }

  private async resolveWikiLinks(
    markdown: string,
    sourceFile: TFile,
    client: ConfluenceClient
  ): Promise<string> {
    if (!this.settings.convertWikiLinks) {
      return markdown;
    }

    const regex = /\[\[([^\]]+)\]\]/g;
    const occurrences: Array<{
      full: string;
      inner: string;
      start: number;
      end: number;
      target: string;
      label: string;
      baseTarget: string;
    }> = [];
    const targets = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = regex.exec(markdown)) !== null) {
      const start = match.index;
      if (start > 0 && markdown[start - 1] === "!") {
        continue;
      }

      const inner = match[1];
      const { target, label, baseTarget } = this.parseWikiLink(inner);
      if (!baseTarget) {
        continue;
      }

      occurrences.push({
        full: match[0],
        inner,
        start,
        end: start + match[0].length,
        target,
        label,
        baseTarget
      });
      targets.add(baseTarget);
    }

    if (!occurrences.length) {
      return markdown;
    }

    const resolved = new Map<string, string | null>();
    const resolvedEntries = await Promise.all(
      Array.from(targets).map(async (baseTarget) => {
        const url = await this.resolveConfluenceUrlForTarget(
          baseTarget,
          sourceFile,
          client
        );
        return [baseTarget, url] as const;
      })
    );

    resolvedEntries.forEach(([baseTarget, url]) => {
      resolved.set(baseTarget, url);
    });

    let output = "";
    let lastIndex = 0;
    for (const occurrence of occurrences) {
      output += markdown.slice(lastIndex, occurrence.start);
      const url = resolved.get(occurrence.baseTarget);
      if (url) {
        output += `[${occurrence.label}](${url})`;
      } else {
        output += occurrence.full;
      }
      lastIndex = occurrence.end;
    }
    output += markdown.slice(lastIndex);

    return output;
  }

  private parseWikiLink(inner: string): {
    target: string;
    label: string;
    baseTarget: string;
  } {
    const parts = inner.split("|");
    const rawTarget = (parts[0] || "").trim();
    const label = (parts[1] || rawTarget).trim();
    const baseTarget = rawTarget
      .split("#")[0]
      .split("^")[0]
      .trim();

    return {
      target: rawTarget,
      label: label || rawTarget,
      baseTarget
    };
  }

  private async resolveConfluenceUrlForTarget(
    baseTarget: string,
    sourceFile: TFile,
    client: ConfluenceClient
  ): Promise<string | null> {
    const targetFile = this.app.metadataCache.getFirstLinkpathDest(
      baseTarget,
      sourceFile.path
    );
    if (targetFile) {
      const pageId = await this.getPageIdFromFrontmatterAsync(targetFile);
      if (pageId) {
        return client.getPageUrl(pageId);
      }
    }

    const title = targetFile ? targetFile.basename : baseTarget;
    const existing = await client.findPageByTitle(this.settings.spaceKey, title);
    if (existing) {
      return client.getPageUrl(existing.id);
    }

    return null;
  }

  private async getPageIdFromFrontmatterAsync(
    file: TFile
  ): Promise<string | null> {
    const cached = this.getPageIdFromFrontmatter(file);
    if (cached) {
      return cached;
    }

    const key = this.settings.pageIdFrontmatterKey.trim();
    if (!key) {
      return null;
    }

    const content = await this.app.vault.read(file);
    return this.extractFrontmatterValue(content, key);
  }

  private extractFrontmatterValue(
    content: string,
    key: string
  ): string | null {
    if (!content.startsWith("---")) {
      return null;
    }

    const lines = content.split(/\r?\n/);
    if (lines.length < 2) {
      return null;
    }

    const keyPattern = new RegExp(
      `^\\\\s*${this.escapeRegExp(key)}\\\\s*:\\\\s*(.+?)\\\\s*$`
    );

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.trim() === "---" || line.trim() === "...") {
        break;
      }

      const match = line.match(keyPattern);
      if (match) {
        const raw = match[1].trim();
        if (!raw) {
          return null;
        }
        return raw.replace(/^['"]|['"]$/g, "").trim() || null;
      }
    }

    return null;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private getPageIdFromFrontmatter(file: TFile): string | null {
    const key = this.settings.pageIdFrontmatterKey.trim();
    if (!key) {
      return null;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const raw = cache?.frontmatter?.[key];
    if (typeof raw === "string") {
      return raw.trim() || null;
    }

    if (typeof raw === "number") {
      return String(raw);
    }

    return null;
  }

  private getTitleForFile(file: TFile): string {
    return file.basename;
  }

  private getMissingSettings(): string[] {
    const missing: string[] = [];
    if (!this.settings.baseUrl.trim()) {
      missing.push("base URL");
    }
    if (!this.settings.spaceKey.trim()) {
      missing.push("space key");
    }
    if (!this.settings.authEmail.trim()) {
      missing.push("auth email");
    }
    if (!this.settings.apiToken.trim()) {
      missing.push("API token");
    }
    return missing;
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
