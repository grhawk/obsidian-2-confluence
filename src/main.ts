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
    const html = convertMarkdownToConfluence(content, {
      convertWikiLinks: this.settings.convertWikiLinks,
      handleEmbedsAsText: true
    });

    const title = this.getTitleForFile(file);
    const client = new ConfluenceClient(this.settings);

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
